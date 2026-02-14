// Participant routes
import { Router } from 'express';
import {
  createParticipant,
  getParticipantById,
  getAllParticipants,
  updateParticipant,
  deleteParticipant,
  getParticipantAgents,
  getParticipantSessions,
} from '../services/participant';

const router = Router();

/**
 * GET /api/participants
 * Get all participants (admin only)
 */
router.get('/', async (req, res, next) => {
  try {
    const { isActive, search } = req.query;

    const participants = await getAllParticipants({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
    });

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/participants
 * Create a new participant (admin only)
 */
router.post('/', async (req, res, next) => {
  try {
    const participant = await createParticipant(req.body);

    res.status(201).json({
      success: true,
      data: participant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/participants/:id
 * Get participant by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const participant = await getParticipantById(id);

    res.json({
      success: true,
      data: participant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/participants/:id
 * Update participant (admin only)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const participant = await updateParticipant(id, req.body);

    res.json({
      success: true,
      data: participant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/participants/:id
 * Delete participant (admin only)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteParticipant(id);

    res.json({
      success: true,
      message: 'Participant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/participants/:id/agents
 * Get all agents for a participant
 */
router.get('/:id/agents', async (req, res, next) => {
  try {
    const { id } = req.params;
    const agents = await getParticipantAgents(id);

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/participants/:id/sessions
 * Get all sessions for a participant
 */
router.get('/:id/sessions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const sessions = await getParticipantSessions(id, limit);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
