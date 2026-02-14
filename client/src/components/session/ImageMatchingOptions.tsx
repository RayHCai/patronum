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
            whileHover={{ scale: showFeedback ? 1 : 1.02 }}
            whileTap={{ scale: showFeedback ? 1 : 0.98 }}
            onClick={() => !showFeedback && onSelect(option.label)}
            disabled={showFeedback}
            className={`
              w-80 rounded-2xl shadow-xl overflow-hidden
              transition-all duration-300 cursor-pointer
              ${showCorrect ? 'ring-8 ring-green-500' :
                showIncorrect ? 'ring-8 ring-red-400' :
                isSelected ? 'ring-8 ring-blue-500' :
                'ring-2 ring-gray-200 hover:ring-4 hover:ring-gray-300'}
              ${showFeedback ? 'cursor-not-allowed' : ''}
            `}
          >
            {/* Image */}
            <div className="relative h-64 bg-gray-100">
              <img
                src={option.imageUrl}
                alt={option.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="24"%3EImage%3C/text%3E%3C/svg%3E';
                }}
              />
              {/* Overlay on selection */}
              {isSelected && (
                <div className={`absolute inset-0 ${
                  showCorrect ? 'bg-green-500/30' :
                  showIncorrect ? 'bg-red-400/30' :
                  'bg-blue-500/20'
                }`} />
              )}
            </div>

            {/* Label */}
            <div className={`
              py-4 text-2xl font-bold text-center
              ${showCorrect ? 'bg-green-500 text-white' :
                showIncorrect ? 'bg-red-400 text-white' :
                isSelected ? 'bg-blue-500 text-white' :
                'bg-white text-gray-800'}
            `}>
              {option.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
