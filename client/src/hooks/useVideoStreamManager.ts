// Hook for managing multiple HeyGen avatar streams with pooling
import { useCallback, useRef } from 'react';
import { useConversationStore } from '../stores/conversationStore';

const MAX_ACTIVE_STREAMS = 3; // Keep only 3 most recent speakers' streams alive

interface StreamInfo {
  agentId: string;
  lastUsed: number;
}

/**
 * Hook for managing multiple video avatar streams
 * Implements recent-speaker pooling strategy to optimize bandwidth
 */
export function useVideoStreamManager() {
  const store = useConversationStore();
  const activeStreamsRef = useRef<Map<string, StreamInfo>>(new Map());

  /**
   * Initialize a video stream for an agent
   * Manages pooling: destroys oldest stream if we exceed MAX_ACTIVE_STREAMS
   */
  const initializeStream = useCallback(
    async (agentId: string) => {
      console.log(`[Video Stream Manager] Initializing stream for agent ${agentId}`);

      // Update last used timestamp
      activeStreamsRef.current.set(agentId, {
        agentId,
        lastUsed: Date.now(),
      });

      // Check if we need to destroy old streams
      if (activeStreamsRef.current.size > MAX_ACTIVE_STREAMS) {
        // Find oldest stream
        let oldestAgentId: string | null = null;
        let oldestTimestamp = Infinity;

        for (const [id, info] of activeStreamsRef.current.entries()) {
          if (info.lastUsed < oldestTimestamp) {
            oldestTimestamp = info.lastUsed;
            oldestAgentId = id;
          }
        }

        if (oldestAgentId && oldestAgentId !== agentId) {
          console.log(`[Video Stream Manager] Destroying oldest stream: ${oldestAgentId}`);
          await destroyStream(oldestAgentId);
        }
      }

      // Update store
      store.initializeAvatarVideo(agentId);
    },
    [store]
  );

  /**
   * Destroy a video stream for an agent
   */
  const destroyStream = useCallback(
    async (agentId: string) => {
      console.log(`[Video Stream Manager] Destroying stream for agent ${agentId}`);

      activeStreamsRef.current.delete(agentId);
      store.destroyAvatarVideo(agentId);
    },
    [store]
  );

  /**
   * Update last used timestamp for a stream
   * Call this when an agent speaks to keep their stream alive
   */
  const touchStream = useCallback((agentId: string) => {
    const streamInfo = activeStreamsRef.current.get(agentId);
    if (streamInfo) {
      streamInfo.lastUsed = Date.now();
      activeStreamsRef.current.set(agentId, streamInfo);
      console.log(`[Video Stream Manager] Touched stream for agent ${agentId}`);
    }
  }, []);

  /**
   * Check if a stream is active
   */
  const isStreamActive = useCallback((agentId: string): boolean => {
    return activeStreamsRef.current.has(agentId);
  }, []);

  /**
   * Get list of active stream agent IDs
   */
  const getActiveStreams = useCallback((): string[] => {
    return Array.from(activeStreamsRef.current.keys());
  }, []);

  /**
   * Destroy all streams (cleanup)
   */
  const destroyAllStreams = useCallback(async () => {
    console.log('[Video Stream Manager] Destroying all streams');

    for (const agentId of activeStreamsRef.current.keys()) {
      await destroyStream(agentId);
    }

    activeStreamsRef.current.clear();
  }, [destroyStream]);

  /**
   * Pre-initialize stream for next speaker (optimization)
   */
  const preInitializeStream = useCallback(
    async (agentId: string) => {
      if (isStreamActive(agentId)) {
        // Already initialized, just touch it
        touchStream(agentId);
        return;
      }

      console.log(`[Video Stream Manager] Pre-initializing stream for agent ${agentId}`);
      await initializeStream(agentId);
    },
    [isStreamActive, touchStream, initializeStream]
  );

  return {
    initializeStream,
    destroyStream,
    touchStream,
    isStreamActive,
    getActiveStreams,
    destroyAllStreams,
    preInitializeStream,
  };
}
