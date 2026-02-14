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
    <div className="space-y-8">
      {/* Show the pattern sequence if available in question */}
      {question.question.includes('pattern') && (
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="text-6xl">🌻 🌻 🌷 ?</div>
        </div>
      )}

      {/* Answer options */}
      <div className="flex flex-wrap gap-6 justify-center">
        {options.map((option, idx) => {
          const isSelected = selectedAnswer === option.label;
          const isCorrect = option.label === question.correctAnswer;
          const showCorrect = showFeedback && isCorrect;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: showFeedback ? 1 : 1.05 }}
              whileTap={{ scale: showFeedback ? 1 : 0.95 }}
              onClick={() => !showFeedback && onSelect(option.label)}
              disabled={showFeedback}
              className={`
                w-56 h-40 rounded-2xl shadow-xl
                flex flex-col items-center justify-center gap-3
                transition-all duration-300 cursor-pointer
                ${showCorrect ? 'bg-green-500 text-white ring-4 ring-green-300' :
                  showIncorrect ? 'bg-red-400 text-white ring-4 ring-red-300' :
                  isSelected ? 'bg-blue-500 text-white ring-4 ring-blue-300' :
                  'bg-white text-gray-800 hover:bg-gray-50'}
                ${showFeedback ? 'cursor-not-allowed' : ''}
              `}
            >
              {/* Pattern display */}
              <div className="text-5xl">
                {option.pattern.join(' ')}
              </div>
              {/* Label */}
              <div className="text-2xl font-bold">
                {option.label}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
