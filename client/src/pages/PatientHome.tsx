// Patient Home - Simple welcome and conversation starter
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import PatientButton from '../components/ui/PatientButton';

export default function PatientHome() {
  const navigate = useNavigate();
  const { participantId, participantName } = usePatient();

  const handleStartConversation = () => {
    navigate(`/patient/${participantId}/conversation-setup`);
  };

  const firstName = participantName?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      <motion.div
        className="relative z-10 w-full max-w-3xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Warm Welcome */}
        <motion.h1
          style={{ fontFamily: 'var(--font-serif)' }}
          className="text-6xl sm:text-7xl font-semibold text-[var(--color-text-primary)] mb-8 tracking-tight"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          Hello, {firstName}
        </motion.h1>

        <motion.p
          style={{ fontFamily: 'var(--font-sans)' }}
          className="text-2xl text-[var(--color-text-secondary)] mb-20 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Ready to engage in a meaningful conversation?
        </motion.p>

        {/* Primary Action Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
        >
          <PatientButton onClick={handleStartConversation} variant="primary" size="large">
            Start a Conversation
          </PatientButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
