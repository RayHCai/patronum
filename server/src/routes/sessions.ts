// Session initialization and management routes
import { Router, Request } from 'express';
import { ValidationError, NotFoundError } from '../types';
import { prisma } from '../prisma/client';
import { generateModeratorOpening } from '../services/aiModerator';
import { generateAgentPersonalities } from '../services/aiPatient';
import { getHeygenService } from '../services/heygen';
import { NUM_AI_AGENTS } from '../constants/config';
import { completeSessionAnalysis } from '../services/sessionAnalytics';
import { analyzeSessionSpeechGraph } from '../services/speechGraphAnalysis';
import {
  shouldShowPhotoThisTurn,
  selectPhotoForTurn,
  incrementPhotoTurnCounter,
  updateLastShownPhotos,
} from '../services/photoSelection';
import { recordPhotoShown } from '../services/participant';

const router = Router();

/**
 * Parse heygenConfig from JSON string to object for client consumption
 * Includes fallback logic for legacy agents with incomplete heygenConfig
 */
function serializeAgentForClient(agent: any) {
  let heygenConfig = agent.heygenConfig;

  // Parse if it's a string
  if (heygenConfig && typeof heygenConfig === 'string') {
    try {
      heygenConfig = JSON.parse(heygenConfig);
    } catch (e) {
      console.error(`[Sessions] Failed to parse heygenConfig for agent ${agent.id}:`, e);
      heygenConfig = null;
    }
  }

  // Fallback: If heygenConfig exists but is missing avatarId, use heygenAvatarId field
  if (heygenConfig && !heygenConfig.avatarId && agent.heygenAvatarId) {
    console.log(`[Sessions] Adding missing avatarId to heygenConfig for agent ${agent.id}`);
    heygenConfig.avatarId = agent.heygenAvatarId;
  } else if (!heygenConfig && agent.heygenAvatarId) {
    // Fallback: If no heygenConfig but has heygenAvatarId, create a minimal config
    console.log(`[Sessions] Creating minimal heygenConfig for agent ${agent.id} from heygenAvatarId`);
    heygenConfig = {
      avatarId: agent.heygenAvatarId,
      appearance: {
        gender: 'male',
        ethnicity: 'Caucasian',
        age: agent.age || 68,
        clothing: 'casual sweater',
        background: 'cozy room',
      },
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  }

  return {
    id: agent.id,
    name: agent.name,
    age: agent.age,
    background: agent.background,
    personality: agent.personality,
    voiceId: agent.voiceId,
    avatarColor: agent.avatarColor,
    heygenAvatarId: agent.heygenAvatarId,
    heygenConfig,
  };
}

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

    // 3. Get HeyGen avatar ID for moderator (Marcus - using Wayne avatar for distinction)
    const heygenService = getHeygenService();
    const moderatorAvatarId = process.env.HEYGEN_MODERATOR_AVATAR_ID || 'Wayne_20240711';

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

    console.log('\n\n');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] ⚡ GENERATE AGENTS ENDPOINT HIT! ⚡');
    console.log('[Agent Gen] ==========================================');
    console.log('[Agent Gen] Session ID:', sessionId);
    console.log('[Agent Gen] Moderator ID:', moderatorId);
    console.log('[Agent Gen] Request body count:', req.body.count);
    console.log('[Agent Gen] Final count value:', count);
    console.log('[Agent Gen] NUM_AI_AGENTS constant:', NUM_AI_AGENTS);
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('\n\n');

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

        console.log(`[Agent Gen] Creating agent ${profile.name} with appearance:`, appearance);

        let heygenAvatarId: string;
        try {
          heygenAvatarId = await heygenService.getOrCreateAvatar({
            appearance,
            avatarId: '',
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          });
          console.log(`[Agent Gen] Got HeyGen avatar ID for ${profile.name}: ${heygenAvatarId}`);
        } catch (heygenError) {
          console.error(`[Agent Gen] HeyGen avatar creation failed for ${profile.name}:`, heygenError);
          // Generate fallback avatar ID based on appearance (still valid avatar!)
          heygenAvatarId = appearance.gender === 'female'
            ? 'Angela-inblackskirt-20220820'
            : 'Wayne_20240711';
          console.log(`[Agent Gen] Using fallback HeyGen avatar ID: ${heygenAvatarId}`);
        }

        // Ensure we have a valid avatar ID
        if (!heygenAvatarId || heygenAvatarId === 'default' || heygenAvatarId === 'fallback-avatar-id') {
          heygenAvatarId = appearance.gender === 'female'
            ? 'Angela-inblackskirt-20220820'
            : 'Wayne_20240711';
          console.warn(`[Agent Gen] Invalid avatar ID detected, using fallback: ${heygenAvatarId}`);
        }

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
            heygenConfig: JSON.stringify({
              avatarId: heygenAvatarId,
              appearance,
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString(),
            }),
          },
        });

        console.log(`[Agent Gen] ✅ Created agent ${agent.id}: ${agent.name} with HeyGen avatar ${heygenAvatarId}`);

        return agent;
      } catch (error) {
        console.error(`[Agent Gen] ❌ Failed to create agent ${profile.name}:`, error);
        // Generate a valid fallback avatar even in error case
        const fallbackGender = profile.gender || 'male';
        const fallbackAvatarId = fallbackGender === 'female'
          ? 'Angela-inblackskirt-20220820'
          : 'Wayne_20240711';

        return prisma.agent.create({
          data: {
            participantId: session.participantId,
            name: profile.name,
            age: profile.age,
            background: profile.background,
            personality: profile.personality,
            avatarColor: profile.avatarColor,
            voiceId: profile.voiceId,
            heygenAvatarId: fallbackAvatarId,
            heygenConfig: JSON.stringify({
              avatarId: fallbackAvatarId,
              appearance: {
                gender: profile.gender || 'male',
                ethnicity: profile.ethnicity || 'Caucasian',
                age: profile.age,
                clothing: 'casual sweater',
                background: 'cozy room',
              },
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString(),
            }),
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

    // Return agents to client with properly parsed heygenConfig
    res.json({
      success: true,
      data: {
        agents: agents.map(serializeAgentForClient),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/select-photo
 * Select a photo for the current moderator turn
 *
 * This endpoint checks if a photo should be shown and selects the most relevant one
 * based on conversation context and photo metadata.
 *
 * Request body: (none required)
 *
 * Response:
 * - shouldShowPhoto: boolean
 * - photo?: { id, photoUrl, caption, tags } (if shouldShowPhoto is true)
 */
router.post('/:id/select-photo', async (req: Request, res, next) => {
  try {
    const sessionId = req.params.id;

    console.log(`[Photo Selection] Checking photo turn for session ${sessionId}`);

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        turns: {
          orderBy: { sequenceNumber: 'desc' },
          take: 5,
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Check if this should be a photo turn
    const shouldShow = await shouldShowPhotoThisTurn(sessionId);

    if (!shouldShow) {
      console.log(`[Photo Selection] Not a photo turn, skipping`);
      // Still increment counter for next time
      await incrementPhotoTurnCounter(sessionId);
      return res.json({
        success: true,
        data: {
          shouldShowPhoto: false,
        },
      });
    }

    // Get moderator context for lastShownPhotoIds
    const context = session.moderatorContext as any || {};
    const lastShownPhotoIds = context.lastShownPhotoIds || [];

    // Select photo based on conversation history
    const conversationHistory = session.turns.map(turn => ({
      content: turn.content,
      speakerName: turn.speakerName || 'Unknown',
    }));

    const selectedPhoto = await selectPhotoForTurn(
      session.participantId,
      conversationHistory,
      lastShownPhotoIds
    );

    if (!selectedPhoto) {
      console.log(`[Photo Selection] No suitable photo found`);
      await incrementPhotoTurnCounter(sessionId);
      return res.json({
        success: true,
        data: {
          shouldShowPhoto: false,
        },
      });
    }

    // Update photo statistics
    await recordPhotoShown(selectedPhoto.id);
    await updateLastShownPhotos(sessionId, selectedPhoto.id);
    await incrementPhotoTurnCounter(sessionId);

    console.log(`[Photo Selection] Selected photo ${selectedPhoto.id} for session ${sessionId}`);

    res.json({
      success: true,
      data: {
        shouldShowPhoto: true,
        photo: {
          id: selectedPhoto.id,
          photoUrl: selectedPhoto.photoUrl,
          caption: selectedPhoto.caption,
          tags: selectedPhoto.tags,
        },
      },
    });
  } catch (error) {
    console.error('[Photo Selection] Error:', error);
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

/**
 * GET /api/sessions/:id/speech-graph
 * Get speech graph data for a session
 *
 * Response:
 * - metrics: Speech graph metrics (LSC, LCC, loops, etc.)
 * - graph: Graph structure for visualization (nodes and links)
 * - computed_at: When the analysis was performed
 */
router.get('/:id/speech-graph', async (req: Request, res, next) => {
  try {
    const { id } = req.params;

    const analytics = await prisma.sessionAnalytics.findFirst({
      where: { sessionId: id },
      select: {
        speechGraphMetrics: true,
        graphStructure: true,
        graphComputedAt: true,
      },
    });

    if (!analytics || !analytics.speechGraphMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Speech graph data not found. The analysis may not have been run yet.',
      });
    }

    res.json({
      success: true,
      data: {
        metrics: analytics.speechGraphMetrics,
        graph: analytics.graphStructure,
        computed_at: analytics.graphComputedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/speech-graph/reanalyze
 * Re-analyze speech graph for a session
 *
 * This triggers a new analysis using the Python microservice.
 * Useful if the Python service was unavailable during initial analysis.
 *
 * Response:
 * - success: boolean
 * - message: Status message
 */
router.post('/:id/speech-graph/reanalyze', async (req: Request, res, next) => {
  try {
    const { id } = req.params;

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    console.log(`[Speech Graph] Triggering re-analysis for session ${id}`);

    // Trigger speech graph analysis
    await analyzeSessionSpeechGraph(id);

    res.json({
      success: true,
      message: 'Speech graph re-analysis completed successfully',
    });
  } catch (error) {
    console.error('[Speech Graph] Re-analysis error:', error);
    next(error);
  }
});

export default router;
