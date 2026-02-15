// Thank You page after conversation
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useConversationStore } from '../stores/conversationStore';
import PatientButton from '../components/ui/PatientButton';

export default function ThankYou() {
  const navigate = useNavigate();
  const { turns } = useConversationStore();
  const [showConfetti, setShowConfetti] = useState(false);

  const firstName = 'there';

  useEffect(() => {
    // Trigger confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -50,
                rotate: 0,
              }}
              animate={{
                y: window.innerHeight + 50,
                rotate: 360,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                ease: 'linear',
              }}
            >
              {['🎉', '✨', '🌟', '❤️', '🎊'][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        className="w-full max-w-3xl text-center relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Thank You Message */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-6xl sm:text-7xl font-semibold text-[var(--color-text-primary)] mb-6 tracking-tight"
          >
            Wonderful Conversation!
          </h1>

          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-xl text-[var(--color-text-secondary)] mb-4 leading-relaxed"
          >
            Thank you for sharing your thoughts, {firstName}!
          </p>

          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-lg text-[var(--color-text-secondary)] mb-12"
          >
            You shared {turns.filter((t) => t.speakerType === 'participant').length} thoughts
            and stories today.
          </p>
        </motion.div>

        {/* Fun Facts Box */}
        <motion.div
          className="bg-white rounded-3xl shadow-lg p-12 mb-12 border border-[var(--color-border)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-3xl font-semibold text-[var(--color-text-primary)] mb-6"
          >
            Conversation Stats
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[var(--color-accent-light)] rounded-2xl p-6">
              <p
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-5xl font-bold text-[var(--color-accent)]"
              >
                {turns.length}
              </p>
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-lg text-[var(--color-text-secondary)] mt-2"
              >
                Total Messages
              </p>
            </div>
            <div className="bg-[var(--color-accent-light)] rounded-2xl p-6">
              <p
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-5xl font-bold text-[var(--color-accent)]"
              >
                {Math.floor(turns.length / 3)}
              </p>
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-lg text-[var(--color-text-secondary)] mt-2"
              >
                Minutes Chatting
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <PatientButton onClick={handleGoHome} variant="primary" size="large">
            Back to Home
          </PatientButton>
        </motion.div>

        {/* Encouragement */}
        <motion.p
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-lg text-[var(--color-text-secondary)] mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          Great job today! See you next time!
        </motion.p>
      </motion.div>
    </div>
  );
}
