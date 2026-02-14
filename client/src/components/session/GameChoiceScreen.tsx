// Game Choice Screen - Asks patient if they want to play a memory game
import { motion } from 'framer-motion';

interface GameChoiceScreenProps {
  onYes: () => void;
  onNo: () => void;
}

export default function GameChoiceScreen({ onYes, onNo }: GameChoiceScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-2xl px-8"
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
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Great conversation!
        </h1>
        <p className="text-3xl text-gray-700 mb-12">
          Would you like to play a quick memory game?
        </p>

        {/* Large buttons */}
        <div className="flex gap-8 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onYes}
            className="w-64 h-32 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-4xl font-bold shadow-2xl transition-colors duration-200"
          >
            Yes, let's play! 🎯
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNo}
            className="w-64 h-32 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl text-4xl font-bold shadow-xl transition-colors duration-200"
          >
            Not right now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
