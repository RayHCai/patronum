// Quiz page - Memory reinforcement with warm, encouraging feedback
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X, Lightbulb, ArrowRight, Home } from 'lucide-react';
import { useConversationStore } from '../stores/conversationStore';
import { usePatient } from '../contexts/PatientContext';
import PatientButton from '../components/ui/PatientButton';
import PatientCard from '../components/ui/PatientCard';
import { ReinforcementItem } from '../types';

export default function Quiz() {
  const navigate = useNavigate();
  const { participantId, participantName } = usePatient();
  const participant = { id: participantId, name: participantName || 'User' };
  const { sessionId } = useConversationStore();

  const [questions, setQuestions] = useState<ReinforcementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Mock questions (in production, fetch from API)
  useEffect(() => {
    const mockQuestions: ReinforcementItem[] = [
      {
        id: 1,
        sessionId: sessionId || '',
        participantId: participant.id || '',
        promptType: 'attribution',
        question: 'Who shared a story about cooking their favorite dish?',
        correctAnswer: 'Mary',
        options: ['Mary', 'Robert', 'Susan', 'James'],
        hint: 'This person loves to share recipes and was a teacher',
        reviewCount: 0,
        easeFactor: 2.5,
      },
      {
        id: 2,
        sessionId: sessionId || '',
        participantId: participant.id || '',
        promptType: 'recall',
        question: 'What topic did we talk about today?',
        correctAnswer: 'Food & Cooking',
        options: ['Food & Cooking', 'Music', 'Travel', 'Gardening'],
        hint: 'Think about the main theme of our conversation',
        reviewCount: 0,
        easeFactor: 2.5,
      },
      {
        id: 3,
        sessionId: sessionId || '',
        participantId: participant.id || '',
        promptType: 'comparison',
        question: 'What did Robert and Mary both mention?',
        correctAnswer: 'Family gatherings',
        options: ['Family gatherings', 'Travel adventures', 'Favorite books', 'Childhood pets'],
        hint: 'Both shared memories about being with loved ones',
        reviewCount: 0,
        easeFactor: 2.5,
      },
    ];

    setQuestions(mockQuestions);
  }, [sessionId, participant]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    setShowFeedback(true);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setShowHint(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleGoHome = () => {
    navigate(`/patient/${participantId}/home`);
  };

  if (questions.length === 0) {
    return (
      <div className="patient-page">
        <p className="patient-body">Loading quiz...</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] relative flex flex-col items-center justify-center p-8">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

        <motion.div
          className="relative z-10 w-full max-w-2xl text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <h1
              style={{ fontFamily: 'var(--font-serif)' }}
              className="text-6xl sm:text-7xl font-semibold text-[var(--color-text-primary)] mb-8 tracking-tight"
            >
              Amazing Work!
            </h1>

            <div className="bg-white rounded-3xl shadow-lg p-12 mb-8 border border-[var(--color-border)]">
              <p
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-6xl font-bold text-[var(--color-accent)] mb-4"
              >
                {score} / {questions.length}
              </p>
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-2xl text-[var(--color-text-secondary)]"
              >
                Questions Correct
              </p>
            </div>

            <p
              style={{ fontFamily: 'var(--font-sans)' }}
              className="text-xl text-[var(--color-text-secondary)] mb-8 leading-relaxed"
            >
              Your memory is fantastic! Keep up the great work!
            </p>

            <PatientButton onClick={handleGoHome} variant="primary" size="large">
              <Home size={28} className="inline mr-2" />
              Back to Home
            </PatientButton>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      <motion.div
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Progress Dots */}
        <div className="flex justify-center gap-3 mb-8">
          {questions.map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full transition-all"
              style={{
                width: index === currentIndex ? '24px' : '16px',
                height: '16px',
                backgroundColor:
                  index < currentIndex
                    ? 'var(--color-accent)'
                    : index === currentIndex
                    ? 'var(--color-accent)'
                    : 'var(--color-border-hover)',
                scale: index === currentIndex ? 1.2 : 1,
              }}
              animate={{ scale: index === currentIndex ? 1.2 : 1 }}
            />
          ))}
        </div>

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          className="bg-white rounded-3xl shadow-lg p-10 mb-6 border border-[var(--color-border)]"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
        >
          <h2
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-3xl font-semibold text-[var(--color-text-primary)] mb-8"
          >
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          {currentQuestion.options && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {currentQuestion.options.map((option) => (
                <PatientCard
                  key={option}
                  selected={selectedAnswer === option}
                  onClick={() => !showFeedback && handleAnswerSelect(option)}
                  className="h-24 flex items-center justify-center cursor-pointer"
                >
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-2xl font-semibold text-[var(--color-text-primary)]"
                  >
                    {option}
                  </p>
                </PatientCard>
              ))}
            </div>
          )}

          {/* Hint Button */}
          {!showFeedback && currentQuestion.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              style={{ fontFamily: 'var(--font-sans)' }}
              className="flex items-center gap-2 text-lg font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mb-6 transition-colors"
            >
              <Lightbulb size={24} />
              {showHint ? 'Hide Hint' : 'Need a Hint?'}
            </button>
          )}

          {/* Hint Display */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                className="bg-[var(--color-accent-light)] border border-[var(--color-border)] rounded-2xl p-6 mb-6"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-lg text-[var(--color-accent)] font-medium"
                >
                  💡 {currentQuestion.hint}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                className="rounded-2xl p-6 mb-6 border"
                style={{
                  backgroundColor: isCorrect
                    ? 'rgba(140, 21, 21, 0.1)'
                    : 'rgba(251, 146, 60, 0.1)',
                  borderColor: isCorrect ? 'var(--color-accent)' : '#FB923C',
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  {isCorrect ? (
                    <Check size={32} className="text-[var(--color-accent)]" />
                  ) : (
                    <X size={32} className="text-orange-600" />
                  )}
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-2xl font-semibold text-[var(--color-text-primary)]"
                  >
                    {isCorrect ? 'Correct! Great job!' : 'Not quite, but good try!'}
                  </p>
                </div>
                {!isCorrect && (
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-lg text-[var(--color-text-secondary)]"
                  >
                    The answer was: <strong>{currentQuestion.correctAnswer}</strong>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {!showFeedback ? (
              <>
                <PatientButton
                  onClick={handleSubmitAnswer}
                  variant="primary"
                  disabled={!selectedAnswer}
                >
                  Submit Answer
                </PatientButton>
                <button
                  onClick={handleSkip}
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-[15px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline px-6 transition-colors"
                >
                  Skip Question
                </button>
              </>
            ) : (
              <PatientButton onClick={handleNext} variant="primary">
                Next Question <ArrowRight size={24} className="inline ml-2" />
              </PatientButton>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
