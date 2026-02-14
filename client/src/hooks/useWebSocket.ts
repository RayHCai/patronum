// WebSocket hook for real-time conversation
import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, WSMessageType } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<WSMessageType, (payload: any) => void>>(new Map());

  // Connect to WebSocket
  const connect = useCallback(() => {
    console.log('[WebSocket] ========================================');
    console.log('[WebSocket] 🔌 CONNECTING TO WEBSOCKET');
    console.log('[WebSocket] ========================================');
    console.log('[WebSocket] URL:', WS_URL);

    try {
      const ws = new WebSocket(WS_URL);
      console.log('[WebSocket] WebSocket object created');

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connection established!');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        console.log('[WebSocket] 📨 Message received:', event.data.substring(0, 200) + (event.data.length > 200 ? '...' : ''));

        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message type:', message.type);

          if (message.type === 'error') {
            console.error('[WebSocket] ❌ Error message received:', message.error);
            setError(message.error || 'WebSocket error');
          } else {
            // Call registered handler
            const handler = handlersRef.current.get(message.type);
            if (handler) {
              console.log('[WebSocket] 🎯 Calling registered handler for:', message.type);
              handler(message.payload);
            } else {
              console.warn('[WebSocket] ⚠️ No handler registered for message type:', message.type);
            }
          }
        } catch (err) {
          console.error('[WebSocket] ❌ Error parsing message:', err);
          console.error('[WebSocket] Raw message:', event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] ========================================');
        console.error('[WebSocket] ❌ CONNECTION ERROR');
        console.error('[WebSocket] ========================================');
        console.error('[WebSocket] Error event:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] ========================================');
        console.log('[WebSocket] 🔌 CONNECTION CLOSED');
        console.log('[WebSocket] ========================================');
        console.log('[WebSocket] Code:', event.code);
        console.log('[WebSocket] Reason:', event.reason || 'No reason provided');
        console.log('[WebSocket] Was clean:', event.wasClean);
        setIsConnected(false);
      };

      wsRef.current = ws;
      console.log('[WebSocket] Connection attempt initiated');
    } catch (err: any) {
      console.error('[WebSocket] ❌ Failed to create WebSocket:', err);
      setError(err.message);
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('[WebSocket] 🔌 Disconnecting...');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      console.log('[WebSocket] ✅ Disconnected');
    } else {
      console.log('[WebSocket] ⚠️ Already disconnected');
    }
  }, []);

  // Send message
  const sendMessage = useCallback((message: WSMessage) => {
    console.log('[WebSocket] 📤 Sending message:', message.type);
    console.log('[WebSocket] Payload:', message.payload);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const jsonMessage = JSON.stringify(message);
      wsRef.current.send(jsonMessage);
      console.log('[WebSocket] ✅ Message sent successfully');
    } else {
      console.error('[WebSocket] ❌ Cannot send message - WebSocket not connected');
      console.error('[WebSocket] ReadyState:', wsRef.current?.readyState);
    }
  }, []);

  // Register message handler
  const on = useCallback((type: WSMessageType, handler: (payload: any) => void) => {
    console.log('[WebSocket] 📝 Registering handler for message type:', type);
    handlersRef.current.set(type, handler);
    console.log('[WebSocket] Total handlers registered:', handlersRef.current.size);
  }, []);

  // Unregister message handler
  const off = useCallback((type: WSMessageType) => {
    console.log('[WebSocket] 🗑️ Unregistering handler for message type:', type);
    handlersRef.current.delete(type);
    console.log('[WebSocket] Remaining handlers:', handlersRef.current.size);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    console.log('[WebSocket] 🎬 useWebSocket hook mounted, connecting...');
    connect();
    return () => {
      console.log('[WebSocket] 🔚 useWebSocket hook unmounting, disconnecting...');
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    on,
    off,
    reconnect: connect,
  };
};
