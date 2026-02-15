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
  // Calculate grid layout based on total participants
  const gridConfig = useMemo(() => {
    const totalParticipants = agents.length + (moderator ? 1 : 0) + 1; // agents + moderator + participant

    // Determine columns based on total participants (Zoom-like logic)
    let columns: number;
    if (totalParticipants <= 1) columns = 1;
    else if (totalParticipants === 2) columns = 2;
    // For 3 participants, use 3 columns to keep them in one symmetric row
    // unless strictly vertical preference, but horizontal is usually better for video calls
    else if (totalParticipants === 3) columns = 3;
    else if (totalParticipants === 4) columns = 2; // 2x2 grid
    else if (totalParticipants <= 6) columns = 3; // 3x2 grid
    else if (totalParticipants <= 9) columns = 3; // 3x3 grid
    else columns = 4;

    const rows = Math.ceil(totalParticipants / columns);

    return { columns, rows, totalParticipants };
  }, [agents.length, moderator]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
      <motion.div
        className="w-full h-full max-w-7xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Grid container - Zoom-like responsive grid */}
        <div
          className="grid gap-4 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
            gridAutoRows: '1fr',
          }}
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
        </div>
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
