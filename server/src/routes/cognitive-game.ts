// Cognitive Game routes
import { Router } from 'express';
import { generateCognitiveGame, GameType } from '../services/cognitiveGameFactory';
import { prisma } from '../prisma/client';

const router = Router();

/**
 * POST /api/cognitive-game/start
 * Generate a random cognitive game for a session
 * Request body: { sessionId: string }
 * Response: { gameType: string, questionCount: number, questions: GameQuestion[] }
 */
router.post('/start', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Get session to determine conversation length
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { turns: true }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Adaptive question count (3 for <15 turns, 5 for 15+)
    const turnCount = session.turns.length;
    const questionCount = turnCount < 15 ? 3 : 5;

    console.log(`[Cognitive Game] Session ${sessionId} has ${turnCount} turns, generating ${questionCount} questions`);

    // Always use memory_recall game type (quiz about the conversation)
    const gameType: GameType = 'memory_recall';
    console.log(`[Cognitive Game] Using game type: ${gameType} (conversation quiz)`);

    // Generate questions
    console.log(`[Cognitive Game] Calling generateCognitiveGame with sessionId: ${sessionId}, gameType: ${gameType}, count: ${questionCount}`);
    const questions = await generateCognitiveGame(sessionId, gameType, questionCount);
    console.log(`[Cognitive Game] Successfully generated ${questions.length} questions`);

    res.status(200).json({
      success: true,
      data: {
        gameType,
        questionCount,
        questions
      }
    });
  } catch (error: any) {
    console.error('[Cognitive Game] ========================================');
    console.error('[Cognitive Game] ERROR STARTING GAME');
    console.error('[Cognitive Game] ========================================');
    console.error('[Cognitive Game] Error message:', error.message);
    console.error('[Cognitive Game] Error stack:', error.stack);
    console.error('[Cognitive Game] Full error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate cognitive game',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/cognitive-game/submit
 * Save game results to database
 * Request body: {
 *   sessionId: string,
 *   participantId: string,
 *   gameType: string,
 *   score: number,
 *   totalQuestions: number,
 *   answers: any[],
 *   durationSeconds: number
 * }
 */
router.post('/submit', async (req, res, next) => {
  try {
    const {
      sessionId,
      participantId,
      gameType,
      score,
      totalQuestions,
      answers,
      durationSeconds
    } = req.body;

    // Validation
    if (!sessionId || !participantId || !gameType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, participantId, gameType'
      });
    }

    // Create game result record
    const result = await prisma.cognitiveGameResult.create({
      data: {
        sessionId,
        participantId,
        gameType,
        questionCount: totalQuestions,
        score,
        totalQuestions,
        answers: answers || [],
        completedAt: new Date(),
        durationSeconds: durationSeconds || 0
      }
    });

    console.log(`[Cognitive Game] Saved result for session ${sessionId}: ${score}/${totalQuestions} in ${durationSeconds}s`);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Cognitive Game] Failed to save results:', error);
    next(error);
  }
});

/**
 * GET /api/cognitive-game/participant/:participantId
 * Get all cognitive game results for a participant
 */
router.get('/participant/:participantId', async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const results = await prisma.cognitiveGameResult.findMany({
      where: { participantId },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        session: {
          select: {
            topic: true,
            startedAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[Cognitive Game] Failed to fetch participant results:', error);
    next(error);
  }
});

/**
 * GET /api/cognitive-game/session/:sessionId
 * Get cognitive game results for a specific session
 */
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const result = await prisma.cognitiveGameResult.findFirst({
      where: { sessionId },
      include: {
        participant: {
          select: {
            name: true
          }
        }
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'No game result found for this session'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Cognitive Game] Failed to fetch session result:', error);
    next(error);
  }
});

export default router;
