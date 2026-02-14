// AI Moderator Routes
import { Router, Request } from 'express';
import {
  GenerateModeratorResponseDTO,
  GenerateModeratorOpeningDTO,
  GenerateModeratorClosingDTO,
  SessionMemoryHook,
  EngagementLevel
} from '../types';
import * as aiModeratorService from '../services/aiModerator';
import { prisma } from '../prisma/client';
import { assessParticipantEngagement, extractSessionMemoryHooks } from '../services/claude';

// In-memory session state for engagement tracking and memory hooks
// In production, this should be stored in Redis or database
const sessionState = new Map<string, {
  memoryHooks: SessionMemoryHook[];
  lastParticipantEngagement?: EngagementLevel;
  lastParticipantTurnNumber?: number;
}>();

const router = Router();

/**
 * POST /api/ai-moderator/generate-response
 * Generate a moderator response based on conversation context
 */
router.post('/generate-response', async (req: Request, res, next) => {
  try {
    const { sessionId, conversationHistory, currentPhase, needsRebalancing, targetQuieterAgent } = req.body as GenerateModeratorResponseDTO & {
      needsRebalancing?: boolean;
      targetQuieterAgent?: string;
    };

    // Validate required fields
    if (!sessionId || !conversationHistory || !currentPhase) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, conversationHistory, currentPhase'
      });
    }

    // Get session to build conversation context
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

    // Get or initialize session state
    if (!sessionState.has(sessionId)) {
      sessionState.set(sessionId, {
        memoryHooks: [],
        lastParticipantEngagement: 'medium',
      });
    }
    const state = sessionState.get(sessionId)!;

    // Check if last turn was from participant and assess engagement
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn && lastTurn.speakerType === 'participant') {
      const participantName = session.participant.name.split(' ')[0];

      // Assess engagement
      const engagement = await assessParticipantEngagement(lastTurn, participantName);
      state.lastParticipantEngagement = engagement.level;
      state.lastParticipantTurnNumber = conversationHistory.length - 1;

      // Extract memory hooks
      const newHooks = await extractSessionMemoryHooks(lastTurn, conversationHistory.length - 1);
      state.memoryHooks.push(...newHooks);

      console.log(`[AI Moderator] Participant engagement: ${engagement.level}, Memory hooks: ${newHooks.length}`);
    }

    // Build conversation context
    const context = {
      sessionId,
      participantId: session.participantId,
      participant: session.participant,
      agents: session.participant.agents,
      topic: session.topic ?? undefined,
      conversationHistory,
      currentPhase
    };

    // Generate moderator response with enhanced options
    const content = await aiModeratorService.generateModeratorResponse(context, {
      lastParticipantEngagement: state.lastParticipantEngagement,
      sessionMemoryHooks: state.memoryHooks,
      needsRebalancing,
      targetQuieterAgent,
    });

    // Return response with engagement data
    res.json({
      data: {
        content,
        voiceId: 'moderator_voice',
        engagementLevel: state.lastParticipantEngagement,
        memoryHooksCount: state.memoryHooks.length,
      }
    });

  } catch (error) {
    console.error('[AI Moderator] Error generating moderator response:', error);
    next(error);
  }
});

/**
 * POST /api/ai-moderator/opening
 * Generate opening statement for a new conversation
 */
router.post('/opening', async (req: Request, res, next) => {
  try {
    const { sessionId, topic, participantName, agentNames } = req.body as GenerateModeratorOpeningDTO;

    // Validate required fields
    if (!sessionId || !topic || !participantName || !agentNames) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, topic, participantName, agentNames'
      });
    }

    // Generate opening statement
    const content = await aiModeratorService.generateModeratorOpening(
      topic,
      participantName,
      agentNames
    );

    res.json({
      data: {
        content
      }
    });

  } catch (error) {
    console.error('[AI Moderator] Error generating opening:', error);
    next(error);
  }
});

/**
 * POST /api/ai-moderator/closing
 * Generate closing statement for ending conversation
 */
router.post('/closing', async (req: Request, res, next) => {
  try {
    const { sessionId, conversationHistory, topic } = req.body as GenerateModeratorClosingDTO;

    // Validate required fields
    if (!sessionId || !conversationHistory || !topic) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, conversationHistory, topic'
      });
    }

    // Get session to get participant name
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session state for memory hooks
    const state = sessionState.get(sessionId);
    const participantName = session.participant.name.split(' ')[0];

    // Generate closing statement with personalized highlights
    const content = await aiModeratorService.generateModeratorClosing(
      conversationHistory,
      topic,
      participantName,
      state?.memoryHooks
    );

    // Clean up session state
    sessionState.delete(sessionId);

    res.json({
      data: {
        content
      }
    });

  } catch (error) {
    console.error('[AI Moderator] Error generating closing:', error);
    next(error);
  }
});

export default router;
