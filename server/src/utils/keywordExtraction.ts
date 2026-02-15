// Keyword Extraction Utility
// Extracts meaningful keywords from text for photo matching

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'having', 'may', 'should', 'am', 'being', 'being', 'does', 'very', 'really', 'something', 'things', 'thing', 'yeah', 'oh', 'um', 'uh', 'well', 'actually', 'right', 'okay', 'yes', 'no'
]);

/**
 * Extract meaningful keywords from text
 * @param text - Text to extract keywords from
 * @param minLength - Minimum keyword length (default: 3)
 * @returns Array of keywords (lowercase, deduplicated)
 */
export const extractKeywords = (text: string, minLength: number = 3): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. Normalize text: lowercase, remove punctuation
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // 2. Split into words
  const words = normalized.split(' ');

  // 3. Filter out stop words and short words
  const keywords = words.filter(word =>
    word.length >= minLength &&
    !STOP_WORDS.has(word) &&
    !/^\d+$/.test(word) // Filter out pure numbers
  );

  // 4. Deduplicate
  const uniqueKeywords = Array.from(new Set(keywords));

  // 5. Sort by word length (longer words are often more specific/meaningful)
  uniqueKeywords.sort((a, b) => b.length - a.length);

  // 6. Return top 20 keywords
  return uniqueKeywords.slice(0, 20);
};

/**
 * Extract noun phrases from text (simple version)
 * Identifies multi-word phrases that might be meaningful
 * @param text - Text to extract phrases from
 * @returns Array of phrases
 */
export const extractPhrases = (text: string): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Common patterns for meaningful phrases
  const patterns = [
    // Two-word phrases (adjective + noun patterns)
    /\b(family|birthday|wedding|christmas|vacation|summer|winter|beach|garden|home|house|kitchen|school|church|park)\s+(gathering|party|celebration|trip|day|time|visit|photo|picture|memory)\b/gi,
    // Name + relationship
    /\b(grandma|grandpa|mom|dad|uncle|aunt|cousin|brother|sister|friend)\s+\w+\b/gi,
    // Activity phrases
    /\b(playing|baking|cooking|walking|hiking|fishing|swimming|dancing|singing|reading)\s+(with|in|at|the)\s+\w+\b/gi,
  ];

  const phrases: string[] = [];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Deduplicate
  return Array.from(new Set(phrases));
};

/**
 * Calculate keyword similarity between two texts
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 */
export const calculateKeywordSimilarity = (text1: string, text2: string): number => {
  const keywords1 = new Set(extractKeywords(text1));
  const keywords2 = new Set(extractKeywords(text2));

  if (keywords1.size === 0 || keywords2.size === 0) {
    return 0;
  }

  // Calculate Jaccard similarity (intersection / union)
  const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
};
