// Reinforcement routes
import { Router } from 'express';
import {
  generateReinforcement,
  answerReinforcementItem,
  getReinforcementItems,
  getDueReinforcementItems,
} from '../services/reinforcement';

const router = Router();

/**
 * POST /api/reinforcement/generate
 * Generate reinforcement items for a session
 */
router.post('/generate', async (req, res, next) => {
  try {
    const items = await generateReinforcement(req.body);

    res.status(201).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reinforcement/:id/answer
 * Submit answer for a reinforcement item
 */
router.post('/:id/answer', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const item = await answerReinforcementItem(parseInt(id), answer);

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reinforcement/participant/:participantId
 * Get all reinforcement items for a participant
 */
router.get('/participant/:participantId', async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const items = await getReinforcementItems(participantId, limit);

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reinforcement/participant/:participantId/due
 * Get due reinforcement items for a participant
 */
router.get('/participant/:participantId/due', async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const items = await getDueReinforcementItems(participantId);

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
