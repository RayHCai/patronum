// AI Patients (Agents) Routes
import { Router, Request } from 'express';
import { GenerateAgentResponseDTO, GeneratePersonalitiesDTO, ConversationContext } from '../types';
import * as aiPatientService from '../services/aiPatient';
import * as agentService from '../services/agent';
import { prisma } from '../prisma/client';
import { NUM_AI_AGENTS } from '../constants/config';

const router = Router();

/**
 * POST /api/ai-patients/generate-response
 * Generate a response for a specific agent in the conversation
 */
router.post('/generate-response', async (req: Request, res, next) => {
  try {
    const requestBody = req.body as GenerateAgentResponseDTO;
    const { sessionId, agentId, currentPhase } = requestBody;
    const conversationHistoryFromBody = requestBody.conversationHistory;
    const userReturnCounter = requestBody.userReturnCounter || 0;

    console.log('[AI Patients] Request received:', {
      sessionId,
      agentId,
      conversationHistoryType: typeof conversationHistoryFromBody,
      conversationHistoryIsArray: Array.isArray(conversationHistoryFromBody),
      conversationHistoryLength: Array.isArray(conversationHistoryFromBody) ? conversationHistoryFromBody.length : 'N/A',
      currentPhase,
      userReturnCounter
    });

    // Validate required fields
    if (!sessionId || !agentId || !conversationHistoryFromBody || !currentPhase) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, agentId, conversationHistory, currentPhase'
      });
    }

    // Validate conversationHistory is an array
    if (!Array.isArray(conversationHistoryFromBody)) {
      return res.status(400).json({
        error: 'conversationHistory must be an array'
      });
    }

    // Get agent from database
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get session to get participant info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: {
          include: {
            agents: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get relevant memories for the agent (last 5)
    const memories = await agentService.getAgentMemories(agentId, sessionId);
    const relevantMemories = memories.slice(0, 5).map(m => m.content);

    // Build conversation context - use explicit property assignment to avoid TDZ issues
    const context: ConversationContext = {
      sessionId: sessionId,
      participantId: session.participantId,
      participant: session.participant,
      agents: session.participant.agents,
      topic: session.topic ?? undefined,
      conversationHistory: conversationHistoryFromBody,
      currentPhase: currentPhase
    };

    // Generate agent response
    const { content, returnToUser } = await aiPatientService.generateAgentResponse(
      agent,
      context,
      relevantMemories,
      userReturnCounter
    );

    console.log('[AI Patients] Agent response generated:', {
      agentName: agent.name,
      returnToUser,
      contentPreview: content.substring(0, 80) + '...'
    });

    // Return response
    res.json({
      data: {
        content,
        voiceId: agent.voiceId || 'default_voice',
        agentName: agent.name,
        returnToUser
      }
    });

  } catch (error) {
    console.error('[AI Patients] Error generating agent response:', error);
    next(error);
  }
});

/**
 * POST /api/ai-patients/generate-personalities
 * Generate AI personalities for a new session
 */
router.post('/generate-personalities', async (req: Request, res, next) => {
  try {
    const { participantId, topic, count = NUM_AI_AGENTS, participantBackground } = req.body as GeneratePersonalitiesDTO;

    // Validate required fields
    if (!participantId || !topic) {
      return res.status(400).json({
        error: 'Missing required fields: participantId, topic'
      });
    }

    // Get participant details
    const participant = await prisma.participant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Use participant notes as background if not provided
    const background = participantBackground || participant.notes || '';

    // Generate personalities
    const personalities = await aiPatientService.generateAgentPersonalities(
      background,
      topic,
      count
    );

    res.json({
      data: {
        personalities
      }
    });

  } catch (error) {
    console.error('[AI Patients] Error generating personalities:', error);
    next(error);
  }
});

/**
 * POST /api/ai-patients/extract-memories
 * Extract memories from a conversation segment
 */
router.post('/extract-memories', async (req: Request, res, next) => {
  try {
    const { sessionId, conversationExcerpt, agentIds } = req.body;

    // Validate required fields
    if (!sessionId || !conversationExcerpt || !agentIds) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, conversationExcerpt, agentIds'
      });
    }

    // Extract memories
    const memories = await aiPatientService.extractMemories(
      conversationExcerpt,
      agentIds
    );

    // Save memories to database
    for (const memory of memories) {
      await agentService.createAgentMemory(
        memory.agentId,
        sessionId,
        {
          content: memory.content,
          memoryType: memory.memoryType,
          keywords: memory.keywords
        }
      );
    }

    res.json({
      data: {
        memories
      }
    });

  } catch (error) {
    console.error('[AI Patients] Error extracting memories:', error);
    next(error);
  }
});

export default router;
