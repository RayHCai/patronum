// Conversation Setup - Topic Selection + Mic Check
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Check, ChefHat, Users, Music, Flower2, Baby, Palette, LucideIcon } from 'lucide-react';
import { useConversationStore } from '../stores/conversationStore';
import { usePatientStore } from '../stores/patientStore';
import { usePatient } from '../contexts/PatientContext';
import { CSTTopic } from '../types';
import { cstTopics } from '../data/topics';
import PatientButton from '../components/ui/PatientButton';
import PatientCard from '../components/ui/PatientCard';
import NeuralNetworkBackground from '../components/NeuralNetworkBackground';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  ChefHat,
  Users,
  Music,
  Flower2,
  Baby,
  Palette,
};

type SetupStep = 'topic' | 'mic-check';

// Animation variants matching Landing page style
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15
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
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Neural Network Animation Background */}
      <NeuralNetworkBackground />

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/30 pointer-events-none" />

      {/* Back Button */}
      <motion.button
        style={{ fontFamily: 'var(--font-sans)' }}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-[15px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50 backdrop-blur-sm transition-all duration-200"
        onClick={() => step === 'topic' ? navigate(`/patient/${participantId}/home`) : setStep('topic')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        whileHover={{ x: -4, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
      >
        <ArrowLeft size={20} strokeWidth={2} />
        <span>Back</span>
      </motion.button>

      <AnimatePresence mode="wait">
        {/* STEP 1: Topic Selection */}
        {step === 'topic' && (
          <motion.div
            key="topic"
            className="relative z-10 w-full max-w-6xl text-center"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ duration: 0.4 }}
            variants={containerVariants}
          >
            {/* Heading with gradient text effect */}
            <motion.h1
              className="text-6xl sm:text-7xl font-semibold leading-[0.95] tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              variants={itemVariants}
            >
              Choose a Topic
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl leading-relaxed text-[var(--color-text-secondary)] mb-16 max-w-3xl mx-auto"
              style={{ fontFamily: 'var(--font-sans)' }}
              variants={itemVariants}
            >
              Select a conversation topic that interests you today
            </motion.p>

            {/* Topic Cards Grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 mx-auto max-w-4xl justify-items-center"
              variants={containerVariants}
            >
              {cstTopics.map((topic) => {
                const IconComponent = iconMap[topic.icon];
                return (
                  <motion.div
                    key={topic.id}
                    variants={itemVariants}
                    whileHover={{
                      scale: 1.03,
                      transition: { duration: 0.2, ease: 'easeOut' }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <PatientCard
                      variant="topic"
                      selected={selectedTopic?.id === topic.id}
                      onClick={() => handleTopicSelect(topic)}
                    >
                      <div
                        className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-sm transition-transform duration-300"
                        style={{ backgroundColor: topic.backgroundColor }}
                      >
                        {IconComponent && (
                          <IconComponent
                            size={48}
                            className="text-gray-700"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <h3
                        style={{ fontFamily: 'var(--font-sans)' }}
                        className="text-xl font-semibold text-[var(--color-text-primary)] text-center px-2 mt-1"
                      >
                        {topic.title}
                      </h3>
                    </PatientCard>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Next Button */}
            <AnimatePresence>
              {selectedTopic && (
                <motion.div
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <PatientButton onClick={handleNextToMicCheck} variant="primary" size="large">
                    Continue →
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
            className="relative z-10 w-full max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ duration: 0.4 }}
            variants={containerVariants}
          >
            {/* Heading with gradient text effect */}
            <motion.h1
              className="text-6xl sm:text-7xl font-semibold leading-[0.95] tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              variants={itemVariants}
            >
              Microphone Check
            </motion.h1>

            {!micPermissionGranted ? (
              <>
                <motion.p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-xl sm:text-2xl leading-relaxed text-[var(--color-text-secondary)] mb-16 max-w-2xl mx-auto"
                  variants={itemVariants}
                >
                  We need permission to use your microphone for the conversation
                </motion.p>

                <motion.div className="mb-16" variants={itemVariants}>
                  <motion.div
                    className="inline-flex items-center justify-center w-40 h-40 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-accent-light)]/50 rounded-full shadow-xl mb-8"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Mic size={72} className="text-[var(--color-accent)]" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <PatientButton onClick={handleRequestMicPermission} variant="primary" size="large">
                    Allow Microphone
                  </PatientButton>
                </motion.div>
              </>
            ) : !micTested ? (
              <>
                <motion.p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-xl sm:text-2xl leading-relaxed text-[var(--color-text-secondary)] mb-16 max-w-2xl mx-auto"
                  variants={itemVariants}
                >
                  {isTestingMic ? 'Testing your microphone...' : 'Please say "hello"'}
                </motion.p>

                <motion.div className="mb-16" variants={itemVariants}>
                  <motion.div
                    className="inline-flex items-center justify-center w-40 h-40 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-accent-light)]/50 rounded-full shadow-xl relative"
                    animate={{
                      scale: isTestingMic ? [1, 1.15, 1] : 1,
                    }}
                    transition={{ duration: 0.6, repeat: isTestingMic ? Infinity : 0, ease: 'easeInOut' }}
                  >
                    {isTestingMic && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-[var(--color-accent)]"
                          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-[var(--color-accent)]"
                          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                        />
                      </>
                    )}
                    <Mic size={72} className="text-[var(--color-accent)]" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>

                {isTestingMic && (
                  <motion.p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-lg text-[var(--color-text-secondary)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    Listening...
                  </motion.p>
                )}
              </>
            ) : (
              <>
                <motion.div
                  className="mb-16"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <div className="inline-flex items-center justify-center w-40 h-40 bg-gradient-to-br from-green-100 to-green-50 rounded-full shadow-xl mb-8">
                    <Check size={72} className="text-green-600" strokeWidth={2.5} />
                  </div>
                  <p
                    style={{ fontFamily: 'var(--font-sans)' }}
                    className="text-2xl text-green-600 font-semibold"
                  >
                    Perfect! We can hear you loud and clear!
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
                >
                  <PatientButton onClick={handleStartConversation} variant="primary" size="large">
                    I'm Ready to Chat!
                  </PatientButton>
                </motion.div>
              </>
            )}

            {/* Troubleshooting hint */}
            {micPermissionGranted && !micTested && !isTestingMic && (
              <motion.div
                className="mt-12 p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-[var(--color-border)] shadow-lg"
                initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <p
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="text-lg text-[var(--color-text-secondary)] font-medium"
                >
                  <span className="text-[var(--color-accent)] font-semibold">Tip:</span> Speak clearly and move closer to your device
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
