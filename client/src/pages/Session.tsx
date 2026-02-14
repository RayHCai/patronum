// Session page - Voice-only conversation interface (MOST CRITICAL PAGE)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, SkipForward } from 'lucide-react';
import { useConversationStore } from '../stores/conversationStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useMicrophone } from '../hooks/useMicrophone';
import { useConversationFlow } from '../hooks/useConversationFlow';
import { usePatient } from '../contexts/PatientContext';
import MicrophoneBar from '../components/session/MicrophoneBar';
import VideoAvatarGrid from '../components/session/VideoAvatarGrid';
import FloatingSubtitle from '../components/session/FloatingSubtitle';
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
  const { enqueue: enqueueAudio, clear: clearAudio } = useAudioPlayback();
  const { startSession, handleUserTurn, skipToNextSpeaker, startPreComputingDuringUserSpeech } = useConversationFlow();

  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState(''); // Accumulate full turn transcript
  const [isLoading, setIsLoading] = useState(true); // Start loading immediately
  const [loadingMessage, setLoadingMessage] = useState('Preparing your conversation...');
  const [currentSubtitle, setCurrentSubtitle] = useState<{
    speaker: string;
    color: string;
    text: string;
  } | null>(null);

  const { transcript, startListening, stopListening, isListening } = useMicrophone({
    onTranscript: (text) => {
      // Accumulate transcripts during the turn
      console.log('[Session] Transcript chunk received:', text.substring(0, 50));
      setAccumulatedTranscript((prev) => {
        const newText = prev ? `${prev} ${text}` : text;
        setLiveTranscript(newText);
        return newText;
      });
    },
    onSpeechStart: () => {
      console.log('[Session] Speech recognition started (onSpeechStart)');
      setMicState('listening');

      // Start pre-computing the next agent's response WHILE user is speaking
      console.log('[Session] Starting pre-computation of next agent response during user speech');
      startPreComputingDuringUserSpeech();
    },
    onSpeechEnd: () => {
      console.log('[Session] Speech recognition ended (onSpeechEnd)');
      // No longer auto-processing - continuous recording
    },
  });

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

          // Use turn data passed directly from the callback
          if (turnData) {
            const color =
              turnData.speakerType === 'moderator'
                ? '#065f46'
                : turnData.avatarColor || '#8B5CF6';

            setCurrentSubtitle({
              speaker: turnData.speakerName,
              color: color,
              text: turnData.content,
            });

            if (turnData.speakerType === 'agent') {
              setCurrentSpeakerId(turnData.speakerId || null);
            } else if (turnData.speakerType === 'moderator') {
              setCurrentSpeakerId('moderator');
            }
          }

          enqueueAudio(audioUrl, id, () => {
            console.log('[Session] Audio finished');
            setCurrentSpeakerId(null);
            setCurrentSubtitle(null);
            onComplete();
          });
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
  useEffect(() => {
    if (transcript && isListening) {
      setLiveTranscript(transcript);
    }
  }, [transcript, isListening]);

  // Update subtitle for participant speech in real-time
  useEffect(() => {
    if (isListening && liveTranscript) {
      setCurrentSubtitle({
        speaker: 'You',
        color: '#3B82F6',
        text: liveTranscript,
      });
    } else if (!isListening) {
      // Clear subtitle when participant stops speaking (but only if it's the participant's subtitle)
      setCurrentSubtitle((prev) => (prev?.speaker === 'You' ? null : prev));
    }
  }, [isListening, liveTranscript]);

  // Handle manually stopping recording
  const handleStopRecording = () => {
    console.log('[Session] ========================================');
    console.log('[Session] 🛑 USER STOPPED RECORDING');
    console.log('[Session] ========================================');
    console.log('[Session] Transcript length:', accumulatedTranscript.length);
    console.log('[Session] Transcript:', accumulatedTranscript.substring(0, 200) + (accumulatedTranscript.length > 200 ? '...' : ''));
    stopListening();

    if (accumulatedTranscript.trim()) {
      console.log('[Session] ✅ Transcript exists, showing confirmation screen');
      setMicState('confirming');
    } else {
      console.log('[Session] ⚠️ No transcript captured, returning to your-turn');
      setMicState('your-turn');
    }
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
        setLiveTranscript('');
      }
    }
  }, [micState, isListening]);

  // Handle confirming and submitting the transcript
  const handleConfirmTranscript = async () => {
    console.log('[Session] ========================================');
    console.log('[Session] ✅ USER CONFIRMED TRANSCRIPT');
    console.log('[Session] ========================================');

    if (!sessionId || !accumulatedTranscript.trim()) {
      console.error('[Session] ❌ Cannot submit - missing sessionId or transcript');
      return;
    }

    console.log('[Session] Session ID:', sessionId);
    console.log('[Session] Transcript length:', accumulatedTranscript.length);
    console.log('[Session] Full transcript:', accumulatedTranscript);

    // Stop any ongoing speech recognition immediately
    console.log('[Session] 🛑 Stopping speech recognition');
    stopListening();

    const submittedTranscript = accumulatedTranscript;

    // Clear both transcripts
    console.log('[Session] 🧹 Clearing transcript buffers');
    setLiveTranscript('');
    setAccumulatedTranscript('');

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

        // Use turn data passed directly from the callback
        if (turnData) {
          const color =
            turnData.speakerType === 'moderator'
              ? '#065f46'
              : turnData.avatarColor || '#8B5CF6';

          setCurrentSubtitle({
            speaker: turnData.speakerName,
            color: color,
            text: turnData.content,
          });

          if (turnData.speakerType === 'agent') {
            setCurrentSpeakerId(turnData.speakerId || null);
          } else if (turnData.speakerType === 'moderator') {
            setCurrentSpeakerId('moderator');
          }
        }

        enqueueAudio(audioUrl, id, () => {
          console.log('[Session] Audio finished');
          setCurrentSpeakerId(null);
          setCurrentSubtitle(null);
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

    if (sessionId) {
      console.log('[Session] 📤 Sending session_end message to server');
      sendMessage({
        type: 'session_end',
        payload: { sessionId },
      });
    } else {
      console.warn('[Session] ⚠️ No session ID, skipping server notification');
    }

    console.log('[Session] 🚀 Navigating to thank you page');
    navigate(`/patient/${participantId}/thank-you`);
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

  // Handle skip to next agent
  const handleSkipTurn = () => {
    console.log('[Session] ========================================');
    console.log('[Session] ⏭️ USER SKIPPED TURN');
    console.log('[Session] ========================================');

    if (!sessionId) {
      console.error('[Session] ❌ Cannot skip - no active session');
      return;
    }

    console.log('[Session] Session ID:', sessionId);
    console.log('[Session] Current speaker:', currentSpeakerId);

    // Stop current audio playback
    console.log('[Session] 🔇 Clearing audio playback');
    clearAudio();

    // Clear current subtitle and speaker
    console.log('[Session] 🧹 Clearing subtitle and speaker state');
    setCurrentSpeakerId(null);
    setCurrentSubtitle(null);

    // Set to idle while waiting for next agent
    console.log('[Session] ⏸️ Setting state to idle');
    setMicState('idle');

    // Use conversation flow hook to skip (client-side management)
    console.log('[Session] 🚀 Calling skipToNextSpeaker...');
    skipToNextSpeaker((audioUrl, id, onComplete, turnData) => {
      // Enqueue audio callback
      console.log('[Session] Enqueueing audio after skip');
      setMicState('speaking');

      // Use turn data passed directly from the callback
      if (turnData) {
        const color =
          turnData.speakerType === 'moderator'
            ? '#065f46'
            : turnData.avatarColor || '#8B5CF6';

        setCurrentSubtitle({
          speaker: turnData.speakerName,
          color: color,
          text: turnData.content,
        });

        if (turnData.speakerType === 'agent') {
          setCurrentSpeakerId(turnData.speakerId || null);
        } else if (turnData.speakerType === 'moderator') {
          setCurrentSpeakerId('moderator');
        }
      }

      enqueueAudio(audioUrl, id, () => {
        console.log('[Session] Audio finished after skip');
        setCurrentSpeakerId(null);
        setCurrentSubtitle(null);
        onComplete();
      });
    });
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

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-700">No topic selected. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] relative">
      {/* Whiteboard dot grid background - subtle */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)] px-8 py-6 flex items-center justify-between">
        <div>
          <h1
            style={{ fontFamily: 'var(--font-serif)' }}
            className="text-2xl font-semibold text-[var(--color-text-primary)]"
          >
            {topic.iconEmoji} {topic.title}
          </h1>
          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-sm text-[var(--color-text-secondary)]"
          >
            Turn {turns.length + 1}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Skip button - show when agent or moderator is speaking */}
          {(micState === 'speaking' || currentSpeakerId) && (
            <button
              onClick={handleSkipTurn}
              className="flex items-center gap-2 px-6 py-3 text-[15px] font-medium text-[var(--color-text-secondary)] border-2 border-[var(--color-border-hover)] rounded-md hover:border-[var(--color-text-primary)] transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
              title="Skip to next speaker"
            >
              <SkipForward size={20} />
              Skip Turn
            </button>
          )}

          <button
            onClick={handleEndConversation}
            className="flex items-center gap-2 px-6 py-3 text-[15px] font-semibold text-white bg-[var(--color-accent)] rounded-md hover:shadow-lg transition-shadow"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <X size={20} />
            End Conversation
          </button>
        </div>
      </div>

      {/* Main Content - Video Avatar Grid */}
      <div className="relative z-10 flex-1 p-6 overflow-visible">
        <VideoAvatarGrid
          agents={agents}
          participantName={participant.name || 'You'}
          currentSpeakerId={currentSpeakerId}
          moderator={{
            id: 'moderator',
            name: 'Guide',
            color: '#065f46',
          }}
        />
      </div>

      {/* Floating Subtitle */}
      <FloatingSubtitle
        speaker={currentSubtitle?.speaker || ''}
        text={currentSubtitle?.text || ''}
        color={currentSubtitle?.color || '#000'}
        isVisible={!!currentSubtitle}
      />

      {/* Microphone Bar */}
      <MicrophoneBar
        micState={micState}
        transcript={liveTranscript}
        onStopRecording={handleStopRecording}
        onReturnToRecording={handleReturnToRecording}
        onConfirmTranscript={handleConfirmTranscript}
      />

      {/* Game Choice Screen */}
      {showGameChoice && (
        <GameChoiceScreen
          onYes={handleStartGame}
          onNo={handleSkipGame}
        />
      )}

      {/* Cognitive Game */}
      {showCognitiveGame && cognitiveGameQuestions.length > 0 && gameType && (
        <CognitiveGame
          gameType={gameType}
          questions={cognitiveGameQuestions}
          onComplete={handleGameComplete}
          onSkip={handleSkipGame}
        />
      )}
    </div>
  );
}
