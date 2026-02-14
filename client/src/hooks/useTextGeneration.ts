// Text generation hook - fetches AI-generated text from server
import { useState, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { Turn } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TextGenerationResponse {
  content: string;
  voiceId: string;
  speakerName: string;
  returnToUser?: boolean; // Only present for agent responses
}

/**
 * Hook for fetching AI-generated text with caching and retry logic
 */
export const useTextGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    currentPhase,
    turns,
    getCachedText,
    cacheText,
    clearTextCache,
    userReturnCounter,
  } = useConversationStore();

  /**
   * Request text generation for a specific speaker
   * @param speakerIndex - Index of the speaker to generate text for
   * @returns Object with generated text content and returnToUser flag (for agents)
   */
  const requestText = useCallback(
    async (speakerIndex: number): Promise<{ content: string; returnToUser?: boolean }> => {
      console.log('[Text Generation] ========================================');
      console.log('[Text Generation] 📝 REQUESTING TEXT GENERATION');
      console.log('[Text Generation] ========================================');
      console.log('[Text Generation] Speaker Index:', speakerIndex);

      // Get fresh sessionId and speakerIndices from store to avoid stale closure issues
      const currentSessionId = useConversationStore.getState().sessionId;
      const currentSpeakerIndices = useConversationStore.getState().speakerIndices;

      if (!currentSessionId) {
        console.error('[Text Generation] ❌ No active session found');
        throw new Error('No active session');
      }
      console.log('[Text Generation] Session ID:', currentSessionId);

      const speaker = currentSpeakerIndices.find((s) => s.index === speakerIndex);
      if (!speaker) {
        console.error('[Text Generation] ❌ Speaker not found at index', speakerIndex);
        console.error('[Text Generation] Available speakers:', currentSpeakerIndices.map(s => `${s.index}:${s.name}`).join(', '));
        throw new Error(`Speaker at index ${speakerIndex} not found`);
      }

      console.log('[Text Generation] Speaker:', speaker.name, `(${speaker.type})`);
      console.log('[Text Generation] Agent ID:', speaker.agentId || 'N/A');

      setIsLoading(true);
      setError(null);

      try {
        // Get last 10 turns for context
        const conversationHistory = turns.slice(-10);
        console.log('[Text Generation] Conversation context: Last', conversationHistory.length, 'turns');
        console.log('[Text Generation] Current phase:', currentPhase);

        // Determine endpoint based on speaker type
        let endpoint: string;
        let requestBody: any;

        if (speaker.type === 'moderator') {
          // Use AI Moderator endpoint
          endpoint = `${API_URL}/api/ai-moderator/generate-response`;
          requestBody = {
            sessionId: currentSessionId,
            conversationHistory,
            currentPhase,
          };
          console.log('[Text Generation] 🎯 Using moderator endpoint');
        } else if (speaker.type === 'agent') {
          // Use AI Patients endpoint
          // Get fresh userReturnCounter from store
          const currentUserReturnCounter = useConversationStore.getState().userReturnCounter;
          endpoint = `${API_URL}/api/ai-patients/generate-response`;
          requestBody = {
            sessionId: currentSessionId,
            agentId: speaker.agentId,
            conversationHistory,
            currentPhase,
            userReturnCounter: currentUserReturnCounter,
          };
          console.log('[Text Generation] 🤖 Using agent endpoint for agent:', speaker.agentId);
          console.log('[Text Generation] User return counter:', currentUserReturnCounter);
        } else {
          console.error('[Text Generation] ❌ Cannot generate text for user speaker');
          throw new Error('Cannot generate text for user speaker');
        }

        console.log('[Text Generation] 🌐 Sending request to:', endpoint);
        console.log('[Text Generation] Request body:', {
          ...requestBody,
          conversationHistory: `${requestBody.conversationHistory.length} turns`
        });

        // Use retry logic for resilience
        const startTime = Date.now();
        let retryCount = 0;
        const response = await retryWithBackoff<TextGenerationResponse>(async () => {
          retryCount++;
          if (retryCount > 1) {
            console.log(`[Text Generation] ⏱️ Retry attempt ${retryCount} of 3...`);
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error('[Text Generation] ❌ Server error:', errorData);
            throw new Error(errorData.error || 'Failed to generate text');
          }

          const data = await res.json();
          return data.data as TextGenerationResponse;
        }, 3, 1000); // 3 retries, starting at 1 second

        const elapsed = Date.now() - startTime;
        const { content, returnToUser } = response;

        console.log(`[Text Generation] ✅ Text generated successfully in ${elapsed}ms`);
        console.log(`[Text Generation] Content length: ${content.length} characters`);
        console.log(`[Text Generation] Content preview: "${content.substring(0, 150)}${content.length > 150 ? '...' : ''}"`);
        if (returnToUser !== undefined) {
          console.log(`[Text Generation] Return to user: ${returnToUser}`);
        }

        // Cache the generated text
        console.log('[Text Generation] 💾 Caching generated text for index', speakerIndex);
        cacheText(speakerIndex, content);

        setIsLoading(false);
        console.log('[Text Generation] ========================================');
        return { content, returnToUser };
      } catch (err) {
        const error = err as Error;
        console.error('[Text Generation] ========================================');
        console.error('[Text Generation] ❌ TEXT GENERATION FAILED');
        console.error('[Text Generation] ========================================');
        console.error('[Text Generation] Error message:', error.message);
        console.error('[Text Generation] Stack trace:', error.stack);
        setError(error);
        setIsLoading(false);
        throw error;
      }
    },
    [currentPhase, turns, cacheText]
  );

  /**
   * Pre-compute text for a speaker in the background (non-blocking)
   * @param speakerIndex - Index of the speaker to pre-compute text for
   */
  const preComputeText = useCallback(
    (speakerIndex: number): void => {
      console.log('[Text Generation] 🚀 PRE-COMPUTE REQUEST for speaker index:', speakerIndex);

      // Don't pre-compute if already cached
      const cached = getCachedText(speakerIndex);
      if (cached) {
        console.log(`[Text Generation] ⏭️ Text already cached for speaker ${speakerIndex}, skipping pre-computation`);
        console.log(`[Text Generation] Cached text preview: "${cached.substring(0, 100)}..."`);
        return;
      }

      // Get fresh speakerIndices from store to avoid stale closure issues
      const currentSpeakerIndices = useConversationStore.getState().speakerIndices;

      // Don't pre-compute for user
      const speaker = currentSpeakerIndices.find((s) => s.index === speakerIndex);
      if (!speaker) {
        console.warn(`[Text Generation] ⚠️ Speaker not found at index ${speakerIndex}`);
        return;
      }

      if (speaker.type === 'user') {
        console.log(`[Text Generation] ⏭️ Speaker is user, skipping pre-computation`);
        return;
      }

      console.log(`[Text Generation] ▶️ Starting background pre-computation for ${speaker.name} (${speaker.type})`);

      // Run in background (fire and forget)
      requestText(speakerIndex).catch((err) => {
        console.error('[Text Generation] ❌ Pre-computation failed for', speaker.name, ':', err);
        // Don't throw - this is background work
      });
    },
    [getCachedText, requestText]
  );

  /**
   * Get cached text for a speaker (returns null if not cached)
   */
  const getTextFromCache = useCallback(
    (speakerIndex: number): string | null => {
      return getCachedText(speakerIndex);
    },
    [getCachedText]
  );

  /**
   * Clear all cached text (called when user speaks to invalidate pre-computed text)
   */
  const clearCache = useCallback(() => {
    console.log('[Text Generation] Clearing text cache');
    clearTextCache();
  }, [clearTextCache]);

  return {
    requestText,
    preComputeText,
    getCachedText: getTextFromCache,
    clearCache,
    isLoading,
    error,
  };
};
