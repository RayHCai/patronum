// Audio fetcher hook - fetches audio from server proxy with LRU caching
import { useState, useCallback, useRef, useEffect } from 'react';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { AudioLRUCache, generateAudioCacheKey } from '../utils/audioCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook for fetching audio with LRU caching and retry logic
 */
export const useAudioFetcher = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cacheSize, setCacheSize] = useState(0);

  // LRU cache instance (persists across renders)
  const cacheRef = useRef<AudioLRUCache>(new AudioLRUCache());

  // Update cache size state periodically
  useEffect(() => {
    setCacheSize(cacheRef.current.size);
  }, [isLoading]); // Update when loading state changes

  /**
   * Fetch audio from server proxy
   * @param text - Text to synthesize
   * @param voiceId - Voice ID to use
   * @returns Blob URL for audio
   */
  const fetchAudio = useCallback(
    async (text: string, voiceId: string): Promise<string> => {
      // Generate cache key
      const cacheKey = generateAudioCacheKey(text, voiceId);

      // Check cache first
      const cachedUrl = cacheRef.current.get(cacheKey);
      if (cachedUrl) {
        console.log(`[Audio Fetcher] Cache hit for ${cacheKey}`);
        return cachedUrl;
      }

      console.log(`[Audio Fetcher] Cache miss, fetching audio for ${cacheKey}`);
      setIsLoading(true);
      setError(null);

      try {
        // Use retry logic for resilience
        const audioBlob = await retryWithBackoff<Blob>(async () => {
          const response = await fetch(`${API_URL}/api/audio/synthesize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              voiceId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch audio');
          }

          // Get audio as blob
          const blob = await response.blob();
          return blob;
        }, 3, 1000); // 3 retries, starting at 1 second

        // Create blob URL
        const blobUrl = URL.createObjectURL(audioBlob);

        // Cache the audio
        cacheRef.current.set(cacheKey, blobUrl, audioBlob.size);
        setCacheSize(cacheRef.current.size);

        setIsLoading(false);
        return blobUrl;
      } catch (err) {
        const error = err as Error;
        console.error('[Audio Fetcher] Error:', error);
        setError(error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  /**
   * Pre-fetch audio in the background (non-blocking)
   * @param text - Text to synthesize
   * @param voiceId - Voice ID to use
   */
  const prefetchAudio = useCallback(
    (text: string, voiceId: string): void => {
      const cacheKey = generateAudioCacheKey(text, voiceId);

      // Don't pre-fetch if already cached
      if (cacheRef.current.has(cacheKey)) {
        console.log(`[Audio Fetcher] Audio already cached for ${cacheKey}`);
        return;
      }

      console.log(`[Audio Fetcher] Pre-fetching audio for ${cacheKey}`);

      // Run in background (fire and forget)
      fetchAudio(text, voiceId).catch((err) => {
        console.error('[Audio Fetcher] Pre-fetch failed:', err);
        // Don't throw - this is background work
      });
    },
    [fetchAudio]
  );

  /**
   * Get cached audio (returns null if not cached)
   */
  const getCachedAudio = useCallback((text: string, voiceId: string): string | null => {
    const cacheKey = generateAudioCacheKey(text, voiceId);
    return cacheRef.current.get(cacheKey);
  }, []);

  /**
   * Clear all cached audio
   */
  const clearCache = useCallback(() => {
    console.log('[Audio Fetcher] Clearing audio cache');
    cacheRef.current.clear();
    setCacheSize(0);
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      count: cacheRef.current.count,
      sizeMB: (cacheRef.current.size / 1024 / 1024).toFixed(2),
    };
  }, []);

  return {
    fetchAudio,
    prefetchAudio,
    getCachedAudio,
    clearCache,
    getCacheStats,
    cacheSize,
    isLoading,
    error,
  };
};
