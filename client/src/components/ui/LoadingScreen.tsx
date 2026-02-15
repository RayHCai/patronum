import { motion } from 'framer-motion';
import NeuralBackground from '../auth/NeuralBackground';

export type LoadingMode = 'fullscreen' | 'inline' | 'card';
export type LoadingSize = 'small' | 'medium' | 'large';
export type BackgroundType = 'none' | 'dots' | 'neural';

interface LoadingScreenProps {
  /** Display mode - fullscreen, inline, or card */
  mode?: LoadingMode;
  /** Size of the spinner */
  size?: LoadingSize;
  /** Main loading message */
  message?: string;
  /** Optional subtitle message */
  subtitle?: string;
  /** Background type (only for fullscreen mode) - 'none', 'dots', or 'neural' */
  backgroundType?: BackgroundType;
  /** @deprecated Use backgroundType instead */
  showBackground?: boolean;
}

const sizeClasses = {
  small: 'h-8 w-8 border-2',
  medium: 'h-12 w-12 border-3',
  large: 'h-16 w-16 border-4',
};

const messageSizeClasses = {
  small: 'text-base',
  medium: 'text-xl',
  large: 'text-3xl',
};

const subtitleSizeClasses = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

export default function LoadingScreen({
  mode = 'fullscreen',
  size = 'large',
  message = 'Loading...',
  subtitle = 'This will just take a moment',
  backgroundType = 'dots',
  showBackground,
}: LoadingScreenProps) {
  // Handle deprecated showBackground prop
  const actualBackgroundType = showBackground !== undefined
    ? (showBackground ? 'dots' : 'none')
    : backgroundType;
  // Spinner component
  const Spinner = () => (
    <motion.div
      className={`inline-block animate-spin rounded-full border-[var(--color-accent)] border-t-transparent ${sizeClasses[size]}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    />
  );

  // Content component
  const Content = () => (
    <div className="text-center">
      <div className={`mb-${size === 'small' ? '4' : size === 'medium' ? '6' : '8'}`}>
        <Spinner />
      </div>
      {message && (
        <motion.h2
          style={{ fontFamily: 'var(--font-serif)' }}
          className={`${messageSizeClasses[size]} font-semibold text-[var(--color-text-primary)] mb-${size === 'small' ? '2' : '4'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {message}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p
          style={{ fontFamily: 'var(--font-sans)' }}
          className={`${subtitleSizeClasses[size]} text-[var(--color-text-secondary)]`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );

  // Fullscreen mode
  if (mode === 'fullscreen') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-bg-primary)] relative overflow-hidden">
        {/* Neural network background */}
        {actualBackgroundType === 'neural' && <NeuralBackground />}

        {/* Dot grid background */}
        {actualBackgroundType === 'dots' && (
          <div
            className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 0.5px, transparent 0.5px)',
              backgroundSize: '20px 20px',
            }}
          />
        )}
        <div className="relative z-10">
          <Content />
        </div>
      </div>
    );
  }

  // Card mode (with glassmorphism)
  if (mode === 'card') {
    return (
      <motion.div
        className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-[var(--color-border)] p-12 text-center max-w-md mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Content />
      </motion.div>
    );
  }

  // Inline mode
  return (
    <div className="flex items-center justify-center py-12">
      <Content />
    </div>
  );
}
