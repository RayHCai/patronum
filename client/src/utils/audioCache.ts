// Audio cache utilities

/**
 * Simple string hash function for cache keys
 * @param str - String to hash
 * @returns Numeric hash
 */
export const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generate cache key from text and voiceId
 * @param text - Text content
 * @param voiceId - Voice ID
 * @returns Cache key string
 */
export const generateAudioCacheKey = (text: string, voiceId: string): string => {
  return `audio_${hashString(text + voiceId)}`;
};

/**
 * LRU Cache for audio blobs
 */
export class AudioLRUCache {
  private cache: Map<string, { blobUrl: string; size: number; timestamp: number }>;
  private maxSize: number; // Max size in bytes (~10MB)
  private maxEntries: number; // Max number of files (20)
  private currentSize: number;

  constructor(maxSize: number = 10 * 1024 * 1024, maxEntries: number = 20) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
    this.currentSize = 0;
  }

  /**
   * Get item from cache
   */
  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Update timestamp for LRU
    item.timestamp = Date.now();
    this.cache.set(key, item);

    return item.blobUrl;
  }

  /**
   * Set item in cache
   * @param key - Cache key
   * @param blobUrl - Blob URL
   * @param size - Approximate size in bytes
   */
  set(key: string, blobUrl: string, size: number = 50000): void {
    // Check if already exists
    if (this.cache.has(key)) {
      return; // Already cached
    }

    // Evict if necessary
    while (
      this.currentSize + size > this.maxSize ||
      this.cache.size >= this.maxEntries
    ) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      blobUrl,
      size,
      timestamp: Date.now(),
    });
    this.currentSize += size;

    console.log(
      `[Audio Cache] Cached ${key}, size: ${(size / 1024).toFixed(1)}KB, total: ${(
        this.currentSize /
        1024 /
        1024
      ).toFixed(2)}MB (${this.cache.size}/${this.maxEntries} files)`
    );
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    // Find oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      if (item) {
        // Revoke blob URL to free memory
        URL.revokeObjectURL(item.blobUrl);
        this.currentSize -= item.size;
        this.cache.delete(oldestKey);

        console.log(
          `[Audio Cache] Evicted ${oldestKey}, freed ${(item.size / 1024).toFixed(1)}KB`
        );
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Revoke all blob URLs
    for (const item of this.cache.values()) {
      URL.revokeObjectURL(item.blobUrl);
    }

    this.cache.clear();
    this.currentSize = 0;

    console.log('[Audio Cache] Cleared all entries');
  }

  /**
   * Get cache size in bytes
   */
  get size(): number {
    return this.currentSize;
  }

  /**
   * Get number of cached items
   */
  get count(): number {
    return this.cache.size;
  }
}
