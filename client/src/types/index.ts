// Client-side type definitions

// ========================================
// Authentication & Users
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'admin';
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'clinician' | 'administrator';
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PatientUser {
  id: string;
  email?: string;
  participantId: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User | Admin | PatientUser;
  participant?: Participant;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  dateOfBirth?: string;
}

// ========================================
// Participant & Agent
// ========================================

export interface Participant {
  id: string;
  name: string;
  notes?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  caregiver?: {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
  isActive: boolean;
  createdAt: string;
  agents?: Agent[];
  sessions?: Session[];
}

export interface Agent {
  id: string;
  participantId: string;
  name: string;
  age?: number;
  background: {
    occupation?: string;
    family?: string;
    hometown?: string;
    [key: string]: any;
  };
  personality: {
    traits?: string[];
    speakingStyle?: string;
    quirks?: string[];
    [key: string]: any;
  };
  avatarColor: string;
  voiceId: string;
  heygenAvatarId?: string;
  heygenConfig?: HeygenAvatarConfig;
  createdAt: string;
  memories?: AgentMemory[];
}

export interface AgentMemory {
  id: number;
  agentId: string;
  sessionId: string;
  memoryType: 'shared_story' | 'opinion' | 'preference' | 'event';
  content: string;
  keywords?: string[];
  createdAt: string;
}

// ========================================
// Session & Conversation
// ========================================

export interface Session {
  id: string;
  participantId: string;
  topic?: string;
  status: 'active' | 'completed' | 'cancelled';
  fullAudioUrl?: string;
  conversationGraph?: ConversationGraph;
  aiSummary?: string;
  startedAt: string;
  endedAt?: string;
  turns?: Turn[];
  reinforcementItems?: ReinforcementItem[];
  sessionAnalytics?: SessionAnalytics[];
}

export interface Turn {
  id: number;
  sessionId: string;
  speakerType: 'participant' | 'agent' | 'moderator';
  speakerId?: string;
  speakerName: string;
  content: string;
  audioUrl?: string;
  timestamp: string;
  sequenceNumber: number;
}

export interface ConversationGraph {
  nodes: ConversationNode[];
  edges: ConversationEdge[];
  componentTimeline: ComponentActivity[];
}

export interface ConversationNode {
  id: string;
  type: 'turn' | 'topic' | 'event';
  speaker?: string;
  content?: string;
  timestamp: string;
}

export interface ConversationEdge {
  source: string;
  target: string;
  type: 'response' | 'reference' | 'continuation';
}

export interface ComponentActivity {
  timestamp: string;
  component: 'moderator' | 'agent' | 'participant';
  active: boolean;
}

// ========================================
// WebSocket & Real-time
// ========================================

export interface WebSocketMessage {
  type: WSMessageType;
  payload?: any;
  error?: string;
}

export type WSMessageType =
  | 'auth'
  | 'session_start'
  | 'conversation_end'
  | 'session_end'
  | 'turn_start'
  | 'turn_end'
  | 'skip_turn'
  | 'agent_speaking'
  | 'audio_chunk'
  | 'transcript'
  | 'error'
  | 'state_change';

export interface ConversationState {
  sessionId: string | null;
  participants: Agent[];
  turns: Turn[];
  currentSpeaker: string | null;
  micState: MicState;
  isConnected: boolean;
  isProcessing: boolean;
}

export type MicState =
  | 'idle'       // 💤 Waiting for conversation to start
  | 'your-turn'  // 🎤 Your turn to speak
  | 'listening'  // 👂 Recording user speech
  | 'confirming' // ⏸️ Pause before submitting (can return to recording)
  | 'processing' // 💭 Transcribing/processing
  | 'speaking';  // 💬 Agent is speaking

// ========================================
// Reinforcement & Quiz
// ========================================

export interface ReinforcementItem {
  id: number;
  sessionId: string;
  participantId: string;
  promptType: 'attribution' | 'comparison' | 'recall';
  question: string;
  correctAnswer: string;
  options?: string[];
  hint?: string;
  participantAnswer?: string;
  wasCorrect?: boolean;
  answeredAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  easeFactor: number;
}

// ========================================
// Analytics
// ========================================

export interface SessionAnalytics {
  id: number;
  sessionId: string;
  participantId: string;
  turnCount?: number;
  participantTurnCount?: number;
  avgTurnLength?: number;
  lexicalDiversity?: number;
  topicCoherenceScore?: number;
  repeatedPhrases?: Array<{ phrase: string; count: number }>;
  repeatedStories?: Array<{ story: string; count: number }>;
  sentimentAnalysis?: {
    overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    emotionalTone?: any;
    cognitiveIndicators?: any;
    communicationPatterns?: any;
    socialEngagement?: any;
    concernFlags?: string[];
    positiveIndicators?: string[];
    summary?: string;
  };
  computedAt: string;
}

export interface LongitudinalAnalytics {
  participantId: string;
  totalSessions: number;
  averageSessionDuration: number;
  lexicalDiversityTrend: Array<{ date: string; score: number }>;
  engagementTrend: Array<{ date: string; turnCount: number }>;
  topRecurringTopics: Array<{ topic: string; frequency: number }>;
}

// ========================================
// CST Topics
// ========================================

export interface CSTTopic {
  id: string;
  title: string;
  description: string;
  category: 'nostalgia' | 'current-events' | 'personal' | 'creative' | 'discussion';
  icon: string;
  backgroundColor: string;
}

// ========================================
// UI Component Props
// ========================================

export interface PatientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'large' | 'medium';
  disabled?: boolean;
  loading?: boolean;
}

export interface SpeakerBubbleProps {
  speaker: string;
  content: string;
  avatarColor: string;
  isCurrentSpeaker: boolean;
  timestamp: string;
}

// ========================================
// HeyGen Avatar Types
// ========================================

export interface HeygenAvatarAppearance {
  gender: 'male' | 'female';
  ethnicity: string;
  age: number;
  clothing: string;
  background: string;
}

export interface HeygenAvatarConfig {
  avatarId: string;
  appearance: HeygenAvatarAppearance;
  createdAt: string;
  lastUsed: string;
}

export interface HeygenSessionToken {
  token: string;
  url: string;
  expiresAt: number;
}

export interface VideoStreamState {
  agentId: string;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  stream: MediaStream | null;
}
