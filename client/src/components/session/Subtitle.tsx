// Subtitle component - displays current speaker's text during audio playback
import { motion, AnimatePresence } from 'framer-motion';

interface SubtitleProps {
  speakerName?: string;
  content?: string;
  isVisible: boolean;
  speakerColor?: string;
}

export default function Subtitle({
  speakerName,
  content,
  isVisible,
  speakerColor = '#8B0000',
}: SubtitleProps) {
  if (!isVisible || !content) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-10 max-w-4xl w-full px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          {/* Speaker Name */}
          {speakerName && (
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: speakerColor }}
              />
              <span
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-sm font-semibold text-gray-700"
              >
                {speakerName}
              </span>
            </div>
          )}

          {/* Subtitle Text */}
          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-base leading-relaxed text-gray-900"
          >
            {content}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
