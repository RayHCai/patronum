// Pattern Recognition Options - Visual pattern cards
import { motion } from 'framer-motion';
import { GameQuestion, PatternOption } from '../../types/cognitiveGame';

interface PatternRecognitionOptionsProps {
  question: GameQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  onSelect: (answer: string) => void;
}

export default function PatternRecognitionOptions({
  question,
  selectedAnswer,
  showFeedback,
  onSelect
}: PatternRecognitionOptionsProps) {
  const options = question.options as PatternOption[];

  return (
    <div className="space-y-12">
      {/* Show the pattern sequence if available in question */}
      {question.question.includes('pattern') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center items-center gap-6 mb-8"
        >
          <div className="text-7xl bg-white/60 backdrop-blur-sm rounded-3xl px-12 py-6 shadow-lg border border-[var(--color-border)]">
            🌻 🌻 🌷 ?
          </div>
        </motion.div>
      )}

      {/* Answer options */}
      <div className="flex flex-wrap gap-6 justify-center max-w-5xl mx-auto">
        {options.map((option, idx) => {
          const isSelected = selectedAnswer === option.label;
          const isCorrect = option.label === question.correctAnswer;
          const showCorrect = showFeedback && isCorrect;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                delay: idx * 0.08,
                duration: 0.45,
                ease: [0.34, 1.56, 0.64, 1]
              }}
              whileHover={{
                scale: showFeedback ? 1 : 1.03,
                y: showFeedback ? 0 : -4,
                transition: { duration: 0.2, ease: 'easeOut' }
              }}
              whileTap={{ scale: showFeedback ? 1 : 0.97 }}
              onClick={() => !showFeedback && onSelect(option.label)}
              disabled={showFeedback}
              className={`
                relative w-64 h-44 rounded-3xl
                flex flex-col items-center justify-center gap-4
                transition-all duration-500 cursor-pointer
                backdrop-blur-sm overflow-hidden group
                ${showCorrect ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-2xl shadow-emerald-200' :
                  showIncorrect ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-2xl shadow-orange-200' :
                  isSelected ? 'bg-gradient-to-br from-[var(--color-accent)] to-[#A01E1E] text-white shadow-2xl shadow-red-200' :
                  'bg-white/80 text-[var(--color-text-primary)] hover:bg-white hover:shadow-2xl border border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}
                ${showFeedback ? 'cursor-not-allowed' : ''}
              `}
            >
              {/* Shimmer effect on hover */}
              {!showFeedback && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              )}

              {/* Glow effect for feedback */}
              {(showCorrect || showIncorrect) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 blur-xl"
                  style={{
                    background: showCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 146, 60, 0.3)'
                  }}
                />
              )}

              {/* Pattern display */}
              <div className="relative z-10 text-5xl">
                {option.pattern.join(' ')}
              </div>

              {/* Label */}
              <div
                style={{ fontFamily: 'var(--font-serif)' }}
                className="relative z-10 text-2xl font-semibold"
              >
                {option.label}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
