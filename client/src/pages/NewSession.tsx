// NEW Session page - Linear loop architecture with HeyGen integration
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, SkipForward } from 'lucide-react';
import { useConversationStore } from '../stores/conversationStore';
import { useNewConversationFlow } from '../hooks/useNewConversationFlow';
import { useMicrophone } from '../hooks/useMicrophone';
import MicrophoneBar from '../components/session/MicrophoneBar';
import VideoAvatarGrid from '../components/session/VideoAvatarGrid';
import FloatingSubtitle from '../components/session/FloatingSubtitle';
import GameChoiceScreen from '../components/session/GameChoiceScreen';
import CognitiveGame from '../components/session/CognitiveGame';
import { GameAnswer } from '../types/cognitiveGame';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function NewSession() {
  const navigate = useNavigate();
  const participant = { id: 'demo-participant', name: 'User' };

  const {
    topic,
    agents,
    sessionId,
    speakers,
    currentIndex,
    loopCount,
    maxLoops,
    isLoading,
    isPlaying,
    micState,
    showGameChoice,
    showCognitiveGame,
    gameType,
    cognitiveGameQuestions,
    turns,
    setMicState,
    setShowGameChoice,
    setShowCognitiveGame,
    setGameType,
    setCognitiveGameQuestions,
    startGame,
    clearGameState,
  } = useConversationStore();

  const {
    initializeSession,
    handleUserTurn,
    skipCurrentSpeaker,
    executeAITurn,
    cleanup,
  } = useNewConversationFlow();

  const [liveTranscript, setLiveTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [currentSubtitle, setCurrentSubtitle] = useState<{
    speaker: string;
    color: string;
    text: string;
  } | null>(null);

  const { transcript, startListening, stopListening, isListening } = useMicrophone({
    onTranscript: (text) => {
      // Accumulate transcripts during the turn
      console.log('[NewSession] Transcript chunk received:', text.substring(0, 50));
      setAccumulatedTranscript((prev) => {
        const newText = prev ? `${prev} ${text}` : text;
        setLiveTranscript(newText);
        return newText;
      });
    },
    onSpeechStart: () => {
      console.log('[NewSession] Speech recognition started');
      setMicState('listening');
    },
    onSpeechEnd: () => {
      console.log('[NewSession] Speech recognition ended');
    },
  });

  // Initialize session on mount
  useEffect(() => {
    if (topic && !sessionId) {
      console.log('[NewSession] Initializing session...');
      initializeSession(participant.id, participant.name, topic.title).catch((error) => {
        console.error('[NewSession] Failed to initialize session:', error);
        // TODO: Show error to user
      });
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [topic, sessionId, initializeSession, cleanup]);

  // Update subtitle when turn changes
  useEffect(() => {
    if (speakers.length === 0 || currentIndex < 0) return;

    const currentSpeaker = speakers[currentIndex];
    const latestTurn = turns[turns.length - 1];

    if (latestTurn && latestTurn.speakerName === currentSpeaker?.name) {
      const color =
        currentSpeaker.type === 'moderator'
          ? '#065f46'
          : currentSpeaker.type === 'user'
          ? '#3B82F6'
          : currentSpeaker.avatarColor || '#8B5CF6';

      setCurrentSubtitle({
        speaker: currentSpeaker.name,
        color,
        text: latestTurn.content,
      });
    }
  }, [turns, currentIndex, speakers]);

  // Update subtitle for participant speech in real-time
  useEffect(() => {
    if (isListening && liveTranscript) {
      setCurrentSubtitle({
        speaker: 'You',
        color: '#3B82F6',
        text: liveTranscript,
      });
    } else if (!isListening && currentSubtitle?.speaker === 'You') {
      // Clear subtitle when participant stops speaking
      setCurrentSubtitle(null);
    }
  }, [isListening, liveTranscript]);

  // Clear subtitle when audio finishes
  useEffect(() => {
    if (!isPlaying && currentSubtitle && currentSubtitle.speaker !== 'You') {
      setCurrentSubtitle(null);
    }
  }, [isPlaying]);

  // Auto-start listening when it's user's turn
  useEffect(() => {
    if (micState === 'your-turn' && !isListening) {
      console.log('[NewSession] Auto-starting listening (user\'s turn)');
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [micState, isListening, startListening]);

  // Handle stop recording
  const handleStopRecording = () => {
    console.log('[NewSession] Stop recording clicked');
    stopListening();

    if (accumulatedTranscript.trim()) {
      console.log('[NewSession] Transcript exists, showing confirmation');
      setMicState('confirming');
    } else {
      console.log('[NewSession] No transcript, returning to your-turn');
      setMicState('your-turn');
    }
  };

  // Handle return to recording
  const handleReturnToRecording = () => {
    console.log('[NewSession] Returning to recording');
    setMicState('listening');
    setTimeout(() => {
      startListening();
    }, 300);
  };

  // Handle confirm transcript
  const handleConfirmTranscript = async () => {
    if (!accumulatedTranscript.trim()) return;

    console.log('[NewSession] Submitting transcript:', accumulatedTranscript);

    stopListening();

    const submittedTranscript = accumulatedTranscript;
    setLiveTranscript('');
    setAccumulatedTranscript('');
    setMicState('processing');

    try {
      await handleUserTurn(submittedTranscript);
      console.log('[NewSession] User turn handled successfully');
    } catch (error) {
      console.error('[NewSession] Error handling user turn:', error);
      setMicState('your-turn');
    }
  };

  // Handle skip turn
  const handleSkipTurn = () => {
    if (speakers.length === 0 || currentIndex < 0) return;

    const currentSpeaker = speakers[currentIndex];
    if (currentSpeaker.type === 'user') {
      console.warn('[NewSession] Cannot skip user turn');
      return;
    }

    console.log('[NewSession] Skipping turn');
    setCurrentSubtitle(null);
    skipCurrentSpeaker();
  };

  // Handle end conversation
  const handleEndConversation = async () => {
    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('[NewSession] Failed to complete session:', error);
      }
    }

    navigate('/thank-you');
  };

  // === Cognitive Game Handlers ===

  const handleStartGame = async () => {
    console.log('[NewSession] Starting cognitive game');

    try {
      const response = await fetch(`${API_URL}/api/cognitive-game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start game');
      }

      const data = await response.json();

      setGameType(data.data.gameType);
      setCognitiveGameQuestions(data.data.questions);
      setShowGameChoice(false);
      setShowCognitiveGame(true);
      startGame();
    } catch (error) {
      console.error('[NewSession] Failed to start game:', error);
      handleSkipGame();
    }
  };

  const handleGameComplete = async (score: number, answers: GameAnswer[]) => {
    console.log('[NewSession] Game complete, score:', score);

    try {
      const durationSeconds = Math.floor((Date.now() - useConversationStore.getState().gameStartTime!) / 1000);

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
    } catch (error) {
      console.error('[NewSession] Failed to save game results:', error);
    }

    clearGameState();
    handleEndConversation();
  };

  const handleSkipGame = () => {
    console.log('[NewSession] Skipping game');
    clearGameState();
    setShowGameChoice(false);
    handleEndConversation();
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#FAFAFA] relative">
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
            Preparing Your Conversation
          </h2>
          <p
            style={{ fontFamily: 'var(--font-sans)' }}
            className="text-lg text-[var(--color-text-secondary)]"
          >
            Setting up your personalized group conversation...
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

  const currentSpeaker = speakers[currentIndex];
  const currentSpeakerId = currentSpeaker?.type === 'user' ? null : currentSpeaker?.id;

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] relative">
      {/* Whiteboard dot grid background */}
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
            Loop {loopCount + 1} of {maxLoops} • Turn {turns.length + 1}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Skip button - show when AI is speaking */}
          {isPlaying && currentSpeaker?.type !== 'user' && (
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
            name: 'Maya',
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
