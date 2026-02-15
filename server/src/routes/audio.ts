// Audio proxy routes - secure proxy for ElevenLabs TTS
import { Router, Request } from 'express';
import { textToAudioBuffer } from '../services/elevenLabs';
import { ValidationError } from '../types';

const router = Router();

// In-memory audio cache for HeyGen lip-sync
// In production, use Redis or persistent storage
interface CachedAudio {
  buffer: Buffer;
  createdAt: number;
  voiceId: string;
}

const audioCache = new Map<string, CachedAudio>();

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
 * POST /api/audio/generate-url
 * Generate audio with ElevenLabs and return a public URL for HeyGen lip-sync
 *
 * Request body:
 * - text: string (required, max 1000 chars)
 * - voiceId: string (required)
 *
 * Response: JSON with audio URL
 */
router.post('/generate-url', async (req: Request, res, next) => {
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

    // Sanitize text
    const sanitizedText = text
      .replace(/[<>]/g, '')
      .trim();

    if (sanitizedText.length === 0) {
      throw new ValidationError('Text cannot be empty after sanitization');
    }

    console.log(`[Audio URL] Generating audio for HeyGen, voiceId: ${voiceId}, length: ${sanitizedText.length} chars`);

    // Generate audio with ElevenLabs
    const audioBuffer = await textToAudioBuffer(sanitizedText, voiceId);

    // Create a unique filename
    const audioId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Store in memory cache (temporary)
    audioCache.set(audioId, {
      buffer: audioBuffer,
      createdAt: Date.now(),
      voiceId,
    });

    // Clean up old cache entries (older than 5 minutes)
    for (const [key, value] of audioCache.entries()) {
      if (Date.now() - value.createdAt > 5 * 60 * 1000) {
        audioCache.delete(key);
      }
    }

    // Return URL that HeyGen can access
    const audioUrl = `${req.protocol}://${req.get('host')}/api/audio/stream/${audioId}`;

    console.log(`[Audio URL] Audio generated successfully, URL: ${audioUrl}`);

    res.json({
      success: true,
      data: {
        audioUrl,
        audioId,
        duration: audioBuffer.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/stream/:audioId
 * Stream cached audio for HeyGen lip-sync
 */
router.get('/stream/:audioId', async (req: Request, res, next) => {
  try {
    const { audioId } = req.params;

    if (!audioCache.has(audioId)) {
      return res.status(404).json({
        error: 'Audio not found or expired',
      });
    }

    const cached = audioCache.get(audioId)!;

    // Set response headers
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Content-Length': cached.buffer.length,
      'Access-Control-Allow-Origin': '*', // Allow HeyGen to access
    });

    // Send audio buffer
    res.send(cached.buffer);

    console.log(`[Audio Stream] Served audio ${audioId}, size: ${(cached.buffer.length / 1024).toFixed(1)}KB`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/stats
 * Get audio cache/usage stats (for monitoring)
 */
router.get('/stats', async (_req: Request, res, next) => {
  try {
    const cacheSize = audioCache.size;
    res.json({
      success: true,
      data: {
        message: 'Stats endpoint available',
        cachedAudio: cacheSize,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
