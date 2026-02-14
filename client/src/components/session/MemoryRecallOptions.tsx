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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: showFeedback ? 1 : 1.05 }}
            whileTap={{ scale: showFeedback ? 1 : 0.95 }}
            onClick={() => !showFeedback && onSelect(option)}
            disabled={showFeedback}
            className={`
              min-w-[200px] h-32 px-8 rounded-2xl text-3xl font-bold shadow-xl
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
