import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface AnimatedBubbleProps {
  name: string;
  color: string;
  size?: number; // Size in pixels
  isActive?: boolean;
  onClick?: () => void;
}

export default function AnimatedBubble({
  name,
  color,
  size = 96,
  isActive = false,
  onClick,
}: AnimatedBubbleProps) {
  // Calculate initials (reused from AgentAvatar)
  const initials = useMemo(() => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  // Convert hex color to RGB for shadow
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '139, 92, 246'; // Fallback purple
  };

  const colorRgb = useMemo(() => hexToRgb(color), [color]);

  // Responsive font size based on bubble size
  const fontSize = Math.floor(size * 0.35);

  // Animation variants for gentle pulse
  const bubbleVariants = {
    idle: {
      scale: 1,
      boxShadow: `0 4px 16px rgba(0, 0, 0, 0.08)`,
    },
    speaking: {
      scale: [1, 1.05, 1.02, 1.05, 1],
      boxShadow: [
        `0 4px 16px rgba(0, 0, 0, 0.08)`,
        `0 0 40px rgba(140, 21, 21, 0.4), 0 8px 24px rgba(0, 0, 0, 0.12)`,
        `0 0 50px rgba(140, 21, 21, 0.5), 0 10px 28px rgba(0, 0, 0, 0.14)`,
        `0 0 40px rgba(140, 21, 21, 0.4), 0 8px 24px rgba(0, 0, 0, 0.12)`,
        `0 4px 16px rgba(0, 0, 0, 0.08)`,
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  // Ripple animation for active speaking
  const rippleVariants = {
    hidden: { scale: 1, opacity: 0 },
    visible: (delay: number) => ({
      scale: 1.6,
      opacity: [0.4, 0],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        delay,
        ease: 'easeOut',
      },
    }),
  };

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      {/* Ripple rings container */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: size * 2, height: size * 2 }}
      >
        {/* SVG Ripple Rings - only show when active and motion not reduced */}
        {isActive && !prefersReducedMotion && (
          <svg
            className="absolute inset-0"
            width={size * 2}
            height={size * 2}
            style={{ overflow: 'visible' }}
          >
            {[0, 0.3, 0.6].map((delay, index) => (
              <motion.circle
                key={index}
                cx={size}
                cy={size}
                r={size / 2}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={3}
                variants={rippleVariants}
                initial="hidden"
                animate={isActive ? 'visible' : 'hidden'}
                custom={delay}
              />
            ))}
          </svg>
        )}

        {/* Main bubble */}
        <motion.div
          className={`rounded-full flex items-center justify-center font-bold shadow-lg ${
            onClick ? 'cursor-pointer' : ''
          }`}
          style={{
            width: size,
            height: size,
            backgroundColor: '#FFFFFF',
            fontSize: `${fontSize}px`,
            color: color,
            border: isActive ? `3px solid var(--color-accent)` : '1px solid rgba(0, 0, 0, 0.06)',
            fontFamily: 'var(--font-serif)',
          }}
          onClick={onClick}
          whileHover={onClick ? { scale: 1.1 } : {}}
          whileTap={onClick ? { scale: 0.95 } : {}}
          variants={bubbleVariants}
          animate={isActive && !prefersReducedMotion ? 'speaking' : 'idle'}
          aria-label={`${name}${isActive ? ' - currently speaking' : ''}`}
          role="img"
        >
          {initials}
        </motion.div>
      </div>

      {/* Name label below bubble */}
      <motion.span
        style={{ fontFamily: 'var(--font-sans)' }}
        className="text-sm font-medium text-[var(--color-text-primary)] text-center max-w-[140px] truncate px-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        title={name}
      >
        {name}
      </motion.span>
    </div>
  );
}
