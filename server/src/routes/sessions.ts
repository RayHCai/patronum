// Session initialization and management routes
import { Router, Request } from 'express';
import { ValidationError, NotFoundError } from '../types';
import { prisma } from '../prisma/client';
import { generateModeratorOpening } from '../services/aiModerator';
import { generateAgentPersonalities } from '../services/aiPatient';
import { getHeygenService } from '../services/heygen';
import { NUM_AI_AGENTS } from '../constants/config';
import { completeSessionAnalysis } from '../services/sessionAnalytics';

const router = Router();

/**
 * GET /api/sessions/:id
 * Get session details with turns
 *
 * Response:
 * - session: Session with turns, participant, and agents
 */
router.get('/:id', async (req: Request, res, next) => {
  try {
    const sessionId = req.params.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: {
          include: {
            agents: true,
          },
        },
        turns: {
          orderBy: { sequenceNumber: 'asc' },
        },
        sessionAnalytics: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/initialize
 * Initialize a new conversation session
 *
 * Phase 1: Create session, generate moderator context + initial message
 *
 * Request body:
 * - participantId: string
 * - topic?: string
 *
 * Response:
 * - sessionId: string
 * - moderatorId: string
 * - moderatorInitialMessage: { text: string, avatarId: string }
 */
router.post('/initialize', async (req: Request, res, next) => {
  try {
    const { participantId, topic } = req.body;

    // Validate input
    if (!participantId || typeof participantId !== 'string') {
      throw new ValidationError('Participant ID is required');
    }

    // Verify participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new NotFoundError('Participant');
    }

    console.log(`[Session Init] Creating session for participant ${participantId}, topic: "${topic || 'general'}"`);

    // 1. Create session record (status: 'initializing')
    const session = await prisma.session.create({
      data: {
        participantId,
        topic: topic || null,
        status: 'initializing',
      },
    });

    console.log(`[Session Init] Created session ${session.id}`);

    // 2. Generate moderator context and initial message
    // For now, moderatorId will be the session ID + '_moderator'
    const moderatorId = `${session.id}_moderator`;

    // Moderator context will be stored in the session itself
    // The moderator's role, topic, and behavioral instructions are in the aiModerator service

    // Generate the moderator's opening message
    const moderatorOpeningText = await generateModeratorOpening(
      topic || 'general conversation',
      participant.name,
      [] // Agent names not yet available - we'll generate agents next
    );

    console.log(`[Session Init] Generated moderator opening: "${moderatorOpeningText.substring(0, 50)}..."`);

    // 3. Get HeyGen avatar ID for moderator
    const heygenService = getHeygenService();
    const moderatorAvatarId = process.env.HEYGEN_MODERATOR_AVATAR_ID || 'default-moderator-avatar';

    // Store moderator context in session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        moderatorContext: JSON.stringify({
          moderatorId,
          topic: topic || 'general conversation',
          participantName: participant.name,
          openingMessage: moderatorOpeningText,
          avatarId: moderatorAvatarId,
        }),
      },
    });

    console.log(`[Session Init] Stored moderator context in session ${session.id}`);

    // Return to client
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        moderatorId,
        moderatorInitialMessage: {
          text: moderatorOpeningText,
          avatarId: moderatorAvatarId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/generate-agents
 * Generate agent personalities for a session (in parallel)
 *
 * Phase 2: Generate N agents using moderator context
 *
 * Request body:
 * - moderatorId: string
 * - count?: number (default 2)
 *
 * Response:
 * - agents: Agent[] (with id, name, age, background, personality, voiceId, avatarColor, heygenAvatarId)
 */
router.post('/:id/generate-agents', async (req: Request, res, next) => {
  try {
    const sessionId = req.params.id;
    const { moderatorId, count = NUM_AI_AGENTS } = req.body;

    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] RECEIVED REQUEST TO GENERATE AGENTS');
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] Request body count:', req.body.count);
    console.log('[Agent Gen] Final count value:', count);
    console.log('[Agent Gen] NUM_AI_AGENTS constant:', NUM_AI_AGENTS);

    // Validate input
    if (!moderatorId || typeof moderatorId !== 'string') {
      throw new ValidationError('Moderator ID is required');
    }

    if (typeof count !== 'number' || count < 1 || count > 10) {
      throw new ValidationError('Count must be a number between 1 and 10');
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Parse moderator context
    let moderatorContext: any = {};
    if (session.moderatorContext) {
      try {
        moderatorContext = JSON.parse(session.moderatorContext as string);
      } catch (e) {
        console.error('[Agent Gen] Failed to parse moderator context:', e);
      }
    }

    const topic = moderatorContext.topic || session.topic || 'general conversation';

    console.log(`[Agent Gen] Generating ${count} agents for session ${sessionId}, topic: "${topic}"`);

    // Generate agent personalities using Claude (this will be done in parallel internally)
    const personalities = await generateAgentPersonalities(
      session.participant.notes || '',
      topic,
      count
    );

    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] PERSONALITIES GENERATION RESULT');
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] Requested count:', count);
    console.log('[Agent Gen] Received personalities:', personalities.length);
    console.log('[Agent Gen] Personality names:', personalities.map(p => p.name).join(', '));

    if (personalities.length === 0) {
      throw new Error('Failed to generate agent personalities');
    }

    if (personalities.length !== count) {
      console.warn(`[Agent Gen] ⚠️ WARNING: Requested ${count} agents but got ${personalities.length}!`);
    }

    console.log(`[Agent Gen] Generated ${personalities.length} personalities`);

    // Get HeyGen service
    const heygenService = getHeygenService();

    // Create agents in database with HeyGen avatars
    // Use Promise.allSettled to handle individual failures
    const agentCreationPromises = personalities.map(async (profile) => {
      try {
        // Generate HeyGen avatar ID based on appearance
        const appearance = {
          gender: profile.gender || (Math.random() > 0.5 ? 'male' : 'female'),
          ethnicity: profile.ethnicity || 'Caucasian',
          age: profile.age,
          clothing: 'casual sweater',
          background: 'cozy room',
        };

        const heygenAvatarId = await heygenService.getOrCreateAvatar({
          appearance,
          avatarId: '',
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        });

        // Create agent in database
        const agent = await prisma.agent.create({
          data: {
            participantId: session.participantId,
            name: profile.name,
            age: profile.age,
            background: profile.background,
            personality: profile.personality,
            avatarColor: profile.avatarColor,
            voiceId: profile.voiceId,
            heygenAvatarId,
            heygenConfig: JSON.stringify({ appearance }),
          },
        });

        console.log(`[Agent Gen] Created agent ${agent.id}: ${agent.name} with HeyGen avatar ${heygenAvatarId}`);

        return agent;
      } catch (error) {
        console.error(`[Agent Gen] Failed to create agent ${profile.name}:`, error);
        // Return a fallback mock agent
        return prisma.agent.create({
          data: {
            participantId: session.participantId,
            name: profile.name,
            age: profile.age,
            background: profile.background,
            personality: profile.personality,
            avatarColor: profile.avatarColor,
            voiceId: profile.voiceId,
            heygenAvatarId: 'fallback-avatar-id',
          },
        });
      }
    });

    const results = await Promise.allSettled(agentCreationPromises);

    // Extract successful agents
    const agents = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (agents.length < 2) {
      throw new Error('Failed to generate minimum required agents (need at least 2)');
    }

    console.log(`[Agent Gen] Successfully created ${agents.length} agents for session ${sessionId}`);
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] RETURNING AGENTS TO CLIENT');
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] Agent count being returned:', agents.length);
    console.log('[Agent Gen] Agent names:', agents.map(a => a.name).join(', '));

    // Update session status to 'active'
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'active' },
    });

    // Return agents to client
    res.json({
      success: true,
      data: {
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          age: agent.age,
          background: agent.background,
          personality: agent.personality,
          voiceId: agent.voiceId,
          avatarColor: agent.avatarColor,
          heygenAvatarId: agent.heygenAvatarId,
          heygenConfig: agent.heygenConfig,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/reanalyze
 * Re-run analytics for an existing completed session
 *
 * This endpoint allows re-computing analytics for a session that was previously completed.
 * Useful for applying updated analysis algorithms or fixing analysis issues.
 *
 * Request body: (none required)
 *
 * Response:
 * - success: boolean
 * - summary: string
 * - sentimentAnalysis: DementiaSentimentAnalysis
 * - analytics: { totalTurns, participantTurnCount, avgTurnLength }
 * - coherenceMetrics: { coherenceScore, topicShifts, contextualContinuity }
 * - repetitionMetrics: { repetitionScore, repeatedPhrases, repeatedWords }
 */
router.post('/:id/reanalyze', async (req: Request, res, next) => {
  try {
    const sessionId = req.params.id;

    console.log(`[Session Reanalyze] Starting re-analysis for session ${sessionId}`);

    // Verify session exists and is completed
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    if (session.status !== 'completed') {
      throw new ValidationError('Can only reanalyze completed sessions');
    }

    // Delete existing analytics to avoid duplicates
    await prisma.sessionAnalytics.deleteMany({
      where: { sessionId },
    });

    console.log(`[Session Reanalyze] Deleted existing analytics for session ${sessionId}`);

    // Re-run complete analysis using the same service logic
    const result = await completeSessionAnalysis(sessionId);

    console.log(`[Session Reanalyze] Session ${sessionId} reanalyzed successfully`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Session Reanalyze] Error:', error);
    next(error);
  }
});

/**
 * POST /api/sessions/batch-reanalyze
 * Re-run analytics for multiple sessions
 *
 * Request body:
 * - sessionIds: string[] (array of session IDs to reanalyze)
 *
 * Response:
 * - success: boolean
 * - results: { sessionId, success, error? }[]
 * - summary: { total, succeeded, failed }
 */
router.post('/batch-reanalyze', async (req: Request, res, next) => {
  try {
    const { sessionIds } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      throw new ValidationError('sessionIds must be a non-empty array');
    }

    if (sessionIds.length > 20) {
      throw new ValidationError('Cannot reanalyze more than 20 sessions at once');
    }

    console.log(`[Batch Reanalyze] Starting batch re-analysis for ${sessionIds.length} sessions`);

    const results = await Promise.allSettled(
      sessionIds.map(async (sessionId) => {
        try {
          // Verify session exists and is completed
          const session = await prisma.session.findUnique({
            where: { id: sessionId },
          });

          if (!session) {
            throw new Error('Session not found');
          }

          if (session.status !== 'completed') {
            throw new Error('Session is not completed');
          }

          // Delete existing analytics
          await prisma.sessionAnalytics.deleteMany({
            where: { sessionId },
          });

          // Re-run analysis
          await completeSessionAnalysis(sessionId);

          return { sessionId, success: true };
        } catch (error: any) {
          return { sessionId, success: false, error: error.message };
        }
      })
    );

    const processedResults = results.map((result) =>
      result.status === 'fulfilled' ? result.value : result.reason
    );

    const succeeded = processedResults.filter(r => r.success).length;
    const failed = processedResults.filter(r => !r.success).length;

    console.log(`[Batch Reanalyze] Completed: ${succeeded} succeeded, ${failed} failed`);

    res.json({
      success: true,
      data: {
        results: processedResults,
        summary: {
          total: sessionIds.length,
          succeeded,
          failed,
        },
      },
    });
  } catch (error) {
    console.error('[Batch Reanalyze] Error:', error);
    next(error);
  }
});

export default router;
