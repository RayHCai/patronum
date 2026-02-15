// Professional microphone bar - matches admin page aesthetic
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
      text: 'Waiting',
      icon: Mic,
      iconColor: 'text-gray-400',
      textColor: 'text-gray-600',
    },
    'your-turn': {
      text: 'Your turn to speak',
      icon: Mic,
      iconColor: 'text-[var(--color-accent)]',
      textColor: 'text-[var(--color-accent)]',
      pulse: true,
    },
    listening: {
      text: 'Listening',
      icon: Mic,
      iconColor: 'text-[var(--color-accent)]',
      textColor: 'text-gray-900',
      pulse: true,
    },
    confirming: {
      text: 'Review your response',
      icon: Mic,
      iconColor: 'text-gray-600',
      textColor: 'text-gray-900',
    },
    processing: {
      text: 'Processing',
      icon: Mic,
      iconColor: 'text-gray-400',
      textColor: 'text-gray-600',
    },
    speaking: {
      text: 'Speaking',
      icon: Mic,
      iconColor: 'text-gray-600',
      textColor: 'text-gray-900',
    },
  };

  const config = stateConfig[micState];
  const IconComponent = config.icon;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-4"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left: Status & Icon */}
        <div className="flex items-center gap-4">
          {/* Icon */}
          <motion.div
            animate={config.pulse ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.5, repeat: config.pulse ? Infinity : 0 }}
          >
            <IconComponent size={20} className={config.iconColor} strokeWidth={2} />
          </motion.div>

          {/* Status Text */}
          <div className="flex flex-col">
            <p
              style={{ fontFamily: 'var(--font-sans)' }}
              className={`text-sm font-medium ${config.textColor}`}
            >
              {config.text}
            </p>
            {transcript && (micState === 'listening' || micState === 'confirming') && (
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-xs text-gray-500 mt-0.5 max-w-md truncate"
              >
                "{transcript}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Stop Recording Button - shown during listening */}
          {micState === 'listening' && onStopRecording && (
            <button
              onClick={onStopRecording}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-red-800 transition-colors rounded-lg"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <Square size={14} fill="currentColor" strokeWidth={2.5} />
              Stop
            </button>
          )}

          {/* Confirmation Buttons - shown during confirming state */}
          {micState === 'confirming' && (
            <>
              <button
                onClick={onReturnToRecording}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 transition-all rounded-lg"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <RotateCcw size={14} strokeWidth={2.5} />
                Continue
              </button>

              <button
                onClick={onConfirmTranscript}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-red-800 transition-colors rounded-lg"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <Check size={14} strokeWidth={2.5} />
                Submit
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
