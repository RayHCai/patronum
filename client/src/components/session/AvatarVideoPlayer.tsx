// Individual avatar video player component with HeyGen integration
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHeygenAvatar } from '../../hooks/useHeygenAvatar';
import { useConversationStore } from '../../stores/conversationStore';
import { avatarManager } from '../../services/avatarManager';
import AnimatedBubble from './AnimatedBubble';
import type { HeygenAvatarConfig } from '../../types';

interface AvatarVideoPlayerProps {
  agentId: string;
  name: string;
  heygenConfig?: HeygenAvatarConfig;
  isActive: boolean;
  fallbackColor: string;
  size?: number;
  onVideoReady?: () => void;
  onVideoError?: (error: Error) => void;
}

export default function AvatarVideoPlayer({
  agentId,
  name,
  heygenConfig,
  isActive,
  fallbackColor,
  size = 120,
  onVideoReady,
  onVideoError,
}: AvatarVideoPlayerProps) {
  const store = useConversationStore();
  const activeStreams = store.activeVideoStreams;
  const isStreamActive = activeStreams.has(agentId);

  // Only initialize HeyGen if stream is marked as active in store
  const {
    isInitialized,
    isLoading,
    error,
    stream,
    videoRef,
    initialize,
    speak,
    stop,
  } = useHeygenAvatar({
    agentId,
    avatarId: heygenConfig?.avatarId,
    heygenConfig,
    autoInit: false, // Manual initialization via store
  });

  // Update store loading state
  useEffect(() => {
    store.setVideoLoading(agentId, isLoading);
  }, [isLoading, agentId]);

  // Update store error state
  useEffect(() => {
    store.setVideoError(agentId, error);
    if (error && onVideoError) {
      onVideoError(error);
    }
  }, [error, agentId, onVideoError]);

  // Update store initialized state
  useEffect(() => {
    store.setVideoInitialized(agentId, isInitialized);
  }, [isInitialized, agentId]);

  // Notify when video is ready
  useEffect(() => {
    if (isInitialized && stream && onVideoReady) {
      onVideoReady();
    }
  }, [isInitialized, stream, onVideoReady]);

  // Initialize when stream becomes active
  useEffect(() => {
    // Only initialize if we have a valid heygenConfig with avatarId
    const hasValidConfig = heygenConfig && heygenConfig.avatarId && heygenConfig.avatarId.trim().length > 0;

    if (isStreamActive && !isInitialized && !isLoading && !error && hasValidConfig) {
      console.log(`[AvatarVideoPlayer] Initializing video for ${name}`);
      initialize();
    } else if (isStreamActive && !hasValidConfig) {
      console.warn(`[AvatarVideoPlayer] Stream marked active for ${name} but no valid HeyGen config - skipping initialization`);
      // Mark as initialized (with error) to prevent infinite loops
      store.setVideoInitialized(agentId, false);
    }
  }, [isStreamActive, isInitialized, isLoading, error, initialize, name, heygenConfig, agentId, store]);

  // Register with avatar manager when initialized
  useEffect(() => {
    if (isInitialized) {
      avatarManager.register(agentId, { agentId, speak, stop });
      return () => {
        avatarManager.unregister(agentId);
      };
    }
  }, [isInitialized, agentId, speak, stop]);

  // Decide whether to show video or fallback bubble
  const showVideo = isInitialized && stream && !error;
  const showBubble = !heygenConfig || error || !isStreamActive || !isInitialized;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{
        duration: 0.3,
        type: 'spring',
        stiffness: 200,
      }}
    >
      {/* Video Element */}
      {showVideo && (
        <div className="relative w-full h-full rounded-full overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
            style={{
              transform: 'scaleX(-1)', // Mirror video for natural appearance
            }}
          />

          {/* Active Speaker Ring */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-400"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1, 0.95],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Name Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="text-white text-sm font-medium text-center truncate">
              {name}
            </p>
          </div>
        </div>
      )}

      {/* Fallback: Animated Bubble */}
      {showBubble && (
        <div className="relative">
          <AnimatedBubble
            name={name}
            color={fallbackColor}
            size={size}
            isActive={isActive}
          />

          {/* Loading Indicator */}
          {isLoading && isStreamActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error Indicator */}
          {error && (
            <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
              !
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
