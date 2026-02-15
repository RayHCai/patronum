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
  voiceId?: string; // ElevenLabs voice ID for hybrid audio (11Labs + HeyGen)
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
  voiceId,
  onVideoReady,
  onVideoError,
}: AvatarVideoPlayerProps) {
  // Use selectors to avoid subscribing to everything and to get stable action references
  const activeStreams = useConversationStore(state => state.activeVideoStreams);
  const setVideoLoading = useConversationStore(state => state.setVideoLoading);
  const setVideoError = useConversationStore(state => state.setVideoError);
  const setVideoInitialized = useConversationStore(state => state.setVideoInitialized);

  const isStreamActive = activeStreams.has(agentId);

  console.log(`[AvatarVideoPlayer] ${name} - Stream status:`, {
    isStreamActive,
    agentId,
    hasHeygenConfig: !!heygenConfig,
    avatarId: heygenConfig?.avatarId,
    activeStreamsSize: activeStreams.size,
  });

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
    setVideoLoading(agentId, isLoading);
  }, [isLoading, agentId, setVideoLoading]);

  // Update store error state
  useEffect(() => {
    setVideoError(agentId, error);
    if (error && onVideoError) {
      onVideoError(error);
    }
  }, [error, agentId, onVideoError, setVideoError]);

  // Update store initialized state
  useEffect(() => {
    setVideoInitialized(agentId, isInitialized);
  }, [isInitialized, agentId, setVideoInitialized]);

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

    console.log(`[AvatarVideoPlayer] ${name} - Initialization check:`, {
      isStreamActive,
      isInitialized,
      isLoading,
      hasError: !!error,
      hasValidConfig,
      willInitialize: isStreamActive && !isInitialized && !isLoading && !error && hasValidConfig,
    });

    if (isStreamActive && !isInitialized && !isLoading && !error && hasValidConfig) {
      console.log(`[AvatarVideoPlayer] ✅ Initializing video for ${name}`);
      initialize();
    } else if (isStreamActive && !hasValidConfig) {
      console.warn(`[AvatarVideoPlayer] ⚠️ Stream marked active for ${name} but no valid HeyGen config - skipping initialization`);
      setVideoInitialized(agentId, false);
    } else if (!isStreamActive) {
      console.log(`[AvatarVideoPlayer] ⏸️ ${name} - Stream not active yet, waiting...`);
    }
  }, [isStreamActive, isInitialized, isLoading, error, initialize, name, heygenConfig, agentId, setVideoInitialized]);

  // Register with avatar manager when initialized (with voiceId for hybrid audio)
  useEffect(() => {
    if (isInitialized) {
      avatarManager.register(agentId, { agentId, speak, stop, voiceId });
      return () => {
        avatarManager.unregister(agentId);
      };
    }
  }, [isInitialized, agentId, speak, stop, voiceId]);

  // Decide whether to show video or fallback bubble
  const showVideo = isInitialized && stream && !error;
  const showBubble = !heygenConfig || error || !isStreamActive || !isInitialized;

  console.log(`[AvatarVideoPlayer] ${name} - Render decision:`, {
    isInitialized,
    hasStream: !!stream,
    hasError: !!error,
    showVideo,
    showBubble,
  });

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
      {/* Video Element - ALWAYS rendered so videoRef exists for HeyGen */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{ display: showVideo ? 'block' : 'none' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true}
          className="w-full h-full object-cover"
          style={{
            transform: 'scaleX(-1)', // Mirror video for natural appearance
          }}
        />

        {/* Active Speaker Ring */}
        {showVideo && isActive && (
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
