// Grid layout for multiple video avatars
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
  // Calculate agent positions in circular arc (same as BubbleVisualization)
  const agentPositions = useMemo(() => {
    const positions: Array<{ x: number; y: number; agent: Agent }> = [];
    const totalAgents = agents.length;

    if (totalAgents === 0) return positions;

    // Arc parameters (responsive)
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const baseRadius = Math.min(300, viewportWidth * 0.28);

    // Adjust arc spread based on number of agents
    const arcSpread = Math.min(0.6, 0.3 + totalAgents * 0.05);
    const startAngle = Math.PI * (0.5 - arcSpread / 2);
    const endAngle = Math.PI * (0.5 + arcSpread / 2);

    // Distribute agents evenly along the arc
    const angleStep = totalAgents > 1 ? (endAngle - startAngle) / (totalAgents - 1) : 0;

    agents.forEach((agent, index) => {
      const angle = startAngle + index * angleStep;
      const x = Math.cos(angle) * baseRadius;
      const y = Math.sin(angle) * baseRadius * 0.5; // Flatten arc vertically

      positions.push({ x, y, agent });
    });

    return positions;
  }, [agents]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Container for all avatars */}
      <motion.div
        className="relative"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Moderator - Top center */}
        {moderator && (
          <motion.div
            className="absolute z-10"
            style={{
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {moderator.heygenConfig ? (
              <AvatarVideoPlayer
                agentId={moderator.id}
                name={moderator.name}
                heygenConfig={moderator.heygenConfig}
                isActive={currentSpeakerId === moderator.id}
                fallbackColor={moderator.color}
                size={96}
              />
            ) : (
              <AnimatedBubble
                name={moderator.name}
                color={moderator.color}
                size={96}
                isActive={currentSpeakerId === moderator.id}
              />
            )}
          </motion.div>
        )}

        {/* Agent avatars - Arranged in circular arc */}
        <div
          className="absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {agentPositions.map(({ x, y, agent }, index) => (
            <motion.div
              key={agent.id}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.2 + index * 0.1,
                duration: 0.5,
                type: 'spring',
                stiffness: 200,
              }}
            >
              <AvatarVideoPlayer
                agentId={agent.id}
                name={agent.name}
                heygenConfig={agent.heygenConfig}
                isActive={currentSpeakerId === agent.id}
                fallbackColor={agent.avatarColor}
                size={96}
              />
            </motion.div>
          ))}
        </div>

        {/* Participant - Bottom center (larger, no video) */}
        <motion.div
          className="absolute"
          style={{
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <AnimatedBubble
            name={participantName}
            color="#3B82F6"
            size={120}
            isActive={currentSpeakerId === 'participant'}
          />
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
