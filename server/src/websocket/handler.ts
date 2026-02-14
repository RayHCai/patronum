// WebSocket handler for real-time conversation
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { WSMessage } from '../types';
import { startConversationSession } from '../services/orchestrator';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive?: boolean;
}

export class ConversationWebSocketHandler {
  private wss: WebSocketServer;
  private sessions: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupHeartbeat();
  }

  // Setup heartbeat to detect disconnected clients
  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Handle new WebSocket connection
  public handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    console.log('[WebSocket Handler] New WebSocket connection established');
    console.log(`[WebSocket Handler] Connection from: ${request.socket.remoteAddress}`);

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log(`[WebSocket Handler] Received message - type: ${message.type}`);
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket Handler] Message parsing error:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket Handler] Connection closed`);
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket Handler] WebSocket error:', error);
    });
  }

  // Handle incoming messages
  private async handleMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { type, payload } = message;

    switch (type) {
      case 'session_start':
        await this.handleSessionStart(ws, payload);
        break;

      case 'session_end':
        await this.handleSessionEnd(ws, payload);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  // Handle session start
  private async handleSessionStart(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { participantId, topic, agentIds } = payload;

      console.log(`[WebSocket Handler] Session start request - participantId: ${participantId}, topic: "${topic || 'none'}", agentIds: ${agentIds?.length || 0}`);

      if (!participantId) {
        console.log('[WebSocket Handler] Session start failed - no participant ID');
        return this.sendError(ws, 'Participant ID required');
      }

      // Create session (simplified - no turn management)
      console.log('[WebSocket Handler] Calling startConversationSession...');
      const session = await startConversationSession(
        participantId,
        topic,
        agentIds
      );

      // Track session
      if (!this.sessions.has(session.id)) {
        this.sessions.set(session.id, new Set());
      }
      this.sessions.get(session.id)!.add(ws);

      console.log(`[WebSocket Handler] Session ${session.id} tracked, ${this.sessions.get(session.id)!.size} client(s) connected`);

      // Send session details to client
      // Client will manage all turn flow from here
      this.sendMessage(ws, {
        type: 'session_start',
        payload: {
          sessionId: session.id,
          agents: session.agents,
          topic: session.topic,
        },
      });

      console.log(`[WebSocket Handler] Session started successfully: ${session.id}`);
      console.log(`[WebSocket Handler] Session details - agents: ${session.agents.length}, topic: "${session.topic || 'none'}"`);
    } catch (error: any) {
      console.error('[WebSocket Handler] Session start error:', error);
      this.sendError(ws, error.message || 'Failed to start session');
    }
  }

  // Handle session end
  private async handleSessionEnd(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { sessionId } = payload;

      console.log(`[WebSocket Handler] Session end request - sessionId: ${sessionId}`);

      if (!sessionId) {
        console.log('[WebSocket Handler] Session end failed - no session ID');
        return this.sendError(ws, 'Session ID required');
      }

      // Clean up session
      if (this.sessions.has(sessionId)) {
        const clientsCount = this.sessions.get(sessionId)!.size;
        this.sessions.get(sessionId)!.delete(ws);
        if (this.sessions.get(sessionId)!.size === 0) {
          this.sessions.delete(sessionId);
          console.log(`[WebSocket Handler] Session ${sessionId} removed from tracking (was last client)`);
        } else {
          console.log(`[WebSocket Handler] Client removed from session ${sessionId}, ${this.sessions.get(sessionId)!.size} client(s) remaining`);
        }
      } else {
        console.log(`[WebSocket Handler] Session ${sessionId} not found in tracking`);
      }

      this.sendMessage(ws, {
        type: 'session_end',
        payload: { sessionId },
      });

      console.log(`[WebSocket Handler] Session ended successfully: ${sessionId}`);
    } catch (error: any) {
      console.error('[WebSocket Handler] Session end error:', error);
      this.sendError(ws, error.message || 'Failed to end session');
    }
  }

  // Handle disconnect
  private handleDisconnect(ws: AuthenticatedWebSocket) {
    console.log(`[WebSocket Handler] Handling disconnect`);

    let removedFromSessions = 0;
    // Remove from all sessions
    this.sessions.forEach((clients, sessionId) => {
      if (clients.has(ws)) {
        clients.delete(ws);
        removedFromSessions++;
        if (clients.size === 0) {
          this.sessions.delete(sessionId);
          console.log(`[WebSocket Handler] Session ${sessionId} removed (no more clients)`);
        } else {
          console.log(`[WebSocket Handler] Removed from session ${sessionId}, ${clients.size} client(s) remaining`);
        }
      }
    });

    console.log(`[WebSocket Handler] Client removed from ${removedFromSessions} session(s)`);
  }

  // Send message to client
  private sendMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send error to client
  private sendError(ws: AuthenticatedWebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error,
    });
  }

  // Broadcast to all clients in a session
  public broadcastToSession(sessionId: string, message: WSMessage) {
    const clients = this.sessions.get(sessionId);
    if (clients) {
      console.log(`[WebSocket Handler] Broadcasting to session ${sessionId}: type=${message.type}, clients=${clients.size}`);
      clients.forEach((client) => {
        this.sendMessage(client, message);
      });
    } else {
      console.log(`[WebSocket Handler] Cannot broadcast - session ${sessionId} not found`);
    }
  }
}
