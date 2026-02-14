// Cognitive Game - Universal player for all 4 game types
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameType, GameQuestion, GameAnswer } from '../../types/cognitiveGame';
import MemoryRecallOptions from './MemoryRecallOptions';
import PatternRecognitionOptions from './PatternRecognitionOptions';
import WordAssociationOptions from './WordAssociationOptions';
import ImageMatchingOptions from './ImageMatchingOptions';

interface CognitiveGameProps {
  gameType: GameType;
  questions: GameQuestion[];
  onComplete: (score: number, answers: GameAnswer[]) => void;
  onSkip: () => void;
}

export default function CognitiveGame({ gameType, questions, onComplete, onSkip }: CognitiveGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const getGameTitle = (): string => {
    switch (gameType) {
      case 'memory_recall': return "Let's Remember Together 🎯";
      case 'pattern_recognition': return "Find the Pattern 🧩";
      case 'word_association': return "Connect the Words 💭";
      case 'image_matching': return "Picture This 🖼️";
    }
  };

  const handleSelect = (answer: string) => {
    if (showFeedback) return; // Prevent selection during feedback
    setSelectedAnswer(answer);
    setShowFeedback(true);

    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = answer === currentQuestion.correctAnswer;

    // Record answer
    const gameAnswer: GameAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      wasCorrect: isCorrect,
      timeSpent
    };

    setAnswers([...answers, gameAnswer]);

    if (isCorrect) {
      setScore(score + 1);
    }

    // Auto-advance after feedback
    setTimeout(() => {
      if (isLastQuestion) {
        // Complete game
        onComplete(isCorrect ? score + 1 : score, [...answers, gameAnswer]);
      } else {
        // Next question
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 2500); // Show feedback for 2.5 seconds
  };

  const renderQuestionOptions = () => {
    if (!currentQuestion) return null;

    const commonProps = {
      question: currentQuestion,
      selectedAnswer,
      showFeedback,
      onSelect: handleSelect
    };

    switch (gameType) {
      case 'memory_recall':
        return <MemoryRecallOptions {...commonProps} />;
      case 'pattern_recognition':
        return <PatternRecognitionOptions {...commonProps} />;
      case 'word_association':
        return <WordAssociationOptions {...commonProps} />;
      case 'image_matching':
        return <ImageMatchingOptions {...commonProps} />;
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 z-50 overflow-y-auto"
    >
      {/* Game header */}
      <div className="text-center pt-12 pb-6">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold text-gray-800 mb-4"
        >
          {getGameTitle()}
        </motion.h2>
        <p className="text-2xl text-gray-600">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Question area */}
      <div className="flex flex-col items-center justify-center px-8 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl"
          >
            {/* Question text */}
            <div className="text-3xl text-gray-800 mb-12 text-center font-medium">
              {currentQuestion.question}
            </div>

            {/* Dynamic options renderer */}
            {renderQuestionOptions()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex gap-3">
        {questions.map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`w-4 h-4 rounded-full transition-colors duration-300 ${
              idx < currentIndex ? 'bg-green-500' :
              idx === currentIndex ? 'bg-blue-500' :
              'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="fixed bottom-8 right-8 text-gray-500 hover:text-gray-700 text-xl underline transition-colors"
      >
        Skip game
      </button>

      {/* Feedback overlay */}
      <AnimatePresence>
        {showFeedback && (
          <FeedbackOverlay
            isCorrect={selectedAnswer === currentQuestion.correctAnswer}
            correctAnswer={currentQuestion.correctAnswer}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Feedback overlay component
interface FeedbackOverlayProps {
  isCorrect: boolean;
  correctAnswer: string;
}

function FeedbackOverlay({ isCorrect, correctAnswer }: FeedbackOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isCorrect ? 'bg-green-500/90' : 'bg-orange-400/90'
      }`}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="text-center text-white"
      >
        {isCorrect ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-9xl mb-6"
            >
              ✅
            </motion.div>
            <h2 className="text-6xl font-bold mb-4">That's right!</h2>
            <p className="text-4xl">Great memory!</p>

            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, x: '50vw', opacity: 1 }}
                  animate={{
                    y: '100vh',
                    x: `${Math.random() * 100}vw`,
                    opacity: 0,
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 2, delay: Math.random() * 0.5 }}
                  className="absolute text-4xl"
                >
                  🎉
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-9xl mb-6"
            >
              💡
            </motion.div>
            <h2 className="text-6xl font-bold mb-4">Good try!</h2>
            <p className="text-4xl">It was {correctAnswer}!</p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
