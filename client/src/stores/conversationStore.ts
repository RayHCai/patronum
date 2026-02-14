// Conversation state management with Zustand - NEW ARCHITECTURE (Linear Loop System)
import { create } from 'zustand';
import { Agent, Turn, MicState, CSTTopic } from '../types';
import { GameType, GameQuestion, GameAnswer } from '../types/cognitiveGame';

// NEW: Speaker type for linear loop system
export type SpeakerType = 'moderator' | 'user' | 'agent';

// NEW: Speaker in the ordered array
export interface Speaker {
  id: string;           // moderatorId, 'user', or agentId
  type: SpeakerType;
  name: string;
  voiceId?: string;     // undefined for user
  avatarColor?: string;
  heygenAvatarId?: string; // HeyGen avatar ID for video
}

// Speaker index system (used by conversation flow hooks)
export interface SpeakerIndex {
  index: number;
  type: SpeakerType;
  name: string;
  speakerId?: string;   // moderatorId, participantId, or agentId
  agentId?: string;     // For agents (deprecated, use speakerId)
  voiceId?: string;     // undefined for user
  avatarColor?: string;
  heygenAvatarId?: string;
}

// Conversation phases
export type ConversationPhase = 'opening' | 'exploration' | 'deepening' | 'integration' | 'closing';

interface ConversationState {
  // Session info
  sessionId: string | null;
  topic: CSTTopic | null;
  moderatorId: string | null;

  // Agents in conversation
  agents: Agent[];

  // Conversation turns
  turns: Turn[];

  // NEW: Linear Loop Turn Management
  speakers: Speaker[];          // The fixed ordered array [moderator, user, agent1, agent2, ...]
  currentIndex: number;         // Current position in speakers array
  loopCount: number;            // How many full loops completed
  maxLoops: number;             // 5 loops → then switch to games
  isPlaying: boolean;           // Audio currently playing
  isLoading: boolean;           // Show loading screen

  // Pre-generated turn cache (optimization)
  preGeneratedTurn: {
    speakerId: string;
    text: string;
    audioUrl: string | null;
    heygenSessionId?: string;   // HeyGen session for video
  } | null;

  // Speaker Index System (used by conversation flow hooks)
  speakerIndices: SpeakerIndex[];
  nextSpeakerIndex: number;
  currentSpeakerIndex: number;
  currentPhase: ConversationPhase;

  // Turn tracking for frequency rules
  turnsSinceUserSpoke: number;
  userTurnsInLastFive: number;
  turnsSinceModeratorSpoke: number;
  lastFiveTurnSpeakers: ('user' | 'agent' | 'moderator')[]; // Sliding window

  // Text generation cache
  textCache: Map<number, string>; // speakerIndex → cached text

  // Legacy state (kept for compatibility during migration)
  currentSpeaker: string | null;
  micState: MicState;
  isConnected: boolean;
  isProcessing: boolean;
  audioQueue: Array<{ url: string; agentId?: string }>;

  // === Cognitive Game State ===
  showGameChoice: boolean;
  showCognitiveGame: boolean;
  gameType: GameType | null;
  cognitiveGameQuestions: GameQuestion[];
  gameStartTime: number | null;
  gameScore: number;
  gameAnswers: GameAnswer[];

  // === Video Avatar State ===
  activeVideoStreams: Set<string>; // Agent IDs with active streams
  videoLoadingStates: Map<string, boolean>; // Agent ID → loading state
  videoErrors: Map<string, Error>; // Agent ID → error

  // === Actions ===

