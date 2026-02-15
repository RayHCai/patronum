// Microphone bar with automatic state visualization
import { motion } from 'framer-motion';
import { Mic, Square, RotateCcw, Check } from 'lucide-react';
import { MicState } from '../../types';

interface MicrophoneBarProps {
  micState: MicState;
  transcript?: string;
  onStopRecording?: () => void;
  onReturnToRecording?: () => void;
  onConfirmTranscript?: () => void;
}

export default function MicrophoneBar({
  micState,
  transcript,
  onStopRecording,
  onReturnToRecording,
  onConfirmTranscript,
}: MicrophoneBarProps) {
  const stateConfig = {
    idle: {
      emoji: '💤',
      text: 'Waiting...',
      bg: 'bg-[var(--color-bg-secondary)]',
      textColor: 'text-[var(--color-text-secondary)]',
    },
    'your-turn': {
      emoji: '🎤',
      text: 'Your turn to speak!',
      bg: 'bg-[var(--color-accent-light)]',
      textColor: 'text-[var(--color-accent)]',
      pulse: true,
    },
    listening: {
      emoji: '👂',
      text: 'Listening to you...',
      bg: 'bg-blue-50',
      textColor: 'text-blue-700',
      pulse: true,
    },
    confirming: {
      emoji: '⏸️',
      text: 'Ready to submit?',
      bg: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    processing: {
      emoji: '💭',
      text: 'Processing...',
      bg: 'bg-[var(--color-bg-secondary)]',
      textColor: 'text-[var(--color-text-secondary)]',
    },
    speaking: {
      emoji: '💬',
      text: 'Agent speaking...',
      bg: 'bg-[var(--color-accent-light)]',
      textColor: 'text-[var(--color-accent)]',
    },
  };

  const config = stateConfig[micState];

  return (
    <motion.div
      className={`fixed bottom-0 left-0 right-0 z-20 min-h-24 ${config.bg} border-t border-[var(--color-border)] flex items-center justify-center px-8 py-4 transition-colors duration-300 backdrop-blur-md`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
      animate={config.pulse ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 1.5, repeat: config.pulse ? Infinity : 0 }}
    >
      <div className="flex items-center gap-12 w-full max-w-4xl justify-center">
        {/* Left: Emoji & Status */}
        <div className="flex items-center gap-6">
          {/* Emoji Indicator */}
          <motion.div
            className="text-5xl"
            animate={config.pulse ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: config.pulse ? Infinity : 0 }}
          >
            {config.emoji}
          </motion.div>

          {/* Status Text */}
          <div className="flex flex-col items-start">
            <p
              style={{ fontFamily: 'var(--font-sans)' }}
              className={`text-2xl font-semibold ${config.textColor}`}
            >
              {config.text}
            </p>
            {transcript && (micState === 'listening' || micState === 'confirming') && (
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-lg text-[var(--color-text-secondary)] mt-1 italic max-w-2xl line-clamp-2"
              >
                "{transcript}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Stop Recording Button - shown during listening */}
          {micState === 'listening' && onStopRecording && (
            <motion.button
              onClick={onStopRecording}
              className="flex items-center gap-2 px-8 py-4 text-[17px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-150"
              style={{ fontFamily: 'var(--font-serif)' }}
              whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(239, 68, 68, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Square size={20} fill="currentColor" />
              Stop Recording
            </motion.button>
          )}

          {/* Confirmation Buttons - shown during confirming state */}
          {micState === 'confirming' && (
            <>
              <motion.button
                onClick={onReturnToRecording}
                className="flex items-center gap-2 px-8 py-4 text-[17px] font-semibold text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] rounded-md hover:border-[var(--color-text-primary)] transition-all duration-150"
                style={{ fontFamily: 'var(--font-serif)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <RotateCcw size={20} />
                Continue Recording
              </motion.button>

              <motion.button
                onClick={onConfirmTranscript}
                className="flex items-center gap-2 px-8 py-4 text-[17px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-150"
                style={{ fontFamily: 'var(--font-sans)' }}
                whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(140, 21, 21, 0.3)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Check size={20} />
                Submit
              </motion.button>
            </>
          )}

          {/* Mic Icon */}
          <motion.div
            className={`p-4 rounded-full ${config.bg} border-2 border-current`}
            animate={micState === 'listening' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: micState === 'listening' ? Infinity : 0 }}
          >
            <Mic size={32} className={config.textColor} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
