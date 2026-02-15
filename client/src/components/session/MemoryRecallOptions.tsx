// Memory Recall Options - Agent avatar cards
import { motion } from 'framer-motion';
import { GameQuestion } from '../../types/cognitiveGame';

interface MemoryRecallOptionsProps {
  question: GameQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  onSelect: (answer: string) => void;
}

export default function MemoryRecallOptions({
  question,
  selectedAnswer,
  showFeedback,
  onSelect
}: MemoryRecallOptionsProps) {
  const options = question.options as string[];

  return (
    <div className="flex flex-wrap gap-6 justify-center">
      {options.map((option, idx) => {
        const isSelected = selectedAnswer === option;
        const isCorrect = option === question.correctAnswer;
        const showCorrect = showFeedback && isCorrect;
        const showIncorrect = showFeedback && isSelected && !isCorrect;

        return (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              delay: idx * 0.1,
              duration: 0.45,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            whileHover={{
              scale: showFeedback ? 1 : 1.03,
              y: showFeedback ? 0 : -4,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: showFeedback ? 1 : 0.97 }}
            onClick={() => !showFeedback && onSelect(option)}
            disabled={showFeedback}
            style={{ fontFamily: 'var(--font-serif)' }}
            className={`
              min-w-[240px] h-36 px-10 rounded-3xl text-3xl font-semibold
              transition-all duration-300 cursor-pointer backdrop-blur-xl
              ${showCorrect ?
                'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl shadow-emerald-500/30 border-0' :
                showIncorrect ?
                'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-2xl shadow-orange-400/30 border-0' :
                isSelected ?
                'bg-gradient-to-br from-[var(--color-accent)] to-[#A01E1E] text-white shadow-2xl shadow-red-500/20 border-0' :
                'bg-white/80 backdrop-blur-xl text-[var(--color-text-primary)] hover:bg-white hover:shadow-xl border border-[var(--color-border-hover)] hover:border-[var(--color-text-secondary)]'}
              ${showFeedback ? 'cursor-not-allowed' : ''}
            `}
          >
            {option}
          </motion.button>
        );
      })}
    </div>
  );
}