  // Original actions (kept for compatibility)
  setSessionId: (id: string) => void;
  setTopic: (topic: CSTTopic) => void;
  setAgents: (agents: Agent[]) => void;
  addTurn: (turn: Turn) => void;
  setCurrentSpeaker: (speaker: string | null) => void;
  setMicState: (state: MicState) => void;
  setIsConnected: (connected: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  enqueueAudio: (url: string, agentId?: string) => void;
  dequeueAudio: () => void;
  reset: () => void;

  // NEW: Linear Loop Actions
  setModeratorId: (id: string) => void;
  initializeSpeakers: (agents: Agent[], participantId: string, participantName: string, moderatorId?: string) => void;
  setCurrentIndex: (index: number) => void;
  advanceToNextSpeaker: (serverSuggestedAgentId?: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPreGeneratedTurn: (turn: ConversationState['preGeneratedTurn']) => void;
  clearPreGeneratedTurn: () => void;

  // Speaker Index System Actions
  setNextSpeakerIndex: (index: number) => void;
  setCurrentSpeakerIndex: (index: number) => void;
  updatePhase: (turnCount: number) => void;
  trackTurn: (type: 'user' | 'agent' | 'moderator') => void;
  getCachedText: (index: number) => string | null;
  cacheText: (index: number, text: string) => void;
  clearTextCache: () => void;

  // Cognitive game actions
  setShowGameChoice: (show: boolean) => void;
  setShowCognitiveGame: (show: boolean) => void;
  setGameType: (type: GameType | null) => void;
  setCognitiveGameQuestions: (questions: GameQuestion[]) => void;
  startGame: () => void;
  recordGameAnswer: (answer: GameAnswer) => void;
  completeGame: () => void;
  clearGameState: () => void;

  // Video avatar actions
  initializeAvatarVideo: (agentId: string) => void;
  destroyAvatarVideo: (agentId: string) => void;
  setVideoLoading: (agentId: string, loading: boolean) => void;
  setVideoError: (agentId: string, error: Error | null) => void;
  clearVideoState: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  // Initial state
  sessionId: null,
  topic: null,
  moderatorId: null,
  agents: [],
  turns: [],

  // NEW: Linear loop state
  speakers: [],
  currentIndex: 0,
  loopCount: 0,
  maxLoops: 5,
  isPlaying: false,
  isLoading: false,
  preGeneratedTurn: null,

  // Speaker Index System
  speakerIndices: [],
  nextSpeakerIndex: 0,
  currentSpeakerIndex: 0,
  currentPhase: 'opening',

  // Turn tracking
  turnsSinceUserSpoke: 0,
  userTurnsInLastFive: 0,
  turnsSinceModeratorSpoke: 0,
  lastFiveTurnSpeakers: [],

  // Text cache
  textCache: new Map(),

  // Legacy state
  currentSpeaker: null,
  micState: 'idle',
  isConnected: false,
  isProcessing: false,
  audioQueue: [],

  // Cognitive game state
  showGameChoice: false,
  showCognitiveGame: false,
  gameType: null,
  cognitiveGameQuestions: [],
  gameStartTime: null,
  gameScore: 0,
  gameAnswers: [],

  // Video avatar state
  activeVideoStreams: new Set(),
  videoLoadingStates: new Map(),
  videoErrors: new Map(),

  // === Original Actions (kept for compatibility) ===

  setSessionId: (id) => {
    console.log('[ConversationStore] Setting session ID:', id);
    set({ sessionId: id });
  },

  setTopic: (topic) => {
    console.log('[ConversationStore] Setting topic:', topic?.title);
    set({ topic });
  },

  setAgents: (agents) => {
    console.log('[ConversationStore] Setting agents:', agents.map(a => a.name).join(', '));
    set({ agents });
  },

  addTurn: (turn) => {
    console.log('[ConversationStore] Adding turn:', {
      speaker: turn.speakerName,
      type: turn.speakerType,
      contentPreview: turn.content.substring(0, 100) + (turn.content.length > 100 ? '...' : ''),
      sequenceNumber: turn.sequenceNumber
    });
    set((state) => ({
      turns: [...state.turns, turn]
    }));
  },

  setCurrentSpeaker: (speaker) => {
    console.log('[ConversationStore] Current speaker changed:', speaker);
    set({ currentSpeaker: speaker });
  },

  setMicState: (micState) => {
    console.log('[ConversationStore] Mic state changed:', micState);
    set({ micState });
  },

  setIsConnected: (connected) => {
    console.log('[ConversationStore] Connection state changed:', connected);
    set({ isConnected: connected });
  },

  setIsProcessing: (processing) => {
    console.log('[ConversationStore] Processing state changed:', processing);
    set({ isProcessing: processing });
  },

  enqueueAudio: (url, agentId) => {
    console.log('[ConversationStore] Enqueuing audio:', { url: url.substring(0, 50) + '...', agentId });
    set((state) => ({
      audioQueue: [...state.audioQueue, { url, agentId }]
    }));
  },

  dequeueAudio: () => {
    console.log('[ConversationStore] Dequeuing audio');
    set((state) => ({
      audioQueue: state.audioQueue.slice(1)
    }));
  },

  reset: () => {
    console.log('[ConversationStore] ⚠️ RESETTING ALL STATE');
    set({
      sessionId: null,
      topic: null,
      moderatorId: null,
      agents: [],
      turns: [],
      currentSpeaker: null,
      micState: 'idle',
      isConnected: false,
      isProcessing: false,
      audioQueue: [],
      speakers: [],
      currentIndex: 0,
      loopCount: 0,
      isPlaying: false,
      isLoading: false,
      preGeneratedTurn: null,
      speakerIndices: [],
      nextSpeakerIndex: 0,
      currentSpeakerIndex: 0,
      currentPhase: 'opening',
      turnsSinceUserSpoke: 0,
      userTurnsInLastFive: 0,
      turnsSinceModeratorSpoke: 0,
      lastFiveTurnSpeakers: [],
      textCache: new Map(),
    });
  },

  // === NEW: Linear Loop Actions ===

  setModeratorId: (id) => {
    console.log('[ConversationStore] Setting moderator ID:', id);
    set({ moderatorId: id });
  },

  /**
   * Initialize speakers array for linear loop system
   * Called after session initialization and agent generation
   */
  initializeSpeakers: (agents: Agent[], participantId: string, participantName: string, moderatorId?: string) => {
    console.log('[ConversationStore] Initializing speaker indices');
    console.log('[ConversationStore] Participant ID:', participantId);
    console.log('[ConversationStore] Participant Name:', participantName);
    console.log('[ConversationStore] Moderator ID:', moderatorId || 'Not provided');
    console.log('[ConversationStore] Agents:', agents.map(a => a.name).join(', '));

    // Get the current moderatorId from store if not provided
    const finalModeratorId = moderatorId || get().moderatorId || 'moderator-default';

    // Create speaker indices array
    const speakerIndices: SpeakerIndex[] = [
      // Index 0: Moderator
      {
        index: 0,
        type: 'moderator',
        name: 'Guide',
        speakerId: finalModeratorId,  // Store moderator ID
        voiceId: 'guide-voice', // Default moderator voice
      },
      // Index 1: User/Participant
      {
        index: 1,
        type: 'user',
        name: participantName,
        speakerId: participantId,  // Store participant ID
        // No voiceId for user
      },
      // Index 2+: Agents
      ...agents.map((agent, idx) => ({
        index: idx + 2,
        type: 'agent' as const,
        name: agent.name,
        speakerId: agent.id,  // Store agent ID as speakerId
        agentId: agent.id,     // Keep for backward compatibility
        voiceId: agent.voiceId,
        avatarColor: agent.avatarColor,
        heygenAvatarId: agent.heygenAvatarId,
      })),
    ];

    console.log('[ConversationStore] Speaker indices created:',
      speakerIndices.map(s => `${s.index}:${s.name}(${s.type},id:${s.speakerId})`).join(', ')
    );

    // Also create legacy speakers array for compatibility
    const speakers: Speaker[] = speakerIndices.map(si => ({
      id: si.speakerId || si.agentId || (si.type === 'user' ? 'user' : 'moderator'),
      type: si.type,
      name: si.name,
      voiceId: si.voiceId,
      avatarColor: si.avatarColor,
      heygenAvatarId: si.heygenAvatarId,
    }));

    set({
      speakerIndices,
      speakers,
      currentIndex: 0,
      currentSpeakerIndex: 0,
      nextSpeakerIndex: 0, // Start with moderator
      loopCount: 0,
      currentPhase: 'opening',
      turnsSinceUserSpoke: 0,
      userTurnsInLastFive: 0,
      turnsSinceModeratorSpoke: 0,
      lastFiveTurnSpeakers: [],
    });

    console.log('[ConversationStore] ✅ Speakers initialized successfully');
  },

  setCurrentIndex: (index) => {
    console.log('[ConversationStore] Setting current index:', index);
    set({ currentIndex: index });
  },

  /**
   * Advance to next speaker in the loop
   * If serverSuggestedAgentId is provided (user mentioned specific agent), jump to that agent
   * Otherwise, advance sequentially
   */
  advanceToNextSpeaker: (serverSuggestedAgentId?: string) => {
    const state = get();

    // If server suggested a specific agent, jump to that agent's index
    if (serverSuggestedAgentId) {
      const targetIndex = state.speakers.findIndex(s => s.id === serverSuggestedAgentId);
      if (targetIndex !== -1) {
        console.log(`[Store] Jumping to agent ${state.speakers[targetIndex].name} (index ${targetIndex})`);

        // Invalidate pre-generated turn if it doesn't match
        if (state.preGeneratedTurn && state.preGeneratedTurn.speakerId !== serverSuggestedAgentId) {
          set({ preGeneratedTurn: null });
        }

        set({ currentIndex: targetIndex });
        return;
      }
    }

    // Otherwise, advance sequentially
    const nextIndex = (state.currentIndex + 1) % state.speakers.length;

    // If we wrapped around to index 0, increment loopCount
    let newLoopCount = state.loopCount;
    if (nextIndex === 0 && state.currentIndex !== 0) {
      newLoopCount++;
      console.log(`[Store] Completed loop ${newLoopCount} of ${state.maxLoops}`);

      // Check if we should switch to games view
      if (newLoopCount >= state.maxLoops) {
        console.log('[Store] Max loops reached, showing game choice');
        set({ showGameChoice: true });
        return; // Don't advance - show game choice instead
      }
    }

    // Invalidate pre-generated turn if it doesn't match the next speaker
    let newPreGeneratedTurn = state.preGeneratedTurn;
    if (state.preGeneratedTurn && state.preGeneratedTurn.speakerId !== state.speakers[nextIndex].id) {
      newPreGeneratedTurn = null;
    }

    console.log(`[Store] Advancing from index ${state.currentIndex} to ${nextIndex}`);

    set({
      currentIndex: nextIndex,
      loopCount: newLoopCount,
      preGeneratedTurn: newPreGeneratedTurn,
    });
  },

  setIsLoading: (loading) => {
    console.log('[ConversationStore] Loading state changed:', loading);
    set({ isLoading: loading });
  },

  setIsPlaying: (playing) => {
    console.log('[ConversationStore] Playing state changed:', playing);
    set({ isPlaying: playing });
  },

  setPreGeneratedTurn: (turn) => {
    console.log('[ConversationStore] Setting pre-generated turn:', turn ? {
      speakerId: turn.speakerId,
      textPreview: turn.text.substring(0, 50) + '...',
      hasAudio: !!turn.audioUrl
    } : null);
    set({ preGeneratedTurn: turn });
  },

  clearPreGeneratedTurn: () => {
    console.log('[ConversationStore] Clearing pre-generated turn');
    set({ preGeneratedTurn: null });
  },

  // === Speaker Index System Actions ===

  setNextSpeakerIndex: (index: number) => {
    console.log('[ConversationStore] Setting next speaker index:', index);
    set({ nextSpeakerIndex: index });
  },

  setCurrentSpeakerIndex: (index: number) => {
    console.log('[ConversationStore] Setting current speaker index:', index);
    set({ currentSpeakerIndex: index });
  },

  updatePhase: (turnCount: number) => {
    let phase: ConversationPhase = 'opening';

    if (turnCount < 5) {
      phase = 'opening';
    } else if (turnCount < 15) {
      phase = 'exploration';
    } else if (turnCount < 25) {
      phase = 'deepening';
    } else if (turnCount < 35) {
      phase = 'integration';
    } else {
      phase = 'closing';
    }

    const currentPhase = get().currentPhase;
    if (currentPhase !== phase) {
      console.log(`[ConversationStore] Phase transition: ${currentPhase} → ${phase} (turn ${turnCount})`);
      set({ currentPhase: phase });
    }
  },

  trackTurn: (type: 'user' | 'agent' | 'moderator') => {
    const state = get();

    // Update sliding window
    const newWindow = [...state.lastFiveTurnSpeakers, type].slice(-5);
    const userTurnsInLastFive = newWindow.filter(t => t === 'user').length;

    // Update counters
    let turnsSinceUserSpoke = type === 'user' ? 0 : state.turnsSinceUserSpoke + 1;
    let turnsSinceModeratorSpoke = type === 'moderator' ? 0 : state.turnsSinceModeratorSpoke + 1;

    console.log('[ConversationStore] Turn tracked:', {
      type,
      turnsSinceUserSpoke,
      userTurnsInLastFive,
      turnsSinceModeratorSpoke,
    });

    set({
      lastFiveTurnSpeakers: newWindow,
      userTurnsInLastFive,
      turnsSinceUserSpoke,
      turnsSinceModeratorSpoke,
    });
  },

  getCachedText: (index: number) => {
    const cached = get().textCache.get(index);
    if (cached) {
      console.log(`[ConversationStore] Text cache hit for index ${index}`);
    }
    return cached || null;
  },

  cacheText: (index: number, text: string) => {
    console.log(`[ConversationStore] Caching text for index ${index}:`, text.substring(0, 50) + '...');
    const newCache = new Map(get().textCache);
    newCache.set(index, text);
    set({ textCache: newCache });
  },

  clearTextCache: () => {
    console.log('[ConversationStore] Clearing text cache');
    set({ textCache: new Map() });
  },

  // === Cognitive Game Actions ===

  setShowGameChoice: (show) => {
    console.log('[ConversationStore] Show game choice:', show);
    set({ showGameChoice: show });
  },

  setShowCognitiveGame: (show) => {
    console.log('[ConversationStore] Show cognitive game:', show);
    set({ showCognitiveGame: show });
  },

  setGameType: (type) => {
    console.log('[ConversationStore] Setting game type:', type);
    set({ gameType: type });
  },

  setCognitiveGameQuestions: (questions) => {
    console.log('[ConversationStore] Setting cognitive game questions:', questions.length, 'questions');
    set({ cognitiveGameQuestions: questions });
  },

  startGame: () => {
    console.log('[ConversationStore] ▶️ Starting game with timestamp:', Date.now());
    set({ gameStartTime: Date.now(), gameScore: 0, gameAnswers: [] });
  },

  recordGameAnswer: (answer) => {
    console.log('[ConversationStore] Recording game answer:', {
      questionId: answer.questionId,
      wasCorrect: answer.wasCorrect,
      timeSpent: answer.timeSpent
    });
    set((state) => {
      const isCorrect = answer.wasCorrect;
      return {
        gameAnswers: [...state.gameAnswers, answer],
        gameScore: isCorrect ? state.gameScore + 1 : state.gameScore,
      };
    });
  },

  completeGame: () => {
    const state = get();
    console.log('[ConversationStore] ✅ Game completed - Score:', state.gameScore, '/', state.gameAnswers.length);
  },

  clearGameState: () => {
    console.log('[ConversationStore] Clearing game state');
    set({
      showGameChoice: false,
      showCognitiveGame: false,
      gameType: null,
      cognitiveGameQuestions: [],
      gameStartTime: null,
      gameScore: 0,
      gameAnswers: [],
    });
  },

  // === Video Avatar Actions ===

  initializeAvatarVideo: (agentId) => set((state) => {
    const newStreams = new Set(state.activeVideoStreams);
    newStreams.add(agentId);
    console.log(`[Store] Initialized video for agent ${agentId}`);
    return { activeVideoStreams: newStreams };
  }),

  destroyAvatarVideo: (agentId) => set((state) => {
    const newStreams = new Set(state.activeVideoStreams);
    newStreams.delete(agentId);

    const newLoadingStates = new Map(state.videoLoadingStates);
    newLoadingStates.delete(agentId);

    const newErrors = new Map(state.videoErrors);
    newErrors.delete(agentId);

    console.log(`[Store] Destroyed video for agent ${agentId}`);

    return {
      activeVideoStreams: newStreams,
      videoLoadingStates: newLoadingStates,
      videoErrors: newErrors,
    };
  }),

  setVideoLoading: (agentId, loading) => set((state) => {
    const newLoadingStates = new Map(state.videoLoadingStates);
    newLoadingStates.set(agentId, loading);
    return { videoLoadingStates: newLoadingStates };
  }),

  setVideoError: (agentId, error) => set((state) => {
    const newErrors = new Map(state.videoErrors);
    if (error) {
      newErrors.set(agentId, error);
    } else {
      newErrors.delete(agentId);
    }
    return { videoErrors: newErrors };
  }),

  clearVideoState: () => set({
    activeVideoStreams: new Set(),
    videoLoadingStates: new Map(),
    videoErrors: new Map(),
  }),
}));
