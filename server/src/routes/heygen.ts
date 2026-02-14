// HeyGen API routes
import express, { Request, Response } from 'express';
import { getHeygenService } from '../services/heygen';
import { getAgentById } from '../services/agent';

const router = express.Router();

/**
 * POST /api/heygen/avatar/session
 * Create a new HeyGen avatar session for streaming
 */
router.post('/avatar/session', async (req: Request, res: Response) => {
  try {
    const { avatarId } = req.body;

    if (!avatarId) {
      return res.status(400).json({
        error: 'Avatar ID is required',
      });
    }

    const heygenService = getHeygenService();

    if (!heygenService.isConfigured()) {
      return res.status(503).json({
        error: 'HeyGen service is not configured',
      });
    }

    const session = await heygenService.createAvatarSession(avatarId);

    return res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('[HeyGen Routes] Error creating avatar session:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create avatar session',
    });
  }
});

/**
 * GET /api/heygen/avatar/:agentId/config
 * Get HeyGen avatar configuration for an agent
 */
router.get('/avatar/:agentId/config', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const agent = await getAgentById(agentId);

    if (!agent.heygenAvatarId || !agent.heygenConfig) {
      return res.status(404).json({
        error: 'Agent does not have HeyGen avatar configured',
      });
    }

    return res.json({
      success: true,
      data: {
        avatarId: agent.heygenAvatarId,
        config: agent.heygenConfig,
      },
    });
  } catch (error: any) {
    console.error('[HeyGen Routes] Error getting avatar config:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get avatar configuration',
    });
  }
});

/**
 * POST /api/heygen/moderator/session
 * Create a HeyGen avatar session for the moderator
 */
router.post('/moderator/session', async (req: Request, res: Response) => {
  try {
    const heygenService = getHeygenService();

    if (!heygenService.isConfigured()) {
      return res.status(503).json({
        error: 'HeyGen service is not configured',
      });
    }

    // For moderator, use a pre-configured avatar
    // This could be stored in environment variables or config
    const moderatorAvatarId = process.env.HEYGEN_MODERATOR_AVATAR_ID || 'default-moderator-avatar';

    const session = await heygenService.createAvatarSession(moderatorAvatarId);

    return res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('[HeyGen Routes] Error creating moderator session:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create moderator avatar session',
    });
  }
});

/**
 * GET /api/heygen/status
 * Check if HeyGen service is configured and available
 */
router.get('/status', async (req: Request, res: Response) => {
  const heygenService = getHeygenService();

  return res.json({
    success: true,
    data: {
      configured: heygenService.isConfigured(),
      available: heygenService.isConfigured(),
    },
  });
});

export default router;
