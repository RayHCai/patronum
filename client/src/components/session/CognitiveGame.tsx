// Cognitive Game - Simple quiz about the conversation
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Home, Sparkles } from 'lucide-react';
import { GameType, GameQuestion, GameAnswer } from '../../types/cognitiveGame';

// Animation variants matching landing page
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: 'blur(6px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.34, 1.56, 0.64, 1]
    }
  }
};

interface CognitiveGameProps {
  gameType: GameType;
  questions: GameQuestion[];
  onComplete: (score: number, answers: GameAnswer[]) => void;
  onSkip: () => void;
}

export default function CognitiveGame({ gameType, questions, onComplete, onSkip }: CognitiveGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleSelect = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    // Record answer
    const gameAnswer: GameAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedAnswer,
      wasCorrect: isCorrect,
      timeSpent
    };

    setAnswers([...answers, gameAnswer]);
    if (isCorrect) setScore(score + 1);
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsComplete(true);
      const timeSpent = Date.now() - questionStartTime;
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      const finalAnswers = [...answers, {
        questionId: currentQuestion.id,
        selectedAnswer: selectedAnswer || '',
        wasCorrect: isCorrect,
        timeSpent
      }];
      onComplete(isCorrect && !answers.some(a => a.questionId === currentQuestion.id) ? score + 1 : score, finalAnswers);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 flex items-center justify-center overflow-hidden"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

        <motion.div
          className="relative z-10 w-full max-w-3xl text-center px-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-8">
            <div className="text-8xl mb-6">✨</div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-6xl sm:text-7xl font-semibold leading-[0.95] tracking-tight mb-10"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Wonderful work!
          </motion.h1>

          <motion.div
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-xl rounded-xl p-10 mb-10 border border-[var(--color-border)] relative overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 via-transparent to-transparent pointer-events-none" />

            <div className="relative">
              <p
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-7xl font-bold text-[var(--color-accent)] mb-3"
              >
                {score} / {questions.length}
              </p>
              <p
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-xl text-[var(--color-text-secondary)] font-medium"
              >
                Questions correct
              </p>
            </div>
          </motion.div>

          <motion.p
            variants={itemVariants}
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-xl sm:text-2xl text-[var(--color-text-secondary)] mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            Your memory is remarkable. These conversations help keep those connections strong.
          </motion.p>

          <motion.button
            variants={itemVariants}
            onClick={onSkip}
            className="inline-flex items-center gap-3 px-10 py-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xl font-semibold rounded-2xl transition-all duration-300"
            style={{
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 16px rgba(140, 21, 21, 0.24)'
            }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(140, 21, 21, 0.32)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Home size={22} strokeWidth={2.5} />
            Back to Home
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  const options = Array.isArray(currentQuestion.options) ? currentQuestion.options as string[] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 overflow-y-auto"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pt-20 pb-12">
        <motion.h2
          initial={{ y: -20, opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-5xl sm:text-6xl font-semibold leading-tight tracking-tight mb-4"
          style={{
            fontFamily: 'var(--font-serif)',
            background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Let's remember together
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-lg text-[var(--color-text-secondary)] font-medium"
        >
          Question {currentIndex + 1} of {questions.length}
        </motion.p>
      </div>

      {/* Question Card */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="w-full max-w-3xl"
          >
            {/* Question Box */}
            <motion.div
              className="bg-white/80 backdrop-blur-xl rounded-xl p-8 sm:p-10 mb-8 border border-[var(--color-border)] relative overflow-hidden"
              style={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08)'
              }}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {/* Subtle gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/20 via-transparent to-transparent pointer-events-none" />

              <motion.h3
                variants={itemVariants}
                style={{ fontFamily: 'var(--font-serif)' }}
                className="relative text-2xl sm:text-3xl text-[var(--color-text-primary)] mb-8 text-center font-semibold leading-snug tracking-tight"
              >
                {currentQuestion.question}
              </motion.h3>

              {/* Answer Options */}
              <div className="relative grid grid-cols-1 gap-3 mb-8">
                {options.map((option, idx) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrectAnswer = option === currentQuestion.correctAnswer;
                  const showCorrect = showAnswer && isCorrectAnswer;
                  const showWrong = showAnswer && isSelected && !isCorrectAnswer;

                  return (
                    <motion.button
                      key={option}
                      variants={itemVariants}
                      onClick={() => !showAnswer && handleSelect(option)}
                      disabled={showAnswer}
                      className={`
                        relative group p-5 sm:p-6 rounded-lg border-2 text-left transition-all duration-300
                        ${!showAnswer && !isSelected && 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 bg-white/60 hover:bg-red-50/40'}
                        ${!showAnswer && isSelected && 'border-[var(--color-accent)] bg-red-50/60 shadow-sm'}
                        ${showCorrect && 'border-green-500/60 bg-gradient-to-br from-green-50 to-emerald-50/50'}
                        ${showWrong && 'border-red-300 bg-red-50/60'}
                        ${showAnswer && !isSelected && !isCorrectAnswer && 'border-[var(--color-border)] bg-gray-50/50 opacity-40'}
                      `}
                      style={{
                        boxShadow: isSelected && !showAnswer
                          ? '0 2px 8px rgba(140, 21, 21, 0.1)'
                          : showCorrect
                          ? '0 2px 8px rgba(34, 197, 94, 0.12)'
                          : '0 1px 3px rgba(0, 0, 0, 0.03)'
                      }}
                      whileHover={!showAnswer ? {
                        scale: 1.005,
                        y: -1,
                        transition: { duration: 0.2 }
                      } : {}}
                      whileTap={!showAnswer ? { scale: 0.995 } : {}}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span
                          style={{ fontFamily: 'var(--font-serif)' }}
                          className="text-xl sm:text-2xl font-medium text-[var(--color-text-primary)] flex-1"
                        >
                          {option}
                        </span>

                        {/* Icons */}
                        <AnimatePresence>
                          {showCorrect && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                              className="flex items-center gap-2"
                            >
                              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-100">
                                <Check size={24} className="text-green-600" strokeWidth={2.5} />
                              </div>
                              <span className="text-lg font-semibold text-green-600" style={{ fontFamily: 'var(--font-sans)' }}>Correct</span>
                            </motion.div>
                          )}
                          {showWrong && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                              className="flex items-center justify-center w-10 h-10 rounded-md bg-red-100"
                            >
                              <X size={24} className="text-red-500" strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <motion.div
                variants={itemVariants}
                className="flex justify-center gap-4 mt-6"
              >
                {!showAnswer ? (
                  <motion.button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    className="px-10 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-lg font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      boxShadow: selectedAnswer ? '0 2px 8px rgba(140, 21, 21, 0.2)' : '0 1px 4px rgba(140, 21, 21, 0.12)'
                    }}
                    whileHover={selectedAnswer ? {
                      scale: 1.02,
                      boxShadow: '0 4px 12px rgba(140, 21, 21, 0.28)'
                    } : {}}
                    whileTap={selectedAnswer ? { scale: 0.98 } : {}}
                  >
                    Submit answer
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleNext}
                    className="px-10 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-lg font-semibold rounded-lg transition-all duration-300"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      boxShadow: '0 2px 8px rgba(140, 21, 21, 0.2)'
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: '0 4px 12px rgba(140, 21, 21, 0.28)'
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLastQuestion ? 'See results' : 'Next question'}
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2.5 z-20">
        {questions.map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 200 }}
            className={`rounded-md transition-all duration-300 ${
              idx < currentIndex
                ? 'w-2.5 h-2.5 bg-[var(--color-accent)]'
                : idx === currentIndex
                ? 'w-7 h-2.5 bg-[var(--color-accent)]'
                : 'w-2.5 h-2.5 bg-gray-300'
            }`}
            style={{
              boxShadow: idx === currentIndex ? '0 1px 4px rgba(140, 21, 21, 0.25)' : 'none'
            }}
          />
        ))}
      </div>

      {/* Skip button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onSkip}
        style={{ fontFamily: 'var(--font-sans)' }}
        className="fixed bottom-8 right-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-base font-medium underline underline-offset-4 transition-all duration-300 z-20"
      >
        Skip quiz
      </motion.button>
    </motion.div>
  );
}
