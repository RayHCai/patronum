// Server-side type definitions
import { Request } from 'express';
import { Agent, Admin, PatientUser, Participant } from '@prisma/client';

// ========================================
// Authentication
// ========================================

export interface JWTPayload {
  userId: string;
  role: 'admin' | 'patient';
  email?: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SignupDTO extends LoginDTO {
  name: string;
  dateOfBirth?: Date;
}

export interface AuthResponse {
  token: string;
  user: Admin | PatientUser;
  participant?: Participant;
}

// ========================================
// API Requests/Responses
// ========================================

export interface CreateParticipantDTO {
  name: string;
  email?: string;
  password?: string;
  notes?: string;
  photoUrl?: string;
  dateOfBirth?: Date;
  caregiver?: {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface UpdateParticipantDTO {
  name?: string;
  notes?: string;
  photoUrl?: string;
  dateOfBirth?: Date;
  caregiver?: any;
  isActive?: boolean;
}

export interface GenerateAgentsDTO {
  participantId: string;
  participantBackground?: string;
  count?: number; // Default: 5
}

export interface CreateSessionDTO {
  participantId: string;
  topic?: string;
  agentIds?: string[]; // If not provided, use all participant's agents
}

export interface SessionSummary {
  id: string;
  participantId: string;
  participantName: string;
  topic?: string;
  status: string;
  duration?: number; // in minutes
  turnCount?: number;
  startedAt: Date;
  endedAt?: Date;
}

// ========================================
// WebSocket
// ========================================

export type WSMessageType =
  | 'auth'
  | 'session_start'
  | 'conversation_end'
  | 'session_end'
  | 'error'
  | 'state_change'; // Kept for backward compatibility

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  error?: string;
}

export interface WSAuthPayload {
  token: string;
}

export interface WSSessionStartPayload {
  sessionId: string;
  topic?: string;
  agents: Agent[];
}

// WSTurnPayload - Deprecated: Client manages turns directly via HTTP API
// Kept for backward compatibility
export interface WSTurnPayload {
  speakerType: 'participant' | 'agent' | 'moderator';
  speakerId?: string;
  speakerName: string;
  content: string;
  audioUrl?: string;
  voiceId?: string; // Added for client-side audio fetching
}

// ========================================
// Conversation Engine
// ========================================

export interface ConversationContext {
  sessionId: string;
  participantId: string;
  participant: Participant;
  agents: Agent[];
  topic?: string;
  conversationHistory: TurnData[];
  currentPhase: ConversationPhase;
}

export type ConversationPhase =
  | 'opening'
  | 'exploration'
  | 'deepening'
  | 'synthesis'
  | 'closing';

export interface TurnData {
  id?: number;
  speakerType: 'participant' | 'agent' | 'moderator';
  speakerId?: string;
  speakerName: string;
  content: string;
  audioUrl?: string;
  timestamp: Date | string;
  sequenceNumber: number;
}

export interface OrchestratorState {
  phase: ConversationPhase;
  turnCount: number;
  participantTurnCount: number;
  lastSpeaker?: string;
  topicDrift: number; // 0-1 score
  engagementLevel: number; // 0-1 score
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  voiceId: string;
}

export interface ModeratorResponse {
  content: string;
  action: 'prompt' | 'transition' | 'close';
  targetSpeaker?: {
    type: 'agent' | 'participant';
    agentId?: string;
    agentName?: string;
  };
  reasoning?: {
    engagementLevel?: 'high' | 'medium' | 'low';
    strategyApplied?: string;
    rebalancingNeeded?: boolean;
  };
}

// Engagement scoring
export type EngagementLevel = 'high' | 'medium' | 'low';

export interface EngagementAssessment {
  level: EngagementLevel;
  emotionalEngagement: number; // 0-1
  clarity: number; // 0-1
  length: number; // word count
  hasConfusion: boolean;
  hasDistress: boolean;
}

// Session-local memory hooks
export interface SessionMemoryHook {
  type: 'personal_story' | 'named_person' | 'sensory_detail' | 'strong_emotion';
  content: string;
  turnNumber: number;
  timestamp: Date;
  keywords: string[];
}

// Speaker turn tracking for rebalancing
export interface SpeakerTurnTracker {
  [speakerId: string]: {
    name: string;
    type: 'participant' | 'agent' | 'moderator';
    consecutiveTurns: number;
    totalTurns: number;
    lastTurnNumber: number;
  };
}

// Next speaker decision with reasoning
export interface NextSpeakerDecision {
  type: 'agent' | 'moderator' | 'participant';
  agentId?: string;
  reasoning: {
    engagementLevel: EngagementLevel;
    strategyApplied?: string;
    rebalancingApplied: boolean;
    participantTurnsSinceLastSpeak: number;
  };
}

// Comfort topics for fast pivot
export interface ComfortTopic {
  topic: string;
  source: 'caregiver_notes' | 'past_session' | 'current_session';
  keywords: string[];
}

// ========================================
// AI Patient (Agent) API
// ========================================

export interface GenerateAgentResponseDTO {
  sessionId: string;
  agentId: string;
  conversationHistory: TurnData[];
  currentPhase: ConversationPhase;
  userReturnCounter?: number; // Number of times user has been returned to before moderator/agents
}

export interface GeneratePersonalitiesDTO {
  participantId: string;
  topic: string;
  count?: number;
  participantBackground?: string;
}

export interface AgentPersonality {
  name: string;
  age: number;
  background: {
    occupation: string;
    hometown: string;
    family: string;
    interests: string[];
  };
  personality: {
    traits: string[];
    speakingStyle: string;
    quirks: string[];
  };
  avatarColor: string;
  voiceId: string;
}

// ========================================
// AI Moderator API
// ========================================

export interface GenerateModeratorResponseDTO {
  sessionId: string;
  conversationHistory: TurnData[];
  currentPhase: ConversationPhase;
}

export interface GenerateModeratorOpeningDTO {
  sessionId: string;
  topic: string;
  participantName: string;
  agentNames: string[];
}

export interface GenerateModeratorClosingDTO {
  sessionId: string;
  conversationHistory: TurnData[];
  topic: string;
}

// ========================================
// Claude API
// ========================================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  system?: string;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ========================================
// ElevenLabs TTS
// ========================================

export interface TTSRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface TTSResponse {
  audioBuffer: Buffer;
  contentType: string;
}

// ========================================
// Memory & Reinforcement
// ========================================

export interface ExtractedMemory {
  agentId: string;
  memoryType: 'shared_story' | 'opinion' | 'preference' | 'event';
  content: string;
  keywords: string[];
}

export interface GenerateReinforcementDTO {
  sessionId: string;
  participantId: string;
  conversationSummary: string;
  keyMoments: string[];
  count?: number; // Default: 3-5
}

export interface ReinforcementPrompt {
  promptType: 'attribution' | 'comparison' | 'recall';
  question: string;
  correctAnswer: string;
  options?: string[];
  hint?: string;
}

// ========================================
// Analytics
// ========================================

export interface AnalyticsInput {
  sessionId: string;
  participantId: string;
  turns: TurnData[];
  duration: number; // in seconds
}

export interface AnalyticsOutput {
  turnCount: number;
  participantTurnCount: number;
  avgTurnLength: number;
  lexicalDiversity: number;
  topicCoherenceScore: number;
  repeatedPhrases: Array<{ phrase: string; count: number }>;
  repeatedStories: Array<{ story: string; count: number }>;
}

export interface ConversationGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  componentTimeline: ComponentActivity[];
}

export interface GraphNode {
  id: string;
  type: 'turn' | 'topic' | 'event';
  speaker?: string;
  content?: string;
  timestamp: Date;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'response' | 'reference' | 'continuation';
}

export interface ComponentActivity {
  timestamp: Date;
  component: 'moderator' | 'agent' | 'participant';
  active: boolean;
}

// ========================================
// Errors
// ========================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}
