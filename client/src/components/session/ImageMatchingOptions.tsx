// Image Matching Options - Image selection cards
import { motion } from 'framer-motion';
import { GameQuestion, ImageOption } from '../../types/cognitiveGame';

interface ImageMatchingOptionsProps {
  question: GameQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  onSelect: (answer: string) => void;
}

export default function ImageMatchingOptions({
  question,
  selectedAnswer,
  showFeedback,
  onSelect
}: ImageMatchingOptionsProps) {
  const options = question.options as ImageOption[];

  return (
    <div className="flex flex-wrap gap-8 justify-center max-w-6xl mx-auto">
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
              y: showFeedback ? 0 : -6,
              transition: { duration: 0.2, ease: 'easeOut' }
            }}
            whileTap={{ scale: showFeedback ? 1 : 0.98 }}
            onClick={() => !showFeedback && onSelect(option.label)}
            disabled={showFeedback}
            className={`
              relative w-80 rounded-3xl overflow-hidden
              transition-all duration-500 cursor-pointer group
              backdrop-blur-sm
              ${showCorrect ? 'shadow-2xl shadow-emerald-200 border-4 border-emerald-400' :
                showIncorrect ? 'shadow-2xl shadow-orange-200 border-4 border-orange-400' :
                isSelected ? 'shadow-2xl shadow-red-200 border-4 border-[var(--color-accent)]' :
                'border-2 border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:shadow-2xl'}
              ${showFeedback ? 'cursor-not-allowed' : ''}
            `}
          >
            {/* Image */}
            <div className="relative h-64 bg-gray-100 overflow-hidden">
              <img
                src={option.imageUrl}
                alt={option.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="24"%3EImage%3C/text%3E%3C/svg%3E';
                }}
              />

              {/* Overlay on selection */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`absolute inset-0 ${
                    showCorrect ? 'bg-emerald-500/30' :
                    showIncorrect ? 'bg-orange-400/30' :
                    'bg-[var(--color-accent)]/20'
                  }`}
                />
              )}

              {/* Shimmer effect on hover */}
              {!showFeedback && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              )}
            </div>

            {/* Label */}
            <div
              style={{ fontFamily: 'var(--font-serif)' }}
              className={`
                py-5 text-2xl font-semibold text-center
                transition-all duration-300
                ${showCorrect ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white' :
                  showIncorrect ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                  isSelected ? 'bg-gradient-to-br from-[var(--color-accent)] to-[#A01E1E] text-white' :
                  'bg-white/90 text-[var(--color-text-primary)] group-hover:bg-white'}
              `}
            >
              {option.label}
            </div>

            {/* Glow effect for feedback */}
            {(showCorrect || showIncorrect) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 blur-xl -z-10"
                style={{
                  background: showCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 146, 60, 0.3)'
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
