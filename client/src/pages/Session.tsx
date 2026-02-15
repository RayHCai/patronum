// Session page - Conversational chat interface
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../stores/conversationStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useMicrophone } from '../hooks/useMicrophone';
import { useConversationFlow } from '../hooks/useConversationFlow';
import { usePatient } from '../contexts/PatientContext';
import MicrophoneBar from '../components/session/MicrophoneBar';
import ChatBubble from '../components/session/ChatBubble';
import GameChoiceScreen from '../components/session/GameChoiceScreen';
import CognitiveGame from '../components/session/CognitiveGame';
import { GameAnswer } from '../types/cognitiveGame';

export default function Session() {
  const navigate = useNavigate();
  const { participantId, participantName } = usePatient();
  const participant = { id: participantId, name: participantName || 'User' };
  const {
    topic,
    agents,
    turns,
    sessionId,
    setSessionId,
    setMicState,
    micState,
    showGameChoice,
    showCognitiveGame,
    gameType,
    cognitiveGameQuestions,
    setShowGameChoice,
    setShowCognitiveGame,
    setGameType,
    setCognitiveGameQuestions,
    startGame,
    clearGameState,
  } = useConversationStore();
  const { isConnected, sendMessage, on, off } = useWebSocket();
  const { enqueue: enqueueAudio } = useAudioPlayback();
  const { startSession, handleUserTurn, startPreComputingDuringUserSpeech, endSession } = useConversationFlow();

  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState(''); // Accumulate full turn transcript
  const accumulatedTranscriptRef = useRef(''); // Ref to track accumulated transcript for closures
  const [isLoading, setIsLoading] = useState(true); // Start loading immediately
  const [loadingMessage, setLoadingMessage] = useState('Preparing your conversation...');

  const { transcript, interimResult, startListening, stopListening, isListening } = useMicrophone({
    onTranscript: (text) => {
      // Accumulate transcripts during the turn
      console.log('[Session] ----------------------------------------');
      console.log('[Session] onTranscript received:', text.substring(0, 50));
      setAccumulatedTranscript((prev) => {
        const newText = prev ? `${prev} ${text}` : text;
        console.log('[Session] Stitching transcript:');
        console.log('[Session]   Previous:', prev);
        console.log('[Session]   New chunk:', text);
        console.log('[Session]   Result:', newText);
        accumulatedTranscriptRef.current = newText; // Keep ref in sync
        // We don't set live transcript here directly, the effect below handles it combining with interim
        return newText;
      });
    },
    onSpeechStart: () => {
      console.log('[Session] Speech recognition started (onSpeechStart)');
      setMicState('listening');

      // Pre-compute next agent response while user is speaking
      // Note: This uses the conversation history up to NOW (before user speaks)
      // It does NOT include what the user is currently saying
      console.log('[Session] Starting pre-computation for next agent while user speaks');
      startPreComputingDuringUserSpeech();
    },
    onSpeechEnd: () => {
      console.log('[Session] Speech recognition ended (onSpeechEnd)');
      // No longer auto-processing - continuous recording
    },
  });

  // Filter turns to only show moderator and user messages
  const displayedTurns = turns.filter(turn =>
    turn.speakerType === 'moderator' || turn.speakerType === 'participant'
  );

  // Ref for auto-scrolling chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedTurns.length]);

  // Start session when component mounts
  useEffect(() => {
    console.log('[Session] ========================================');
    console.log('[Session] 🔍 Session Start Effect Check');
    console.log('[Session] ========================================');
    console.log('[Session] isConnected:', isConnected);
    console.log('[Session] participant:', participant.name);
    console.log('[Session] sessionId:', sessionId);
    console.log('[Session] agents count:', agents.length);

    if (isConnected && !sessionId) {
      console.log('[Session] ✅ All conditions met, sending session_start message');
      const agentIds = agents.map((a) => a.id);

      sendMessage({
        type: 'session_start',
        payload: {
          participantId: participant.id,
          topic: topic?.title,
          agentIds,
        },
      });
      console.log('[Session] 📤 session_start message sent');
    } else {
      console.log('[Session] ⏭️ Not starting session (conditions not met)');
    }
  }, [isConnected, participant, sessionId, agents, topic, sendMessage]);

  // Listen to WebSocket messages
  useEffect(() => {
    on('session_start', async (payload) => {
      console.log('[Session] ========================================');
      console.log('[Session] 🎯 SESSION_START MESSAGE RECEIVED');
      console.log('[Session] ========================================');
      console.log('[Session] Payload:', payload);
      console.log('[Session] Session ID:', payload.sessionId);
      console.log('[Session] Topic:', payload.topic);
      console.log('[Session] Agents count:', payload.agents?.length || agents.length);

      // Loading is already true from initial state
      // Keep showing loading until first audio is ready

      setSessionId(payload.sessionId);
      console.log('[Session] ✅ Session ID set in state');

      // Initialize client-side conversation flow
      console.log('[Session] 🚀 Initializing client-side conversation flow...');
      await startSession(
        payload.sessionId,
        payload.agents || agents,
        participant.id,          // Pass participant ID
        participant.name || 'User',  // Pass participant name
        payload.topic,
        (audioUrl, id, onComplete, turnData) => {
          console.log('[Session] ========================================');
          console.log('[Session] 🔊 AUDIO READY FOR PLAYBACK');
          console.log('[Session] ========================================');
          console.log('[Session] Turn ID:', id);
          console.log('[Session] Audio URL:', audioUrl.substring(0, 50) + '...');

          // Clear loading when first audio is ready
          setIsLoading(false);
          setLoadingMessage('');
          console.log('[Session] ✅ Loading screen hidden');

          // Enqueue audio callback
          console.log('[Session] 📤 Enqueueing audio for playback');
          setMicState('speaking');

          // Track current speaker for audio
          if (turnData) {
            if (turnData.speakerType === 'agent') {
              setCurrentSpeakerId(turnData.speakerId || null);
            } else if (turnData.speakerType === 'moderator') {
              setCurrentSpeakerId('moderator');
            }
          }

          enqueueAudio(audioUrl, id, () => {
            console.log('[Session] Audio finished');
            setCurrentSpeakerId(null);
            onComplete();
          });
        },
        (message: string) => {
          // Update loading message during avatar initialization
          console.log('[Session] Loading progress:', message);
          setLoadingMessage(message);
        }
      );
    });

    on('state_change', (payload) => {
      console.log('[Session] ========================================');
      console.log('[Session] 🔄 STATE_CHANGE MESSAGE RECEIVED');
      console.log('[Session] ========================================');
      console.log('[Session] Payload:', payload);

      if (payload.loading !== undefined) {
        console.log('[Session] Loading state changed:', payload.loading);
        setIsLoading(payload.loading);
        if (payload.message) {
          console.log('[Session] Loading message:', payload.message);
          setLoadingMessage(payload.message);
        }
      }

      if (payload.micState) {
        console.log('[Session] Mic state from server:', payload.micState);
        setMicState(payload.micState);

        if (payload.micState === 'your-turn') {
          // Automatically start listening after a short delay
          console.log('[Session] 🎤 Your turn - will auto-start listening in 500ms');
          setTimeout(() => {
            console.log('[Session] ▶️ Auto-starting speech recognition');
            setMicState('listening');
            startListening();
          }, 500);
        }
      }
    });

    on('session_end', () => {
      console.log('[Session] ========================================');
      console.log('[Session] 🏁 SESSION_END MESSAGE RECEIVED');
      console.log('[Session] ========================================');
      console.log('[Session] Navigating to thank you page...');
      navigate(`/patient/${participantId}/thank-you`);
    });

    return () => {
      off('session_start');
      off('state_change');
      off('session_end');
    };
  }, [on, off, setSessionId, startSession, enqueueAudio, setMicState, startListening, navigate, participant, agents, turns]);

  // Log micState changes for debugging
  useEffect(() => {
    console.log('[Session] ===== MIC STATE CHANGED TO:', micState, '=====');
  }, [micState]);

  // Log isListening changes for debugging
  useEffect(() => {
    console.log('[Session] isListening changed to:', isListening);
  }, [isListening]);

  // Auto-start listening when micState changes to 'your-turn' (local state change)
  useEffect(() => {
    if (micState === 'your-turn') {
      console.log('[Session] 🎤 Mic state is your-turn - will auto-start listening in 500ms');
      const timeoutId = setTimeout(() => {
        console.log('[Session] ▶️ Auto-starting speech recognition for user turn');
        setMicState('listening');
        startListening();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [micState, startListening]);

  // Update live transcript from continuous recording
  // Combine accumulated finalized text with current interim result
  useEffect(() => {
    if (isListening) {
      // If we have an interim result, append it to accumulated
      // If not, just show accumulated
      console.log('[Session] Updating live transcript:', {
        accumulated: accumulatedTranscript,
        interim: interimResult,
      });

      const liveText = interimResult
        ? `${accumulatedTranscript} ${interimResult}`.trim()
        : accumulatedTranscript;

      if (liveText !== liveTranscript) {
        setLiveTranscript(liveText);
      }
    }
  }, [interimResult, accumulatedTranscript, isListening]);

  // Live transcript is displayed in the chat interface, no need for subtitle

  // Handle manually stopping recording
  const handleStopRecording = () => {
    console.log('[Session] ========================================');
    console.log('[Session] 🛑 USER STOPPED RECORDING');
    console.log('[Session] ========================================');
    stopListening();

    // Wait for speech recognition to finalize (speech recognition needs time to process final results)
    // Check both accumulated transcript (final results) and interim transcript as fallback
    setTimeout(() => {
      const currentTranscript = accumulatedTranscriptRef.current;
      const interimTranscript = transcript; // Interim results from useMicrophone
      console.log('[Session] Checking transcripts before showing confirmation...');
      console.log('[Session] Accumulated transcript length:', currentTranscript.length);
      console.log('[Session] Interim transcript length:', interimTranscript.length);
      console.log('[Session] Transcript preview (accumulated):', currentTranscript.substring(0, 100));
      console.log('[Session] Transcript preview (interim):', interimTranscript.substring(0, 100));

      // Use accumulated transcript if available, otherwise fall back to interim
      // IMPORTANT: Prefer the ref as it has the latest stitched content
      const transcriptToUse = accumulatedTranscriptRef.current.trim() || interimTranscript.trim();

      if (transcriptToUse.length > 0) {
        // If we're using interim transcript, update the accumulated transcript
        // If we're using interim transcript because accumulated was empty, update it now
        if (!currentTranscript.trim() && interimTranscript.trim()) {
          console.log('[Session] ℹ️ Using interim transcript as fallback');
          setAccumulatedTranscript(interimTranscript);
          accumulatedTranscriptRef.current = interimTranscript;
          // Don't update live transcript here to avoid flicker
        } else {
          console.log('[Session] ℹ️ Using existing accumulated transcript');
        }
        console.log('[Session] ✅ Transcript ready, showing confirmation screen');
        setMicState('confirming');
      } else {
        console.log('[Session] ⚠️ Both transcripts empty after delay, retrying...');
        // Try one more time with a longer delay
        setTimeout(() => {
          const retryAccumulated = accumulatedTranscriptRef.current;
          const retryInterim = transcript;
          const retryTranscriptToUse = retryAccumulated.trim() || retryInterim.trim();

          if (retryTranscriptToUse.length > 0) {
            // Update accumulated if using interim
            if (!retryAccumulated.trim() && retryInterim.trim()) {
              console.log('[Session] ℹ️ Using interim transcript as fallback (retry)');
              setAccumulatedTranscript(retryInterim);
              accumulatedTranscriptRef.current = retryInterim;
              setLiveTranscript(retryInterim);
            }
            console.log('[Session] ✅ Transcript ready on retry, showing confirmation screen');
            setMicState('confirming');
          } else {
            console.log('[Session] ❌ No transcript captured, returning to your-turn');
            setMicState('your-turn');
          }
        }, 500);
      }
    }, 500);
  };

  // Handle returning to recording from confirmation state
  const handleReturnToRecording = () => {
    console.log('[Session] ========================================');
    console.log('[Session] ↩️ USER RETURNING TO RECORDING');
    console.log('[Session] ========================================');
    console.log('[Session] Keeping accumulated transcript:', accumulatedTranscript.substring(0, 100) + '...');
    // Don't clear accumulated transcript - keep building on it
    setMicState('listening');
    setTimeout(() => {
      console.log('[Session] ▶️ Restarting speech recognition');
      startListening();
    }, 300);
  };

  // Reset accumulated transcript when starting a new turn
  useEffect(() => {
    if (micState === 'listening' && !isListening) {
      // Starting a fresh turn - reset accumulator only if we're truly starting fresh
      const isNewTurn = turns.length > 0 && turns[turns.length - 1].speakerType !== 'participant';
      if (isNewTurn && accumulatedTranscript) {
        console.log('[Session] Starting new turn, clearing previous accumulated transcript');
        setAccumulatedTranscript('');
        accumulatedTranscriptRef.current = '';
        setLiveTranscript('');
      }
    }
  }, [micState, isListening]);

  // Handle confirming and submitting the transcript
  const handleConfirmTranscript = async () => {
    console.log('[Session] ========================================');
    console.log('[Session] ✅ USER CONFIRMED TRANSCRIPT');
    console.log('[Session] ========================================');
    console.log('[Session] Session ID:', sessionId || 'MISSING');

    // Use REF to get the absolute latest value, avoiding stale closures
    const currentTranscript = accumulatedTranscriptRef.current;
    console.log('[Session] Transcript length:', currentTranscript.length);
    console.log('[Session] Transcript (first 200 chars):', currentTranscript.substring(0, 200));

    if (!sessionId) {
      console.error('[Session] ❌ Cannot submit - missing sessionId');
      alert('Session error: No session ID found. Please refresh the page.');
      return;
    }

    if (!currentTranscript.trim()) {
      console.error('[Session] ❌ Cannot submit - transcript is empty');
      console.error('[Session] Returning to recording...');
      setMicState('your-turn');
      return;
    }

    console.log('[Session] ✅ Validation passed, proceeding with submission');
    console.log('[Session] Full transcript:', currentTranscript);

    // Stop any ongoing speech recognition immediately
    console.log('[Session] 🛑 Stopping speech recognition');
    stopListening();

    const submittedTranscript = currentTranscript;

    // Clear both transcripts
    console.log('[Session] 🧹 Clearing transcript buffers');
    setLiveTranscript('');
    setAccumulatedTranscript('');
    accumulatedTranscriptRef.current = '';

    // Set to processing while handling turn
    console.log('[Session] ⏳ Setting state to processing');
    setMicState('processing');

    try {
      console.log('[Session] 🚀 Calling handleUserTurn...');
      // Use conversation flow hook to handle user turn (client-side management)
      await handleUserTurn(submittedTranscript, (audioUrl, id, onComplete, turnData) => {
        // Enqueue audio callback
        console.log('[Session] Enqueueing audio from user turn response');
        setMicState('speaking');

        // Track current speaker for audio
        if (turnData) {
          if (turnData.speakerType === 'agent') {
            setCurrentSpeakerId(turnData.speakerId || null);
          } else if (turnData.speakerType === 'moderator') {
            setCurrentSpeakerId('moderator');
          }
        }

        enqueueAudio(audioUrl, id, () => {
          console.log('[Session] Audio finished');
          setCurrentSpeakerId(null);
          onComplete();
        });
      });

      console.log('[Session] ========================================');
      console.log('[Session] ✅ User turn handled successfully');
      console.log('[Session] ========================================');
    } catch (error) {
      console.error('[Session] ========================================');
      console.error('[Session] ❌ ERROR HANDLING USER TURN');
      console.error('[Session] ========================================');
      console.error('[Session] Error:', error);
      console.error('[Session] Stack:', error instanceof Error ? error.stack : 'No stack');
      setMicState('your-turn');
    }
  };

  // Handle end conversation
  const handleEndConversation = () => {
    console.log('[Session] ========================================');
    console.log('[Session] 🏁 USER ENDED CONVERSATION');
    console.log('[Session] ========================================');
    console.log('[Session] Session ID:', sessionId);

    // 1. Clear caches and cleanup
    console.log('[Session] 🧹 Clearing caches and cleaning up conversation state');
    endSession();

    // 2. Notify server that conversation phase is ending (session continues for game)
    if (sessionId) {
      console.log('[Session] 📤 Sending conversation_end notification to server');
      sendMessage({
        type: 'conversation_end',
        payload: {
          sessionId,
          turnCount: turns.length,
          participantId: participant.id,
        },
      });
    } else {
      console.warn('[Session] ⚠️ No session ID, skipping server notification');
    }

    // 3. Show game choice screen
    console.log('[Session] 🎮 Showing game choice screen');
    console.log('[Session] Current showGameChoice state:', showGameChoice);
    setShowGameChoice(true);

    // Force re-render by checking state after a tick
    setTimeout(() => {
      console.log('[Session] ✅ showGameChoice state after update:', useConversationStore.getState().showGameChoice);
    }, 100);
  };

  // === Cognitive Game Handlers ===

  const handleStartGame = async () => {
    console.log('[Session] ========================================');
    console.log('[Session] 🎮 USER STARTING COGNITIVE GAME');
    console.log('[Session] ========================================');
    console.log('[Session] Session ID:', sessionId);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      console.log('[Session] 🌐 Fetching game from server...');
      const response = await fetch(`${API_URL}/api/cognitive-game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Session] ❌ Server error:', errorData);
        throw new Error('Failed to start game');
      }

      const data = await response.json();
      console.log('[Session] ✅ Game data received');
      console.log('[Session] Game type:', data.data.gameType);
      console.log('[Session] Questions count:', data.data.questions.length);

      // Load game into store
      console.log('[Session] 💾 Loading game into store');
      setGameType(data.data.gameType);
      setCognitiveGameQuestions(data.data.questions);
      setShowGameChoice(false);
      setShowCognitiveGame(true);
      startGame();
      console.log('[Session] ✅ Game started successfully');
    } catch (error) {
      console.error('[Session] ========================================');
      console.error('[Session] ❌ FAILED TO START GAME');
      console.error('[Session] ========================================');
      console.error('[Session] Error:', error);
      console.log('[Session] ⏭️ Falling back to skip game');
      handleSkipGame(); // Fallback: skip game
    }
  };

  const handleGameComplete = async (score: number, answers: GameAnswer[]) => {
    console.log('[Session] ========================================');
    console.log('[Session] ✅ COGNITIVE GAME COMPLETED');
    console.log('[Session] ========================================');
    console.log('[Session] Score:', score, '/', answers.length);
    console.log('[Session] Answers:', answers);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const durationSeconds = Math.floor((Date.now() - useConversationStore.getState().gameStartTime!) / 1000);

      console.log('[Session] 💾 Submitting game results to server');
      console.log('[Session] Duration:', durationSeconds, 'seconds');

      await fetch(`${API_URL}/api/cognitive-game/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          participantId: participant.id,
          gameType,
          score,
          totalQuestions: cognitiveGameQuestions.length,
          answers,
          durationSeconds,
        }),
      });
      console.log('[Session] ✅ Game results submitted successfully');
    } catch (error) {
      console.error('[Session] ❌ Failed to save game results:', error);
    }

    // Clear game state
    console.log('[Session] 🧹 Clearing game state');
    clearGameState();

    // End session
    console.log('[Session] 🏁 Ending session');
    sendMessage({ type: 'session_end', payload: { sessionId } });
  };

  const handleSkipGame = () => {
    console.log('[Session] ========================================');
    console.log('[Session] ⏭️ USER SKIPPED GAME');
    console.log('[Session] ========================================');
    console.log('[Session] 🧹 Clearing game state');
    clearGameState();
    setShowGameChoice(false);

    // End session
    console.log('[Session] 🏁 Ending session');
    sendMessage({ type: 'session_end', payload: { sessionId } });
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#FAFAFA] relative">
        {/* Whiteboard dot grid background - subtle */}
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="text-center relative z-10">
          <div className="mb-8">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[var(--color-accent)] border-t-transparent"></div>
          </div>
          <h2
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-3xl font-semibold text-[var(--color-text-primary)] mb-4"
          >
            {loadingMessage || 'Loading...'}
          </h2>
          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-lg text-[var(--color-text-secondary)]"
          >
            This will just take a moment
          </p>
        </div>
      </div>
    );
  }

  // Debug: Log render state
  console.log('[Session] Rendering with state:', {
    isLoading,
    hasTopic: !!topic,
    showGameChoice,
    showCognitiveGame,
    gameType,
    questionsCount: cognitiveGameQuestions.length
  });

  if (!topic) {
    console.warn('[Session] ⚠️ No topic found, showing redirect screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-2xl text-gray-700">No topic selected. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-primary)] relative overflow-hidden">
      {/* Soft gradient background - matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Header - Glassmorphism style matching admin pages */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <h1
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-xl font-bold tracking-tight text-gray-900"
          >
            {topic.iconEmoji} {topic.title}
          </h1>

          {/* Agent count badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <Users size={14} className="text-emerald-700" />
            <span
              className="text-xs font-semibold text-emerald-700"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
            </span>
          </div>
        </div>

        <button
          onClick={handleEndConversation}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-red-800 transition-colors rounded-lg"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <X size={16} strokeWidth={2.5} />
          End Conversation
        </button>
      </motion.header>

      {/* Main Content - Chat Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Welcome message */}
          {displayedTurns.length === 0 && !isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
                  <Users size={32} className="text-emerald-700" />
                </div>
              </div>
              <h2
                style={{ fontFamily: 'var(--font-serif)' }}
                className="text-2xl font-semibold text-gray-900 mb-2"
              >
                Welcome to your conversation
              </h2>
              <p
                style={{ fontFamily: 'var(--font-sans)' }}
                className="text-gray-600"
              >
                You'll be chatting with Maya and {agents.length} AI {agents.length === 1 ? 'agent' : 'agents'}
              </p>
            </motion.div>
          )}

          {/* Chat messages */}
          {displayedTurns.map((turn, index) => (
            <ChatBubble
              key={`${turn.sequenceNumber}-${index}`}
              speaker={turn.speakerName}
              message={turn.content}
              isModerator={turn.speakerType === 'moderator'}
              isUser={turn.speakerType === 'participant'}
              timestamp={turn.timestamp ? new Date(turn.timestamp) : undefined}
            />
          ))}

          {/* Live user input bubble while speaking */}
          {isListening && liveTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end mb-4"
            >
              <div className="max-w-[70%] items-end flex flex-col gap-1">
                <span
                  className="text-xs font-medium px-2 text-blue-600"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  You (typing...)
                </span>
                <div
                  className="rounded-2xl px-5 py-3 bg-blue-500 text-white rounded-tr-sm shadow-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <p className="text-[15px] leading-relaxed">{liveTranscript}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Microphone Bar - Fixed at bottom */}
      <div className="relative z-10">
        <MicrophoneBar
          micState={micState}
          transcript={liveTranscript}
          onStopRecording={handleStopRecording}
          onReturnToRecording={handleReturnToRecording}
          onConfirmTranscript={handleConfirmTranscript}
        />
      </div>

      {/* Game Screens */}
      <AnimatePresence mode="wait">
        {showGameChoice && (
          <>
            {console.log('[Session] 🎮 Rendering GameChoiceScreen')}
            <GameChoiceScreen
              key="game-choice"
              onYes={handleStartGame}
              onNo={handleSkipGame}
            />
          </>
        )}

        {showCognitiveGame && cognitiveGameQuestions.length > 0 && gameType && (
          <>
            {console.log('[Session] 🎯 Rendering CognitiveGame:', gameType)}
            <CognitiveGame
              key="cognitive-game"
              gameType={gameType}
              questions={cognitiveGameQuestions}
              onComplete={handleGameComplete}
              onSkip={handleSkipGame}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
