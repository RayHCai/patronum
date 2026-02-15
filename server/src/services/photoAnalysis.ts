// AI Photo Analysis Service
// Uses Claude Vision to automatically caption and tag patient photos
import { anthropic } from './claude';
import { stripMarkdownCodeFences } from './claude';

interface PhotoAnalysisResult {
  caption: string;
  tags: string[];
}

/**
 * Analyze a photo using Claude Vision API
 * Generates a warm, descriptive caption and relevant keyword tags
 * @param imageBuffer - Photo buffer to analyze
 * @param mimeType - MIME type of the image (default: image/jpeg)
 * @returns Object with caption and tags
 */
export const analyzePhoto = async (
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<PhotoAnalysisResult> => {
  console.log('[Photo Analysis] Starting AI analysis...');
  const startTime = Date.now();

  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Determine media type for Claude API
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  if (mimeType === 'image/png') {
    mediaType = 'image/png';
  } else if (mimeType === 'image/gif') {
    mediaType = 'image/gif';
  } else if (mimeType === 'image/webp') {
    mediaType = 'image/webp';
  } else {
    mediaType = 'image/jpeg';
  }

  try {
    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Analyze this photo for use in memory care conversations with patients who have mild cognitive impairment.

Provide:
1. A warm, descriptive caption (1-2 sentences) that captures what's in the photo - focus on people, places, activities, and emotions
2. 5-10 keyword tags for indexing (examples: family, beach, birthday, smiling, garden, food, pets, children, vacation, celebration, etc.)

Be specific and warm in your description. Help caregivers use this photo to spark meaningful memories.

Format your response as JSON:
{
  "caption": "A warm description of the photo...",
  "tags": ["tag1", "tag2", "tag3", ...]
}

IMPORTANT: Return ONLY the JSON object, no additional text before or after.`
          }
        ]
      }]
    });

    const elapsedTime = Date.now() - startTime;
    const response = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip markdown code fences if present
    const cleanedResponse = stripMarkdownCodeFences(response);

    // Parse JSON response
    const parsed: PhotoAnalysisResult = JSON.parse(cleanedResponse);

    console.log(`[Photo Analysis] ✅ Analysis complete in ${elapsedTime}ms`);
    console.log(`[Photo Analysis] Caption: "${parsed.caption.substring(0, 60)}${parsed.caption.length > 60 ? '...' : ''}"`);
    console.log(`[Photo Analysis] Tags: ${parsed.tags.join(', ')}`);

    return {
      caption: parsed.caption,
      tags: parsed.tags
    };

  } catch (error) {
    console.error('[Photo Analysis] ❌ Analysis failed:', error);

    // If JSON parsing fails, try to extract caption and tags manually
    if (error instanceof SyntaxError) {
      console.warn('[Photo Analysis] JSON parsing failed, attempting manual extraction');

      // Fallback: provide generic caption and tags
      return {
        caption: 'A cherished memory from the past',
        tags: ['memory', 'photo', 'moment']
      };
    }

    throw new Error(`Failed to analyze photo: ${error}`);
  }
};

/**
 * Batch analyze multiple photos
 * @param photos - Array of { buffer, mimeType }
 * @returns Array of PhotoAnalysisResults
 */
export const analyzeMultiplePhotos = async (
  photos: Array<{ buffer: Buffer; mimeType?: string }>
): Promise<PhotoAnalysisResult[]> => {
  console.log(`[Photo Analysis] Batch analyzing ${photos.length} photos...`);

  // Analyze sequentially to avoid rate limiting
  const results: PhotoAnalysisResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    console.log(`[Photo Analysis] Analyzing photo ${i + 1}/${photos.length}...`);
    const result = await analyzePhoto(photos[i].buffer, photos[i].mimeType);
    results.push(result);
  }

  console.log(`[Photo Analysis] ✅ Batch analysis complete`);
  return results;
};
