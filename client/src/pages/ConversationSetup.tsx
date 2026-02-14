// Conversation Setup - Topic Selection + Mic Check
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Check } from 'lucide-react';
import { useConversationStore } from '../stores/conversationStore';
import { usePatientStore } from '../stores/patientStore';
import { usePatient } from '../contexts/PatientContext';
import { CSTTopic } from '../types';
import { cstTopics } from '../data/topics';
import PatientButton from '../components/ui/PatientButton';
import PatientCard from '../components/ui/PatientCard';

type SetupStep = 'topic' | 'mic-check';

export default function ConversationSetup() {
  const navigate = useNavigate();
  const { participantId } = usePatient();
  const { setTopic, setAgents } = useConversationStore();
  const { agents: patientAgents } = usePatientStore();
  const [step, setStep] = useState<SetupStep>('topic');
  const [selectedTopic, setSelectedTopic] = useState<CSTTopic | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);

  const handleTopicSelect = (topic: CSTTopic) => {
    setSelectedTopic(topic);
  };

  const handleNextToMicCheck = () => {
    if (selectedTopic) {
      setTopic(selectedTopic);
      // Transfer agents from patient store to conversation store
      setAgents(patientAgents);
      setStep('mic-check');
    }
  };

  const handleRequestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);

      // Test the mic
      setIsTestingMic(true);

      // Simulate mic test (in real implementation, check audio levels)
      setTimeout(() => {
        setMicTested(true);
        setIsTestingMic(false);
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
    } catch (error) {
      alert('Microphone permission denied. Please allow access to continue.');
    }
  };

  const handleStartConversation = () => {
    navigate(`/patient/${participantId}/session`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative flex flex-col items-center justify-center p-8">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Back Button */}
      <motion.button
        style={{ fontFamily: 'var(--font-sans)' }}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-[15px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        onClick={() => step === 'topic' ? navigate(`/patient/${participantId}/home`) : setStep('topic')}
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      <AnimatePresence mode="wait">
        {/* STEP 1: Topic Selection */}
        {step === 'topic' && (
          <motion.div
            key="topic"
            className="relative z-10 w-full max-w-5xl text-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
          >
            <h1
              style={{ fontFamily: 'var(--font-serif)' }}
              className="text-5xl sm:text-6xl font-semibold text-[var(--color-text-primary)] mb-12 tracking-tight"
            >
              Choose a Topic
            </h1>

            {/* Topic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {cstTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PatientCard
                    variant="topic"
                    selected={selectedTopic?.id === topic.id}
                    onClick={() => handleTopicSelect(topic)}
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl"
                      style={{ backgroundColor: topic.backgroundColor }}
                    >
                      {topic.iconEmoji}
                    </div>
                    <h3
                      style={{ fontFamily: 'var(--font-sans)' }}
                      className="text-xl font-semibold text-[var(--color-text-primary)] text-center px-2"
                    >
                      {topic.title}
                    </h3>
                  </PatientCard>
                </motion.div>
              ))}
            </div>

            {/* Next Button */}
            <AnimatePresence>
              {selectedTopic && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <PatientButton onClick={handleNextToMicCheck} variant="primary">
                    Next →
                  </PatientButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* STEP 2: Mic Check */}
        {step === 'mic-check' && (
          <motion.div
            key="mic-check"
            className="relative z-10 w-full max-w-2xl text-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
          >
            <h1
              style={{ fontFamily: 'var(--font-serif)' }}
              className="text-5xl sm:text-6xl font-semibold text-[var(--color-text-primary)] mb-8 tracking-tight"
            >
              Microphone Check
            </h1>

            {!micPermissionGranted ? (
              <>
                <p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-xl text-[var(--color-text-secondary)] mb-12 leading-relaxed"
                >
                  We need permission to use your microphone for the conversation
                </p>

                <div className="mb-12">
                  <motion.div
                    className="inline-flex items-center justify-center w-32 h-32 bg-[var(--color-accent-light)] rounded-full mb-6"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mic size={64} className="text-[var(--color-accent)]" />
                  </motion.div>
                </div>

                <PatientButton onClick={handleRequestMicPermission} variant="primary">
                  Allow Microphone
                </PatientButton>
              </>
            ) : !micTested ? (
              <>
                <p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-xl text-[var(--color-text-secondary)] mb-12 leading-relaxed"
                >
                  {isTestingMic ? 'Testing your microphone...' : 'Please say "hello"'}
                </p>

                <div className="mb-12">
                  <motion.div
                    className="inline-flex items-center justify-center w-32 h-32 bg-[var(--color-accent-light)] rounded-full"
                    animate={{
                      scale: isTestingMic ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.5, repeat: isTestingMic ? Infinity : 0 }}
                  >
                    <Mic size={64} className="text-[var(--color-accent)]" />
                  </motion.div>
                </div>

                {isTestingMic && (
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-lg text-[var(--color-text-secondary)]"
                  >
                    Listening...
                  </p>
                )}
              </>
            ) : (
              <>
                <motion.div
                  className="mb-12"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <div className="inline-flex items-center justify-center w-32 h-32 bg-[var(--color-accent-light)] rounded-full mb-6">
                    <Check size={64} className="text-[var(--color-accent)]" />
                  </div>
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-xl text-[var(--color-accent)] font-semibold"
                  >
                    Perfect! We can hear you loud and clear!
                  </p>
                </motion.div>

                <PatientButton onClick={handleStartConversation} variant="primary">
                  I'm Ready to Chat!
                </PatientButton>
              </>
            )}

            {/* Troubleshooting hint */}
            {micPermissionGranted && !micTested && !isTestingMic && (
              <motion.div
                className="mt-8 p-6 bg-[var(--color-accent-light)] rounded-2xl border border-[var(--color-border)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-[15px] text-[var(--color-accent)] font-medium"
                >
                  💡 Tip: Speak clearly and move closer to your device
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
