// Participant routes
import { Router } from 'express';
import multer from 'multer';
import {
  createParticipant,
  getParticipantById,
  getAllParticipants,
  updateParticipant,
  deleteParticipant,
  getParticipantAgents,
  getParticipantSessions,
  uploadParticipantPhotos,
  getParticipantPhotos,
  updateParticipantPhoto,
  deleteParticipantPhoto,
} from '../services/participant';

const router = Router();

// Configure multer for photo uploads (memory storage)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10, // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

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

// ========================================
// Photo Management Routes
// ========================================

/**
 * POST /api/participants/:id/photos
 * Upload photos for a participant with AI auto-captioning
 * Accepts multipart/form-data with 'photos' field
 */
router.post('/:id/photos', photoUpload.array('photos', 10), async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos provided',
      });
    }

    console.log(`[Participants Route] Received ${files.length} photos for participant ${id}`);

    // Prepare files for processing
    const fileData = files.map(file => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
    }));

    // Upload and analyze photos
    const photos = await uploadParticipantPhotos(id, fileData);

    res.status(201).json({
      success: true,
      data: { photos },
      message: `Successfully uploaded ${photos.length} photos with AI-generated captions`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/participants/:id/photos
 * Get all photos for a participant
 * Query params: orderBy (newest|oldest|mostShown|leastShown)
 */
router.get('/:id/photos', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderBy } = req.query;

    const photos = await getParticipantPhotos(id, {
      orderBy: orderBy as 'newest' | 'oldest' | 'mostShown' | 'leastShown',
    });

    res.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/participants/:id/photos/:photoId
 * Update photo caption/tags (manual edit)
 */
router.put('/:id/photos/:photoId', async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { caption, tags, isAIGenerated } = req.body;

    const photo = await updateParticipantPhoto(photoId, {
      caption,
      tags,
      isAIGenerated,
    });

    res.json({
      success: true,
      data: photo,
      message: 'Photo updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/participants/:id/photos/:photoId
 * Delete a photo
 */
router.delete('/:id/photos/:photoId', async (req, res, next) => {
  try {
    const { photoId } = req.params;

    await deleteParticipantPhoto(photoId);

    res.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
