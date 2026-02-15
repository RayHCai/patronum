import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface FloatingSubtitleProps {
  speaker: string;
  text: string;
  color: string;
  isVisible: boolean;
}

export default function FloatingSubtitle({
  speaker,
  text,
  color,
  isVisible,
}: FloatingSubtitleProps) {
  // Split text into words for animation
  const words = useMemo(() => {
    const allWords = text.split(' ');
    // Only show the last 15 words
    if (allWords.length > 15) {
      return ['...', ...allWords.slice(-15)];
    }
    return allWords;
  }, [text]);

  // Get initials for mini avatar
  const initials = useMemo(() => {
    return speaker
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [speaker]);

  // Check for reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed left-0 right-0 z-30 flex items-center justify-center px-8"
          style={{ bottom: '120px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Subtitle container */}
          <div
            className="flex items-center gap-4 px-8 py-6 rounded-2xl shadow-xl border"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderColor: 'var(--color-border)',
              maxWidth: '600px',
              width: '100%',
            }}
          >
            {/* Mini speaker avatar */}
            <motion.div
              className="flex-shrink-0 rounded-full flex items-center justify-center font-bold shadow-md border"
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#FFFFFF',
                color: color,
                borderColor: speaker === 'You' ? '#3B82F6' : 'var(--color-accent)',
                fontSize: '16px',
                fontFamily: 'var(--font-serif)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {initials}
            </motion.div>

            {/* Speaker name and text */}
            <div className="flex-1 min-w-0">
              {/* Speaker name */}
              <motion.div
                className="font-semibold mb-2"
                style={{
                  color: speaker === 'You' ? '#3B82F6' : 'var(--color-accent)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-serif)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {speaker}
              </motion.div>

              {/* Streaming text with word-by-word animation */}
              <div
                className="leading-relaxed break-words"
                style={{
                  fontSize: '17px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}
                role="status"
                aria-live="polite"
                aria-atomic="false"
              >
                {prefersReducedMotion ? (
                  // No animation for reduced motion
                  <span>{text}</span>
                ) : (
                  // Word-by-word reveal animation
                  words.map((word, index) => (
                    <motion.span
                      key={`${word}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.2,
                        ease: 'easeOut',
                      }}
                      style={{ display: 'inline-block', marginRight: '0.3em' }}
                    >
                      {word}
                    </motion.span>
                  ))
                )}
              </div>
            </div>

            {/* Visual indicator - pulsing dot */}
            <motion.div
              className="flex-shrink-0 rounded-full"
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: speaker === 'You' ? '#3B82F6' : 'var(--color-accent)',
              }}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7],
                  }
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
