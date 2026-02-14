// Conversation routes - text generation and turn persistence
import { Router, Request } from 'express';
import { ValidationError, NotFoundError } from '../types';
import { prisma } from '../prisma/client';
import { generateModeratorResponse } from '../services/aiModerator';
import { generateAgentResponse } from '../services/aiPatient';

const router = Router();

/**
 * POST /api/conversation/text
 * Generate text for a speaker (moderator or agent)
 *
 * Request body:
 * - sessionId: string
 * - speakerIndex: number
 * - currentPhase: ConversationPhase
 * - conversationHistory: Turn[] (last 10 turns)
 *
 * Response:
 * - content: string
 * - voiceId: string
 * - speakerName: string
 */
router.post('/text', async (req: Request, res, next) => {
  try {
    // Log deprecation warning
    console.warn('[DEPRECATED] POST /api/conversation/text is deprecated. Use /api/ai-patients/generate-response or /api/ai-moderator/generate-response instead.');

    const { sessionId, speakerIndex, currentPhase, conversationHistory } = req.body;

    console.log(`[Conversation Route] POST /api/conversation/text - sessionId: ${sessionId}, speakerIndex: ${speakerIndex}, phase: ${currentPhase}`);

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID is required');
    }

    if (speakerIndex === undefined || typeof speakerIndex !== 'number') {
      throw new ValidationError('Speaker index is required and must be a number');
    }

    if (!currentPhase) {
      throw new ValidationError('Current phase is required');
    }

    if (!Array.isArray(conversationHistory)) {
      throw new ValidationError('Conversation history must be an array');
    }

    // Get session from database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    console.log(`[Text Generation] Generating text for speaker index ${speakerIndex} in session ${sessionId}`);

    let content: string;
    let voiceId: string;
    let speakerName: string;

    // Speaker index 0 = moderator, 1 = user, 2+ = agents
    if (speakerIndex === 0) {
      console.log(`[Conversation Route] Generating text for moderator (speaker index 0)`);
      // Moderator - Get agents for context
      const agents = await prisma.agent.findMany({
        where: { participantId: session.participantId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`[Conversation Route] Found ${agents.length} agents for context`);

      const context = {
        sessionId,
        participantId: session.participantId,
        participant: session.participant,
        agents: agents,
        topic: session.topic,
        conversationHistory,
        currentPhase: currentPhase as any,
      };

      // Use basic options for deprecated route (no advanced features)
      content = await generateModeratorResponse(context, {
        lastParticipantEngagement: 'medium',
        sessionMemoryHooks: [],
      });
      voiceId = 'moderator_voice';
      speakerName = 'Moderator';

      console.log(`[Conversation Route] Generated moderator text (${content.length} chars)`);
    } else if (speakerIndex >= 2) {
      console.log(`[Conversation Route] Generating text for agent (speaker index ${speakerIndex})`);
      // Agent
      // Get agent from speaker index (index 2 = first agent, index 3 = second agent, etc.)
      const agents = await prisma.agent.findMany({
        where: { participantId: session.participantId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`[Conversation Route] Found ${agents.length} total agents`);

      const agentArrayIndex = speakerIndex - 2;
      const agent = agents[agentArrayIndex];

      if (!agent) {
        console.log(`[Conversation Route] Agent not found at index ${agentArrayIndex} (speaker index ${speakerIndex})`);
        throw new NotFoundError('Agent at specified index');
      }

      console.log(`[Conversation Route] Selected agent: ${agent.name} (${agent.id})`);

      // Get relevant memories for this agent
      const memories = await prisma.agentMemory.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const relevantMemories = memories.map((m) => m.content);

      console.log(`[Conversation Route] Loaded ${memories.length} memories for agent ${agent.name}`);

      const context = {
        sessionId,
        participantId: session.participantId,
        participant: session.participant,
        agents: agents,
        topic: session.topic,
        conversationHistory,
        currentPhase: currentPhase as any,
      };

      content = await generateAgentResponse(agent, context, relevantMemories);
      voiceId = agent.voiceId;
      speakerName = agent.name;

      console.log(`[Conversation Route] Generated agent text for ${agent.name} (${content.length} chars)`);
    } else {
      // Speaker index 1 = user (should never request text generation)
      console.log(`[Conversation Route] Invalid speaker index ${speakerIndex} - cannot generate text for user`);
      throw new ValidationError('Cannot generate text for user speaker');
    }

    console.log(`[Conversation Route] Sending response - speaker: ${speakerName}, content length: ${content.length}`);

    res.json({
      success: true,
      data: {
        content,
        voiceId,
        speakerName,
      },
    });
  } catch (error) {
    console.error('[Conversation Route] Error in POST /api/conversation/text:', error);
    next(error);
  }
});

/**
 * POST /api/conversation/turn
 * Save a turn to the database
 *
 * Request body:
 * - sessionId: string
 * - speakerType: 'participant' | 'agent' | 'moderator'
 * - speakerId?: string
 * - speakerName: string
 * - content: string
 * - sequenceNumber: number
 * - timestamp: string
 *
 * Response:
 * - id: number
 * - saved: boolean
 */
router.post('/turn', async (req: Request, res, next) => {
  try {
    const {
      sessionId,
      speakerType,
      speakerId,
      speakerName,
      content,
      sequenceNumber,
      timestamp,
    } = req.body;

    console.log(`[Conversation Route] POST /api/conversation/turn - session: ${sessionId}, speaker: ${speakerName} (${speakerType}), seq: ${sequenceNumber}`);

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID is required');
    }

    if (!speakerType || !['participant', 'agent', 'moderator'].includes(speakerType)) {
      throw new ValidationError('Valid speaker type is required');
    }

    if (!speakerName || typeof speakerName !== 'string') {
      throw new ValidationError('Speaker name is required');
    }

    if (!content || typeof content !== 'string') {
      throw new ValidationError('Content is required');
    }

    if (sequenceNumber === undefined || typeof sequenceNumber !== 'number') {
      throw new ValidationError('Sequence number is required');
    }

    // Get session to verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Check for duplicate sequence number (prevent duplicate submissions)
    const existingTurn = await prisma.turn.findFirst({
      where: {
        sessionId,
        sequenceNumber,
      },
    });

    if (existingTurn) {
      console.log(`[Turn Persistence] Turn with sequence ${sequenceNumber} already exists, returning existing`);
      return res.json({
        success: true,
        data: {
          id: existingTurn.id,
          saved: false, // Already existed
        },
      });
    }

    // Create turn
    const turn = await prisma.turn.create({
      data: {
        sessionId,
        speakerType,
        speakerId,
        speakerName,
        content,
        sequenceNumber,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    console.log(`[Turn Persistence] Saved turn ${turn.id} for session ${sessionId} (seq: ${sequenceNumber}, type: ${speakerType})`);

    // NEW: If this is a user turn, analyze content for agent name mentions
    // and return nextSpeakerId suggestion
    let nextSpeakerId: string | null = null;

    if (speakerType === 'participant') {
      console.log(`[Conversation Route] Analyzing participant turn for agent mentions...`);
      // Get all agents for this session
      const agents = await prisma.agent.findMany({
        where: { participantId: session.participantId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`[Conversation Route] Found ${agents.length} agents for mention analysis`);

      // Simple case-insensitive substring matching
      const contentLower = content.toLowerCase();
      const mentionedAgents = agents.filter(agent =>
        contentLower.includes(agent.name.toLowerCase())
      );

      // If exactly one agent is mentioned, suggest that agent
      if (mentionedAgents.length === 1) {
        nextSpeakerId = mentionedAgents[0].id;
        console.log(`[Conversation Route] User mentioned agent ${mentionedAgents[0].name}, suggesting as next speaker (${nextSpeakerId})`);
      } else if (mentionedAgents.length > 1) {
        console.log(`[Conversation Route] User mentioned multiple agents (${mentionedAgents.map(a => a.name).join(', ')}), no suggestion`);
      } else {
        console.log(`[Conversation Route] No specific agent mentioned by user`);
      }
    } else if (speakerType === 'agent') {
      console.log(`[Conversation Route] Turn saved for agent: ${speakerName} (${speakerId || 'no ID'})`);
    } else if (speakerType === 'moderator') {
      console.log(`[Conversation Route] Turn saved for moderator`);
    }

    console.log(`[Conversation Route] Turn saved successfully: ID ${turn.id}, nextSpeakerId: ${nextSpeakerId || 'none'}`);

    res.json({
      success: true,
      data: {
        id: turn.id,
        saved: true,
        nextSpeakerId, // null if no suggestion, or agent ID if user mentioned specific agent
      },
    });
  } catch (error) {
    console.error('[Conversation Route] Error in POST /api/conversation/turn:', error);
    next(error);
  }
});

export default router;
