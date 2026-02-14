// Hook for managing HeyGen avatar lifecycle
import { useState, useEffect, useRef, useCallback } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents } from '@heygen/streaming-avatar';
import type { HeygenAvatarConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UseHeygenAvatarOptions {
  agentId: string;
  avatarId?: string;
  heygenConfig?: HeygenAvatarConfig;
  autoInit?: boolean;
}

interface UseHeygenAvatarReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  initialize: () => Promise<void>;
  speak: (text: string, audioUrl?: string) => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
}

/**
 * Hook for managing HeyGen avatar lifecycle
 * Handles initialization, speaking, and cleanup of HeyGen streaming avatars
 */
export function useHeygenAvatar(options: UseHeygenAvatarOptions): UseHeygenAvatarReturn {
  const { agentId, avatarId, heygenConfig, autoInit = false } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  /**
   * Initialize HeyGen avatar session
   */
  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) {
      console.log(`[HeyGen Avatar ${agentId}] Already initialized or loading`);
      return;
    }

    if (!avatarId && !heygenConfig?.avatarId) {
      const err = new Error('Avatar ID not configured');
      setError(err);
      console.error(`[HeyGen Avatar ${agentId}]`, err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[HeyGen Avatar ${agentId}] Initializing...`);

      // 1. Get session token from backend
      // This token authorizes the frontend SDK to create avatar sessions
      const response = await fetch(`${API_URL}/api/heygen/avatar/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create HeyGen session');
      }

      const data = await response.json();
      sessionTokenRef.current = data.data.token;

      // 2. Initialize streaming avatar SDK
      const avatar = new StreamingAvatar({ token: sessionTokenRef.current });
      avatarRef.current = avatar;

      // 3. Set up event listeners
      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log(`[HeyGen Avatar ${agentId}] Started talking`);
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log(`[HeyGen Avatar ${agentId}] Stopped talking`);
      });

      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(`[HeyGen Avatar ${agentId}] Stream ready`);
        if (event.stream && videoRef.current) {
          videoRef.current.srcObject = event.stream;
          setStream(event.stream);
        }
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log(`[HeyGen Avatar ${agentId}] Stream disconnected`);
        setStream(null);
        setIsInitialized(false);
      });

      // 4. Create avatar session
      await avatar.createStartAvatar({
        avatarName: avatarId || heygenConfig?.avatarId || '',
        quality: AvatarQuality.Medium,
        voice: {
          rate: 1.0,
          emotion: 'Friendly',
        },
      });

      setIsInitialized(true);
      console.log(`[HeyGen Avatar ${agentId}] Initialized successfully`);
    } catch (err: any) {
      console.error(`[HeyGen Avatar ${agentId}] Initialization failed:`, err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, avatarId, heygenConfig, isInitialized, isLoading]);

  /**
   * Make avatar speak with audio input for lip-sync
   */
  const speak = useCallback(
    async (text: string, audioUrl?: string) => {
      if (!avatarRef.current || !isInitialized) {
        console.warn(`[HeyGen Avatar ${agentId}] Cannot speak - not initialized`);
        return;
      }

      try {
        console.log(`[HeyGen Avatar ${agentId}] Speaking...`);

        if (audioUrl) {
          // Use audio input for lip-sync with ElevenLabs audio
          await avatarRef.current.speak({
            text,
            audioInput: audioUrl,
          });
        } else {
          // Use text-only (HeyGen will generate audio)
          await avatarRef.current.speak({ text });
        }
      } catch (err: any) {
        console.error(`[HeyGen Avatar ${agentId}] Speak failed:`, err);
        setError(err);
      }
    },
    [agentId, isInitialized]
  );

  /**
   * Stop current speaking
   */
  const stop = useCallback(async () => {
    if (!avatarRef.current) {
      return;
    }

    try {
      await avatarRef.current.interrupt();
      console.log(`[HeyGen Avatar ${agentId}] Stopped speaking`);
    } catch (err: any) {
      console.error(`[HeyGen Avatar ${agentId}] Stop failed:`, err);
    }
  }, [agentId]);

  /**
   * Destroy avatar session and clean up resources
   */
  const destroy = useCallback(async () => {
    if (!avatarRef.current) {
      return;
    }

    try {
      console.log(`[HeyGen Avatar ${agentId}] Destroying...`);
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
      sessionTokenRef.current = null;
      setStream(null);
      setIsInitialized(false);
      setError(null);
      console.log(`[HeyGen Avatar ${agentId}] Destroyed`);
    } catch (err: any) {
      console.error(`[HeyGen Avatar ${agentId}] Destroy failed:`, err);
    }
  }, [agentId]);

  /**
   * Auto-initialize if enabled
   */
  useEffect(() => {
    if (autoInit && !isInitialized && !isLoading) {
      initialize();
    }
  }, [autoInit, isInitialized, isLoading, initialize]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    stream,
    videoRef,
    initialize,
    speak,
    stop,
    destroy,
  };
}
