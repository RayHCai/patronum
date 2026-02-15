// Game Choice Screen - Asks patient if they want to play a quiz about the conversation
import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import PatientButton from '../ui/PatientButton';

// Animation variants matching landing page
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: 'blur(6px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.34, 1.56, 0.64, 1]
    }
  }
};

interface GameChoiceScreenProps {
  onYes: () => void;
  onNo: () => void;
}

export default function GameChoiceScreen({ onYes, onNo }: GameChoiceScreenProps) {
  console.log('[GameChoiceScreen] Component rendering');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 flex items-center justify-center overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* Gradient overlay matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 text-center max-w-4xl px-8"
      >
        {/* Main text */}
        <motion.h1
          variants={itemVariants}
          className="text-6xl sm:text-7xl font-semibold leading-[0.95] tracking-tight mb-8"
          style={{
            fontFamily: 'var(--font-serif)',
            background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Wonderful conversation!
        </motion.h1>

        <motion.p
          variants={itemVariants}
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-xl sm:text-2xl text-[var(--color-text-secondary)] mb-12 leading-relaxed max-w-2xl mx-auto"
        >
          Would you like to take a quick quiz about what everyone talked about?
        </motion.p>

        {/* Buttons using PatientButton component */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-5 justify-center items-center"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PatientButton onClick={onYes} variant="primary" size="large">
              Yes, let's do it!
            </PatientButton>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PatientButton onClick={onNo} variant="secondary" size="large">
              Maybe later
            </PatientButton>
          </motion.div>
        </motion.div>

        {/* Subtle hint */}
        <motion.p
          variants={itemVariants}
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-sm text-[var(--color-text-secondary)] mt-10 font-medium"
        >
          A fun way to reinforce the highlights from your conversation
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
