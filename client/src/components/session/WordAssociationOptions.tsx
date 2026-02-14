// Word Association Options - Large word cards
import { motion } from 'framer-motion';
import { GameQuestion } from '../../types/cognitiveGame';

interface WordAssociationOptionsProps {
  question: GameQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  onSelect: (answer: string) => void;
}

export default function WordAssociationOptions({
  question,
  selectedAnswer,
  showFeedback,
  onSelect
}: WordAssociationOptionsProps) {
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
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ delay: idx * 0.15, type: 'spring' }}
            whileHover={{ scale: showFeedback ? 1 : 1.05 }}
            whileTap={{ scale: showFeedback ? 1 : 0.95 }}
            onClick={() => !showFeedback && onSelect(option)}
            disabled={showFeedback}
            className={`
              w-64 h-40 rounded-2xl text-5xl font-black shadow-xl
              flex items-center justify-center
              transition-all duration-300 cursor-pointer
              ${showCorrect ? 'bg-green-500 text-white ring-4 ring-green-300' :
                showIncorrect ? 'bg-red-400 text-white ring-4 ring-red-300' :
                isSelected ? 'bg-blue-500 text-white ring-4 ring-blue-300' :
                'bg-white text-gray-800 hover:bg-gray-50'}
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
