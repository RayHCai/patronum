// Grid layout for multiple video avatars - Zoom-style
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import AvatarVideoPlayer from './AvatarVideoPlayer';
import AnimatedBubble from './AnimatedBubble';
import type { Agent, HeygenAvatarConfig } from '../../types';

interface VideoAvatarGridProps {
  agents: Agent[];
  participantName?: string;
  currentSpeakerId: string | null;
  moderator?: {
    id: string;
    name: string;
    color: string;
    heygenConfig?: HeygenAvatarConfig;
  };
}

export default function VideoAvatarGrid({
  agents,
  participantName = 'You',
  currentSpeakerId,
  moderator,
}: VideoAvatarGridProps) {
  // Calculate total participants - always display in a single row
  const totalParticipants = useMemo(() => {
    return agents.length + (moderator ? 1 : 0) + 1; // agents + moderator + participant
  }, [agents.length, moderator]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="flex items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >

        {/* Moderator */}
        {moderator && (() => {
            // Check if moderator has a valid heygenConfig
            const hasValidConfig = moderator.heygenConfig &&
              moderator.heygenConfig.avatarId &&
              moderator.heygenConfig.avatarId.trim().length > 0;

            return (
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="relative">
                  {hasValidConfig ? (
                    <AvatarVideoPlayer
                      agentId={moderator.id}
                      name={moderator.name}
                      heygenConfig={moderator.heygenConfig}
                      isActive={currentSpeakerId === moderator.id}
                      fallbackColor={moderator.color}
                      size={140}
                      voiceId="moderator_voice"
                    />
                  ) : (
                    <AnimatedBubble
                      name={moderator.name}
                      color={moderator.color}
                      size={140}
                      isActive={currentSpeakerId === moderator.id}
                    />
                  )}
                </div>
              </motion.div>
            );
        })()}

        {/* Agents */}
        {agents.map((agent, index) => {
            console.log(`[VideoAvatarGrid] Agent ${index + 1}:`, {
              id: agent.id,
              name: agent.name,
              heygenAvatarId: agent.heygenAvatarId,
              hasHeygenConfig: !!agent.heygenConfig,
              heygenConfigType: typeof agent.heygenConfig,
              heygenConfigAvatarId: agent.heygenConfig?.avatarId,
            });

            // Create a basic heygenConfig if agent has heygenAvatarId but no full config
            const heygenConfig = agent.heygenConfig || (agent.heygenAvatarId ? {
              avatarId: agent.heygenAvatarId,
              appearance: {
                gender: 'male',
                ethnicity: 'caucasian',
                age: 30,
                clothing: 'casual',
                background: 'neutral'
              },
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString()
            } : undefined);

            console.log(`[VideoAvatarGrid] Using heygenConfig for ${agent.name}:`, {
              hasConfig: !!heygenConfig,
              avatarId: heygenConfig?.avatarId,
            });

          return (
            <motion.div
              key={agent.id}
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.1 + (index + 1) * 0.08,
                duration: 0.4,
                type: 'spring',
                stiffness: 150,
              }}
            >
              <div className="relative">
                <AvatarVideoPlayer
                  agentId={agent.id}
                  name={agent.name}
                  heygenConfig={heygenConfig}
                  isActive={currentSpeakerId === agent.id}
                  fallbackColor={agent.avatarColor}
                  size={140}
                  voiceId={agent.voiceId}
                />
              </div>
            </motion.div>
          );
        })}

        {/* Participant (You) */}
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + (agents.length + 1) * 0.08, duration: 0.4 }}
        >
          <div className="relative">
            <AnimatedBubble
              name={participantName}
              color="#3B82F6"
              size={140}
              isActive={currentSpeakerId === 'participant'}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Background gradient for depth */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(circle at center, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
