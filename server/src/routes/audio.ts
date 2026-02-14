// Audio proxy routes - secure proxy for ElevenLabs TTS
import { Router, Request } from 'express';
import { textToAudioBuffer } from '../services/elevenLabs';
import { ValidationError } from '../types';

const router = Router();

/**
 * POST /api/audio/synthesize
 * Synthesize speech from text (proxy to ElevenLabs)
 *
 * Request body:
 * - text: string (required, max 1000 chars)
 * - voiceId: string (required)
 *
 * Response: Binary audio/mpeg stream
 */
router.post('/synthesize', async (req: Request, res, next) => {
  try {
    const { text, voiceId } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text is required and must be a string');
    }

    if (text.length === 0) {
      throw new ValidationError('Text cannot be empty');
    }

    if (text.length > 1000) {
      throw new ValidationError('Text must be 1000 characters or less');
    }

    if (!voiceId || typeof voiceId !== 'string') {
      throw new ValidationError('Voice ID is required and must be a string');
    }

    // Sanitize text (remove potentially harmful characters)
    const sanitizedText = text
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();

    if (sanitizedText.length === 0) {
      throw new ValidationError('Text cannot be empty after sanitization');
    }

    console.log(`[Audio Proxy] Synthesizing audio, voiceId: ${voiceId}, length: ${sanitizedText.length} chars`);

    // Call ElevenLabs service
    const audioBuffer = await textToAudioBuffer(sanitizedText, voiceId);

    // Set response headers
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Content-Length': audioBuffer.length,
    });

    // Send audio buffer
    res.send(audioBuffer);

    console.log(`[Audio Proxy] Audio synthesized successfully, size: ${(audioBuffer.length / 1024).toFixed(1)}KB`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/stats
 * Get audio cache/usage stats (for monitoring)
 */
router.get('/stats', async (req: Request, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        message: 'Stats endpoint available',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
