// Photo Selection Service
// Intelligently selects relevant photos based on conversation context
import { prisma } from '../prisma/client';
import { extractKeywords } from '../utils/keywordExtraction';

interface ScoredPhoto {
  photo: any;
  score: number;
  matchedKeywords: string[];
}

/**
 * Select a relevant photo for the current conversation turn
 * Uses keyword matching with recency/frequency penalties
 * @param participantId - Participant ID
 * @param conversationHistory - Recent conversation turns
 * @param lastShownPhotoIds - IDs of recently shown photos
 * @returns Selected photo or null
 */
export const selectPhotoForTurn = async (
  participantId: string,
  conversationHistory: Array<{ content: string; speakerName: string }>,
  lastShownPhotoIds: string[] = []
): Promise<any | null> => {
  console.log('[Photo Selection] Starting photo selection...');
  const startTime = Date.now();

  // 1. Get all participant photos
  const photos = await prisma.patientPhoto.findMany({
    where: { participantId },
    orderBy: { uploadedAt: 'desc' },
  });

  if (photos.length === 0) {
    console.log('[Photo Selection] No photos available for participant');
    return null;
  }

  console.log(`[Photo Selection] Found ${photos.length} photos for participant`);

  // 2. Extract keywords from recent conversation (last 5 turns)
  const recentTurns = conversationHistory.slice(-5);
  const conversationText = recentTurns.map(turn => turn.content).join(' ');
  const conversationKeywords = extractKeywords(conversationText);

  console.log(`[Photo Selection] Extracted keywords: ${conversationKeywords.slice(0, 10).join(', ')}${conversationKeywords.length > 10 ? '...' : ''}`);

  // 3. Score each photo
  const scoredPhotos: ScoredPhoto[] = photos.map(photo => {
    let score = 0;
    const matchedKeywords: string[] = [];

    // Combine photo tags and caption words for matching
    const photoKeywords = [
      ...photo.tags,
      ...extractKeywords(photo.caption || '')
    ].map(k => k.toLowerCase());

    // Match conversation keywords with photo keywords
    conversationKeywords.forEach(conversationKeyword => {
      if (photoKeywords.some(photoKeyword =>
        photoKeyword.includes(conversationKeyword) ||
        conversationKeyword.includes(photoKeyword)
      )) {
        score += 10; // Base score for keyword match
        matchedKeywords.push(conversationKeyword);
      }
    });

    // Penalize recently shown photos heavily
    if (lastShownPhotoIds.includes(photo.id)) {
      score -= 100;
    }

    // Penalize frequently shown photos
    score -= photo.timesShown * 3;

    // Bonus for photos never shown
    if (photo.timesShown === 0) {
      score += 5;
    }

    // Bonus for longer, more descriptive captions (likely more engaging)
    if (photo.caption && photo.caption.length > 50) {
      score += 2;
    }

    return { photo, score, matchedKeywords };
  });

  // 4. Sort by score (highest first)
  scoredPhotos.sort((a, b) => b.score - a.score);

  // Log top 3 candidates
  console.log('[Photo Selection] Top 3 photo candidates:');
  scoredPhotos.slice(0, 3).forEach((item, idx) => {
    console.log(`  ${idx + 1}. Photo ${item.photo.id} - Score: ${item.score}, Matches: ${item.matchedKeywords.join(', ') || 'none'}, Times shown: ${item.photo.timesShown}`);
  });

  // 5. Select best photo if score > threshold
  const bestMatch = scoredPhotos[0];
  const SCORE_THRESHOLD = 5;

  if (bestMatch.score >= SCORE_THRESHOLD) {
    const elapsedTime = Date.now() - startTime;
    console.log(`[Photo Selection] ✅ Selected photo ${bestMatch.photo.id} with score ${bestMatch.score} in ${elapsedTime}ms`);
    console.log(`[Photo Selection] Caption: "${bestMatch.photo.caption?.substring(0, 60)}..."`);
    return bestMatch.photo;
  }

  // 6. Fallback: Select least-recently-shown photo if no good match
  const leastShownPhoto = photos.reduce((least, current) => {
    // Prefer photos not in lastShownPhotoIds
    const leastIsRecent = lastShownPhotoIds.includes(least.id);
    const currentIsRecent = lastShownPhotoIds.includes(current.id);

    if (leastIsRecent && !currentIsRecent) return current;
    if (!leastIsRecent && currentIsRecent) return least;

    // Compare by timesShown, then by lastShownAt
    if (current.timesShown < least.timesShown) return current;
    if (current.timesShown === least.timesShown) {
      if (!current.lastShownAt) return current;
      if (!least.lastShownAt) return least;
      return current.lastShownAt < least.lastShownAt ? current : least;
    }

    return least;
  });

  const elapsedTime = Date.now() - startTime;
  console.log(`[Photo Selection] ℹ️ No strong keyword match, using fallback: photo ${leastShownPhoto.id} in ${elapsedTime}ms`);
  return leastShownPhoto;
};

/**
 * Check if this moderator turn should display a photo
 * Based on photo turn counter in session moderatorContext
 * @param sessionId - Session ID
 * @returns Boolean indicating if photo should be shown
 */
export const shouldShowPhotoThisTurn = async (sessionId: string): Promise<boolean> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { moderatorContext: true, participantId: true },
  });

  if (!session) {
    return false;
  }

  // Check if participant has photos
  const photoCount = await prisma.patientPhoto.count({
    where: { participantId: session.participantId },
  });

  if (photoCount === 0) {
    console.log('[Photo Selection] No photos available, skipping photo turn');
    return false;
  }

  // Get moderatorContext (JSON field)
  const context = session.moderatorContext as any || {};
  const photoTurnCounter = context.photoTurnCounter || 0;

  // Show photo every other moderator turn (when counter is odd)
  const shouldShow = photoTurnCounter % 2 === 1;

  console.log(`[Photo Selection] Photo turn counter: ${photoTurnCounter}, should show: ${shouldShow}`);
  return shouldShow;
};

/**
 * Increment photo turn counter in session context
 * @param sessionId - Session ID
 */
export const incrementPhotoTurnCounter = async (sessionId: string): Promise<void> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { moderatorContext: true },
  });

  if (!session) {
    return;
  }

  const context = session.moderatorContext as any || {};
  context.photoTurnCounter = (context.photoTurnCounter || 0) + 1;

  await prisma.session.update({
    where: { id: sessionId },
    data: { moderatorContext: context },
  });

  console.log(`[Photo Selection] Incremented photo turn counter to ${context.photoTurnCounter}`);
};

/**
 * Update last shown photos list in session context
 * @param sessionId - Session ID
 * @param photoId - Photo ID to add
 */
export const updateLastShownPhotos = async (sessionId: string, photoId: string): Promise<void> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { moderatorContext: true },
  });

  if (!session) {
    return;
  }

  const context = session.moderatorContext as any || {};
  const lastShownPhotoIds = context.lastShownPhotoIds || [];

  // Add to front of array, keep last 10
  lastShownPhotoIds.unshift(photoId);
  context.lastShownPhotoIds = lastShownPhotoIds.slice(0, 10);

  await prisma.session.update({
    where: { id: sessionId },
    data: { moderatorContext: context },
  });

  console.log(`[Photo Selection] Updated lastShownPhotoIds: [${context.lastShownPhotoIds.join(', ')}]`);
};
