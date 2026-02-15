// Game Choice Screen - Asks patient if they want to play a memory game
import { motion } from 'framer-motion';
import PatientButton from '../ui/PatientButton';

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
      className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* Gradient overlay matching home page */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 text-center max-w-2xl px-8"
      >
        {/* Friendly illustration */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-9xl mb-8"
        >
          🎮
        </motion.div>

        {/* Main text */}
        <h1
          style={{ fontFamily: 'var(--font-serif)' }}
          className="text-5xl font-semibold text-[var(--color-text-primary)] mb-6 tracking-tight"
        >
          Great conversation!
        </h1>
        <p
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-2xl text-[var(--color-text-secondary)] mb-12 leading-relaxed"
        >
          Would you like to play a quick memory game?
        </p>

        {/* Buttons using PatientButton component */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <PatientButton onClick={onYes} variant="primary" size="large">
            Yes, let's play! 🎯
          </PatientButton>

          <PatientButton onClick={onNo} variant="secondary" size="large">
            Not right now
          </PatientButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
