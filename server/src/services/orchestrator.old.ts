// Conversation Orchestrator - manages conversation flow
import { prisma } from '../prisma/client';
import {
  ConversationContext,
  TurnData,
  WSMessage,
  OrchestratorState,
} from '../types';
import { generateModeratorPrompt, generateAgentResponse, decideNextSpeaker, generateAgentPersonalities } from './claude';
import { textToAudioBuffer } from './elevenLabs';
import { generateAgents } from './agent';
import { uploadAudioToS3, generateAudioKey } from './s3';

interface PreComputedTurn {
  type: 'agent' | 'moderator';
  agentId?: string;
  content: string;
  audioBuffer: Buffer;
  speakerName: string;
  voiceId?: string;
}

interface SpeakerIndex {
  index: number;
  type: 'moderator' | 'user' | 'agent';
  agentId?: string;
  name: string;
}

interface ActiveSession {
  id: string;
  participantId: string;
  topic?: string;
  agents: any[];
  context: ConversationContext;
  state: OrchestratorState;
  sendMessage: (message: WSMessage) => void;
  turnsSinceParticipantSpoke: number; // Track turns since participant last spoke
  audioBuffers: Array<{ turnId: string; audioBuffer: Buffer; turn: any }>; // Store audio for S3 upload
  currentTurnTranscripts: string[]; // Accumulate transcripts for current turn

  // New simplified flow
  speakerIndices: SpeakerIndex[]; // 0=moderator, 1=user, 2+=agents
  currentSpeakerIndex: number; // Who is currently speaking
  nextSpeakerIndex: number; // Who speaks next (pre-computed)
  preComputedMessageText: string | null; // Pre-computed text for next speaker
  isPreComputingMessage: boolean; // Flag to prevent concurrent pre-computation

  // Turn frequency tracking
  userTurnsInLastFive: number; // How many times user spoke in last 5 turns
  turnsSinceUserSpoke: number; // How many turns since user last spoke
  turnsSinceModeratorSpoke: number; // How many turns since moderator last spoke
  last5Turns: Array<'user' | 'agent' | 'moderator'>; // Track last 5 turns for frequency analysis

  // Legacy fields (for old pre-computation system - not used in simplified flow)
  preComputedTurns: PreComputedTurn[];
  isPreComputingTurns: boolean;
}

const activeSessions = new Map<string, ActiveSession>();

// ========================================
// Session Management
// ========================================

export const startConversationSession = async (
  participantId: string,
  topic?: string,
  agentIds?: string[],
  sendMessage: (message: WSMessage) => void = () => {}
) => {
  // Send loading state to client
  sendMessage({
    type: 'state_change',
    payload: { loading: true, message: 'Preparing your conversation...' },
  });

  // Get participant
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Get or create agents
  let agents;
  if (agentIds && agentIds.length > 0) {
    agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
    });
  } else {
    agents = await prisma.agent.findMany({
      where: { participantId },
    });
  }

  // Generate custom agents for this session if none exist
  if (agents.length === 0) {
    console.log(`No agents found for participant ${participantId}, generating custom agents for topic "${topic}"...`);

    sendMessage({
      type: 'state_change',
      payload: { loading: true, message: 'Creating your conversation partners...' },
    });

    // Generate custom personalities using Claude
    const personalities = await generateAgentPersonalities(
      participant.notes || '',
      topic || 'general conversation',
      5
    );

    // If AI generation failed, fall back to default generation
    if (personalities.length === 0) {
      console.log('AI generation failed, using default agents');
      agents = await generateAgents({
        participantId,
        participantBackground: participant.notes || '',
        count: 5,
      });
    } else {
      // Create agents in database with AI-generated personalities
      agents = await Promise.all(
        personalities.map((profile) =>
          prisma.agent.create({
            data: {
              participantId,
              name: profile.name,
              age: profile.age,
              background: profile.background,
              personality: profile.personality,
              avatarColor: profile.avatarColor,
              voiceId: profile.voiceId,
            },
          })
        )
      );
    }

    console.log(`Generated ${agents.length} custom agents for participant ${participantId}`);
  }

  // Create session in database
  const session = await prisma.session.create({
    data: {
      participantId,
      topic,
      status: 'active',
    },
  });

  // Initialize conversation context
  const context: ConversationContext = {
    sessionId: session.id,
    participantId,
    participant,
    agents,
    topic,
    conversationHistory: [],
    currentPhase: 'opening',
  };

  // Initialize orchestrator state
  const state: OrchestratorState = {
    phase: 'opening',
    turnCount: 0,
    participantTurnCount: 0,
    topicDrift: 0,
    engagementLevel: 1.0,
  };

  // Create speaker indices: 0=moderator, 1=user, 2+=agents
  const speakerIndices: SpeakerIndex[] = [
    { index: 0, type: 'moderator', name: 'Moderator' },
    { index: 1, type: 'user', name: participant.name },
    ...agents.map((agent, idx) => ({
      index: idx + 2,
      type: 'agent' as const,
      agentId: agent.id,
      name: agent.name,
    })),
  ];

  console.log(`[Session Start] Created ${speakerIndices.length} speakers:`, speakerIndices.map(s => `${s.index}:${s.name}`).join(', '));

  // Store active session
  const activeSession: ActiveSession = {
    id: session.id,
    participantId,
    topic,
    agents,
    context,
    state,
    sendMessage,
    turnsSinceParticipantSpoke: 0,
    audioBuffers: [], // Store audio for S3 upload later
    currentTurnTranscripts: [], // Accumulate transcripts

    // New simplified flow
    speakerIndices,
    currentSpeakerIndex: 0, // Start with moderator
    nextSpeakerIndex: 1, // After moderator, always go to user
    preComputedMessageText: null,
    isPreComputingMessage: false,

    // Turn frequency tracking
    userTurnsInLastFive: 0, // User hasn't spoken yet
    turnsSinceUserSpoke: 0, // User hasn't spoken yet
    turnsSinceModeratorSpoke: 0, // Moderator is about to speak
    last5Turns: [], // Empty at start

    // Legacy fields (not used in simplified flow)
    preComputedTurns: [],
    isPreComputingTurns: false,
  };

  activeSessions.set(session.id, activeSession);

  // Pre-generate moderator opening
  sendMessage({
    type: 'state_change',
    payload: { loading: true, message: 'Starting conversation...' },
  });

  console.log(`[Session Start] Generating opening moderator turn (index 0) for session ${session.id}`);

  // Start conversation with moderator opening
  await generateModeratorTurn(session.id);

  console.log(`[Session Start] Moderator opening completed. Next speaker: user (index 1)`);

  // Clear loading state
  sendMessage({
    type: 'state_change',
    payload: { loading: false },
  });

  // After moderator speaks, signal it's the user's turn
  // Wait for moderator audio to finish (estimate based on text length)
  // Average speaking rate: ~150 words/min = 2.5 words/sec, ~5 chars/word = ~12.5 chars/sec
  // Add buffer for natural pauses and ensure audio fully plays: ~100ms per char + 2 sec buffer
  const contentLength = context.conversationHistory[0]?.content.length || 50;
  const estimatedAudioDuration = Math.max(contentLength * 100 + 2000, 5000); // Minimum 5 seconds
  console.log(`[Session Start] Estimated audio duration: ${estimatedAudioDuration}ms for ${contentLength} chars`);

  setTimeout(() => {
    console.log(`[Session Start] Moderator audio finished, signaling user's turn`);
    sendMessage({
      type: 'state_change',
      payload: { micState: 'your-turn' },
    });
  }, estimatedAudioDuration);

  return {
    id: session.id,
    agents,
    topic,
  };
};

// ========================================
// Turn Generation
// ========================================

export const generateModeratorTurn = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  console.log(`[Moderator Turn] Starting generation for session ${sessionId}`);

  // Generate moderator prompt
  const content = await generateModeratorPrompt(session.context);
  console.log(`[Moderator Turn] Generated content (${content.length} chars)`);

  // Generate audio and save turn in parallel
  const audioPromise = textToAudioBuffer(content, 'moderator_voice');
  const turnPromise = saveTurn(sessionId, {
    speakerType: 'moderator',
    speakerName: 'Moderator',
    content,
    audioUrl: undefined, // Will be updated after S3 upload
    timestamp: new Date(),
    sequenceNumber: session.state.turnCount,
  });

  const [audioBuffer, turn] = await Promise.all([audioPromise, turnPromise]);
  console.log(`[Moderator Turn] Audio generated, turn saved to DB`);

  // Update context
  session.context.conversationHistory.push(turn);
  session.state.turnCount++;

  // Track this turn for frequency analysis (but only if not the opening turn)
  if (session.state.turnCount > 1) {
    trackTurn(session, 'moderator');
  }

  // Store audio buffer for S3 upload later
  session.audioBuffers.push({
    turnId: turn.id.toString(),
    audioBuffer,
    turn,
  });

  // Send to client immediately
  console.log(`[Moderator Turn] Sending turn_start to client`);
  session.sendMessage({
    type: 'turn_start',
    payload: {
      turn,
      audioData: audioBuffer.toString('base64'),
    },
  });

  return turn;
};

export const generateAgentTurn = async (sessionId: string, agentId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const agent = session.agents.find((a) => a.id === agentId);
  if (!agent) {
    throw new Error('Agent not found in session');
  }

  console.log(`[Agent Turn] Starting generation for agent ${agent.name} (${agentId})`);

  // Get relevant memories for this agent (in parallel with response generation)
  const memoriesPromise = prisma.agentMemory.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const memories = await memoriesPromise;
  const relevantMemories = memories.map((m) => m.content);

  // Generate agent response
  const content = await generateAgentResponse(agent, session.context, relevantMemories);
  console.log(`[Agent Turn] Generated content for ${agent.name} (${content.length} chars)`);

  // Start audio generation and DB save in parallel
  const audioPromise = textToAudioBuffer(content, agent.voiceId);
  const turnPromise = saveTurn(sessionId, {
    speakerType: 'agent',
    speakerId: agent.id,
    speakerName: agent.name,
    content,
    audioUrl: undefined, // Will be updated after S3 upload
    timestamp: new Date(),
    sequenceNumber: session.state.turnCount,
  });

  // Wait for both to complete
  const [audioBuffer, turn] = await Promise.all([audioPromise, turnPromise]);
  console.log(`[Agent Turn] Audio generated, turn saved to DB for ${agent.name}`);

  // Update context
  session.context.conversationHistory.push(turn);
  session.state.turnCount++;

  // Store audio buffer for S3 upload later
  session.audioBuffers.push({
    turnId: turn.id.toString(),
    audioBuffer,
    turn,
  });

  // Send to client immediately
  console.log(`[Agent Turn] Sending turn_start to client for ${agent.name}`);
  session.sendMessage({
    type: 'turn_start',
    payload: {
      turn,
      audioData: audioBuffer.toString('base64'),
    },
  });

  return turn;
};

export const handleParticipantTurn = async (
  sessionId: string,
  transcript: string,
  isFinal: boolean = true
) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  console.log(`[Participant Turn] Received transcript (final: ${isFinal}): "${transcript.substring(0, 50)}..."`);

  // Accumulate transcripts for this turn
  session.currentTurnTranscripts.push(transcript);

  // Only save when turn is final
  if (isFinal) {
    // Concatenate all transcripts from this turn
    const fullTranscript = session.currentTurnTranscripts.join(' ').trim();
    session.currentTurnTranscripts = []; // Reset for next turn

    console.log(`[Participant Turn] Final transcript (${fullTranscript.length} chars): "${fullTranscript}"`);

    // Save participant turn with concatenated transcript
    const turn = await saveTurn(sessionId, {
      speakerType: 'participant',
      speakerName: session.context.participant.name,
      content: fullTranscript,
      timestamp: new Date(),
      sequenceNumber: session.state.turnCount,
    });

    // Update context
    session.context.conversationHistory.push(turn);
    session.state.turnCount++;
    session.state.participantTurnCount++;
    session.turnsSinceParticipantSpoke = 0; // Reset counter
    session.currentSpeakerIndex = 1; // User just spoke (index 1)

    // Track this turn for frequency analysis
    trackTurn(session, 'user');

    console.log(`[Participant Turn] User spoke (index 1). Moving to next speaker: agent at index 2`);

    // After user speaks, ALWAYS go to agent at index 2
    session.nextSpeakerIndex = 2;
    await moveToNextSpeaker(sessionId);

    return turn;
  }

  return null;
};

// ========================================
// Pre-Computation Logic
// ========================================

const PRE_COMPUTE_QUEUE_SIZE = 2; // Number of turns to pre-compute ahead

const preComputeNextTurns = async (sessionId: string, count: number = PRE_COMPUTE_QUEUE_SIZE) => {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Prevent concurrent pre-computation
  if (session.isPreComputingTurns) {
    console.log(`[PreCompute] Already pre-computing turns for session ${sessionId}, skipping`);
    return;
  }

  session.isPreComputingTurns = true;

  try {
    console.log(`[PreCompute] Starting pre-computation of ${count} turn(s) for session ${sessionId}`);

    for (let i = 0; i < count; i++) {
      // Stop if session is in closing phase
      if (session.context.currentPhase === 'closing') {
        console.log(`[PreCompute] Session in closing phase, stopping pre-computation`);
        break;
      }

      // Create a temporary context snapshot for simulation
      const tempTurnCount = session.state.turnCount + session.preComputedTurns.length;

      // Update phase based on simulated turn count
      let simulatedPhase: 'opening' | 'exploration' | 'deepening' | 'synthesis' | 'closing' = session.context.currentPhase;
      if (tempTurnCount > 15) {
        simulatedPhase = 'closing';
      } else if (tempTurnCount > 10) {
        simulatedPhase = 'synthesis';
      } else if (tempTurnCount > 5) {
        simulatedPhase = 'deepening';
      } else if (tempTurnCount > 2) {
        simulatedPhase = 'exploration';
      }

      // Stop if we've reached closing phase
      if (simulatedPhase === 'closing') {
        console.log(`[PreCompute] Simulated phase is closing, stopping pre-computation`);
        break;
      }

      // Create temporary context for AI decision
      const tempContext: ConversationContext = {
        ...session.context,
        currentPhase: simulatedPhase,
      };

      // Use AI to decide next speaker
      const decision = await decideNextSpeaker(
        tempContext,
        session.agents,
        session.turnsSinceParticipantSpoke + session.preComputedTurns.length
      );

      console.log(`[PreCompute] AI decided next speaker: ${decision.type}${decision.agentId ? ` (${decision.agentId})` : ''}`);

      // Only pre-compute agent and moderator turns (not participant)
      if (decision.type === 'participant') {
        console.log(`[PreCompute] Next turn is participant, stopping pre-computation`);
        break;
      }

      let content: string;
      let audioBuffer: Buffer;
      let speakerName: string;
      let voiceId: string;

      if (decision.type === 'agent' && decision.agentId) {
        const agent = session.agents.find((a) => a.id === decision.agentId);
        if (!agent) {
          console.error(`[PreCompute] Agent ${decision.agentId} not found`);
          break;
        }

        // Get relevant memories
        const memories = await prisma.agentMemory.findMany({
          where: { agentId: agent.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        const relevantMemories = memories.map((m) => m.content);

        // Generate response
        content = await generateAgentResponse(agent, tempContext, relevantMemories);
        audioBuffer = await textToAudioBuffer(content, agent.voiceId);
        speakerName = agent.name;
        voiceId = agent.voiceId;
      } else if (decision.type === 'moderator') {
        // Generate moderator response
        content = await generateModeratorPrompt(tempContext);
        audioBuffer = await textToAudioBuffer(content, 'moderator_voice');
        speakerName = 'Moderator';
        voiceId = 'moderator_voice';
      } else {
        console.log(`[PreCompute] Unexpected decision type: ${decision.type}`);
        break;
      }

      // Add to pre-computed queue
      const preComputedTurn: PreComputedTurn = {
        type: decision.type as 'agent' | 'moderator',
        agentId: decision.agentId,
        content,
        audioBuffer,
        speakerName,
        voiceId,
      };

      session.preComputedTurns.push(preComputedTurn);
      console.log(`[PreCompute] Added turn to queue. Queue size: ${session.preComputedTurns.length}`);

      // Add this turn to temporary context for next iteration
      tempContext.conversationHistory.push({
        speakerType: decision.type as 'agent' | 'moderator',
        speakerId: decision.agentId,
        speakerName,
        content,
        timestamp: new Date(),
        sequenceNumber: tempTurnCount,
      });
    }

    console.log(`[PreCompute] Finished pre-computation. Queue size: ${session.preComputedTurns.length}`);
  } catch (error) {
    console.error(`[PreCompute] Error pre-computing turns:`, error);
  } finally {
    session.isPreComputingTurns = false;
  }
};

// ========================================
// Conversation Logic - Simplified Index-Based System
// ========================================

// Helper: Track a turn in the frequency analysis
const trackTurn = (session: ActiveSession, speakerType: 'user' | 'agent' | 'moderator') => {
  // Add to last 5 turns
  session.last5Turns.push(speakerType);
  if (session.last5Turns.length > 5) {
    session.last5Turns.shift(); // Keep only last 5
  }

  // Update counters
  if (speakerType === 'user') {
    session.turnsSinceUserSpoke = 0;
    session.turnsSinceModeratorSpoke++;
  } else if (speakerType === 'moderator') {
    session.turnsSinceUserSpoke++;
    session.turnsSinceModeratorSpoke = 0;
  } else {
    session.turnsSinceUserSpoke++;
    session.turnsSinceModeratorSpoke++;
  }

  // Count user turns in last 5
  session.userTurnsInLastFive = session.last5Turns.filter(t => t === 'user').length;

  console.log(`[Track Turn] Speaker: ${speakerType}, Last 5: [${session.last5Turns.join(',')}], User turns in last 5: ${session.userTurnsInLastFive}, Turns since user: ${session.turnsSinceUserSpoke}, Turns since moderator: ${session.turnsSinceModeratorSpoke}`);
};

// Move to the next speaker based on current index
const moveToNextSpeaker = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error(`[Move Speaker] Session ${sessionId} not found!`);
    return;
  }

  const nextIndex = session.nextSpeakerIndex;
  const nextSpeaker = session.speakerIndices.find(s => s.index === nextIndex);

  if (!nextSpeaker) {
    console.error(`[Move Speaker] No speaker found at index ${nextIndex}`);
    return;
  }

  console.log(`[Move Speaker] Moving to index ${nextIndex}: ${nextSpeaker.name} (${nextSpeaker.type})`);

  // Update current speaker
  session.currentSpeakerIndex = nextIndex;

  // Check phase and handle closing
  if (session.state.turnCount > 15) {
    session.context.currentPhase = 'closing';
    console.log(`[Move Speaker] Conversation closing after ${session.state.turnCount} turns`);
    await generateModeratorTurn(sessionId);
    setTimeout(() => endSession(sessionId), 3000);
    return;
  }

  // Generate turn for the current speaker
  if (nextSpeaker.type === 'agent' && nextSpeaker.agentId) {
    await generateAgentTurnSimple(sessionId, nextSpeaker.agentId);
  } else if (nextSpeaker.type === 'moderator') {
    await generateModeratorTurn(sessionId);

    // After moderator interjection, determine next speaker and continue
    // Moderator interjections should facilitate conversation, then pass control
    const maxIndex = session.speakerIndices.length - 1;
    let nextAfterModerator = 2; // Default to first agent

    // If user needs to speak, go to user
    if (session.turnsSinceUserSpoke >= 4 || session.userTurnsInLastFive === 0) {
      nextAfterModerator = 1; // User's turn
    } else {
      // Otherwise go to next agent in sequence
      nextAfterModerator = (session.currentSpeakerIndex === 0) ? 2 : session.currentSpeakerIndex + 1;
      if (nextAfterModerator > maxIndex || nextAfterModerator === 1) {
        nextAfterModerator = 2; // Wrap to first agent
      }
    }

    session.nextSpeakerIndex = nextAfterModerator;
    console.log(`[Move Speaker] After moderator, next speaker will be index ${nextAfterModerator}`);

    // Schedule next speaker after moderator audio finishes
    const moderatorContent = session.context.conversationHistory[session.context.conversationHistory.length - 1]?.content || '';
    const estimatedDuration = Math.max(moderatorContent.length * 100 + 2000, 5000);

    setTimeout(() => {
      console.log(`[Move Speaker] Moderator audio finished, moving to next speaker`);
      moveToNextSpeaker(sessionId).catch(err => {
        console.error('[Move Speaker] Error moving after moderator:', err);
      });
    }, estimatedDuration);
  } else if (nextSpeaker.type === 'user') {
    // User's turn - send state change
    console.log(`[Move Speaker] User's turn - sending state_change: your-turn`);
    session.sendMessage({
      type: 'state_change',
      payload: { micState: 'your-turn' },
    });
  }
};

// Generate agent turn and determine next speaker
const generateAgentTurnSimple = async (sessionId: string, agentId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const agent = session.agents.find((a) => a.id === agentId);
  if (!agent) {
    throw new Error('Agent not found in session');
  }

  console.log(`[Agent Turn Simple] Generating turn for agent ${agent.name} (${agentId})`);

  // Get relevant memories
  const memories = await prisma.agentMemory.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const relevantMemories = memories.map((m) => m.content);

  // Generate agent response
  const content = await generateAgentResponse(agent, session.context, relevantMemories);
  console.log(`[Agent Turn Simple] Generated content for ${agent.name} (${content.length} chars)`);

  // Determine next speaker by analyzing the content
  const nextIndex = determineNextSpeakerFromContent(session, content);
  session.nextSpeakerIndex = nextIndex;
  console.log(`[Agent Turn Simple] Next speaker will be index ${nextIndex}`);

  // Generate audio and save turn
  const audioPromise = textToAudioBuffer(content, agent.voiceId);
  const turnPromise = saveTurn(sessionId, {
    speakerType: 'agent',
    speakerId: agent.id,
    speakerName: agent.name,
    content,
    audioUrl: undefined,
    timestamp: new Date(),
    sequenceNumber: session.state.turnCount,
  });

  const [audioBuffer, turn] = await Promise.all([audioPromise, turnPromise]);
  console.log(`[Agent Turn Simple] Audio generated, turn saved to DB for ${agent.name}`);

  // Update context
  session.context.conversationHistory.push(turn);
  session.state.turnCount++;

  // Track this turn for frequency analysis
  trackTurn(session, 'agent');

  // Store audio buffer for S3 upload later
  session.audioBuffers.push({
    turnId: turn.id.toString(),
    audioBuffer,
    turn,
  });

  // Send to client immediately
  console.log(`[Agent Turn Simple] Sending turn_start to client for ${agent.name}`);
  session.sendMessage({
    type: 'turn_start',
    payload: {
      turn,
      audioData: audioBuffer.toString('base64'),
    },
  });

  // Pre-compute next speaker's message (text only) while current audio plays
  preComputeNextMessage(sessionId).catch(err => {
    console.error('[Agent Turn Simple] Error pre-computing next message:', err);
  });

  // After audio finishes (estimate), move to next speaker
  // Use more realistic timing: ~100ms per char + 2 sec buffer, minimum 5 seconds
  const estimatedDuration = Math.max(content.length * 100 + 2000, 5000);
  console.log(`[Agent Turn Simple] Estimated audio duration: ${estimatedDuration}ms for ${content.length} chars`);

  setTimeout(() => {
    console.log(`[Agent Turn Simple] Audio finished for ${agent.name}, moving to next speaker`);
    moveToNextSpeaker(sessionId).catch(err => {
      console.error('[Agent Turn Simple] Error moving to next speaker:', err);
    });
  }, estimatedDuration);

  return turn;
};

// Determine next speaker index by analyzing message content and frequency rules
const determineNextSpeakerFromContent = (session: ActiveSession, content: string): number => {
  const currentIndex = session.currentSpeakerIndex;
  const maxIndex = session.speakerIndices.length - 1;

  // RULE 1: Moderator should interject every 5 turns to move conversation along
  if (session.turnsSinceModeratorSpoke >= 5) {
    console.log(`[Next Speaker] Moderator hasn't spoken in ${session.turnsSinceModeratorSpoke} turns, moderator interjecting (index 0)`);
    return 0;
  }

  // RULE 2: User must speak at least once every 5 turns
  if (session.turnsSinceUserSpoke >= 5) {
    console.log(`[Next Speaker] User hasn't spoken in ${session.turnsSinceUserSpoke} turns, going to user (index 1)`);
    return 1;
  }

  // RULE 3: User should speak at most 3 times in any 5-turn window
  if (session.userTurnsInLastFive >= 3) {
    console.log(`[Next Speaker] User has spoken ${session.userTurnsInLastFive} times in last 5 turns (max), skipping user`);
    // Skip to next agent
    let nextIndex = currentIndex + 1;
    if (nextIndex > maxIndex || nextIndex === 1) {
      nextIndex = 2; // Go to first agent
    }
    console.log(`[Next Speaker] Skipping user, going to agent at index ${nextIndex}`);
    return nextIndex;
  }

  // RULE 4: Content-based routing - Check if content mentions the moderator/guide
  if (content.toLowerCase().includes('guide') ||
      content.toLowerCase().includes('moderator') ||
      (content.includes('?') &&
       (content.toLowerCase().includes('can we') ||
        content.toLowerCase().includes('should we') ||
        content.toLowerCase().includes('what if we')))) {
    console.log(`[Next Speaker] Content addresses or questions the moderator, going to moderator (index 0)`);
    return 0;
  }

  // RULE 5: Content-based routing - Check if content mentions any specific agent by name
  for (let i = 2; i <= maxIndex; i++) {
    const speaker = session.speakerIndices[i];
    if (speaker.type === 'agent') {
      const firstName = speaker.name.split(' ')[0].toLowerCase();
      const contentLower = content.toLowerCase();

      // Check for direct mentions, questions to them, or addressing them
      if (contentLower.includes(speaker.name.toLowerCase()) ||
          contentLower.includes(firstName) ||
          (content.includes('?') && contentLower.includes(firstName))) {
        console.log(`[Next Speaker] Content mentions or asks "${speaker.name}", going to index ${i}`);
        return i;
      }
    }
  }

  // RULE 6: Content-based routing - Check if content asks a question to the user
  if (content.includes('?') && (
    content.toLowerCase().includes('you') ||
    content.toLowerCase().includes('your') ||
    content.toLowerCase().includes(session.speakerIndices[1].name.toLowerCase())
  )) {
    console.log(`[Next Speaker] Content asks user a question, going to user (index 1)`);
    return 1;
  }

  // RULE 7: Default - go to next agent in sequence (wrap around if needed)
  let nextIndex = currentIndex + 1;
  if (nextIndex > maxIndex) {
    nextIndex = 2; // Skip moderator (0) and user (1), go back to first agent
  }
  if (nextIndex === 1) {
    nextIndex = 2; // Skip user, go to first agent
  }

  console.log(`[Next Speaker] Default sequential: current ${currentIndex} -> next ${nextIndex}`);
  return nextIndex;
};

// Pre-compute next speaker's message (text only)
const preComputeNextMessage = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session || session.isPreComputingMessage) {
    return;
  }

  session.isPreComputingMessage = true;

  try {
    const nextIndex = session.nextSpeakerIndex;
    const nextSpeaker = session.speakerIndices.find(s => s.index === nextIndex);

    if (!nextSpeaker || nextSpeaker.type === 'user') {
      console.log(`[Pre-Compute] Next speaker is user, skipping pre-computation`);
      return;
    }

    console.log(`[Pre-Compute] Pre-computing message for ${nextSpeaker.name} (index ${nextIndex})`);

    if (nextSpeaker.type === 'agent' && nextSpeaker.agentId) {
      const agent = session.agents.find(a => a.id === nextSpeaker.agentId);
      if (!agent) return;

      const memories = await prisma.agentMemory.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const relevantMemories = memories.map(m => m.content);

      const content = await generateAgentResponse(agent, session.context, relevantMemories);
      session.preComputedMessageText = content;
      console.log(`[Pre-Compute] Pre-computed message for ${agent.name} (${content.length} chars)`);
    } else if (nextSpeaker.type === 'moderator') {
      const content = await generateModeratorPrompt(session.context);
      session.preComputedMessageText = content;
      console.log(`[Pre-Compute] Pre-computed message for Moderator (${content.length} chars)`);
    }
  } catch (error) {
    console.error('[Pre-Compute] Error:', error);
  } finally {
    session.isPreComputingMessage = false;
  }
};

// ========================================
// Legacy Functions (keeping for compatibility)
// ========================================

// Execute a pre-computed turn from the queue
const executePreComputedTurn = async (sessionId: string): Promise<boolean> => {
  const session = activeSessions.get(sessionId);
  if (!session || session.preComputedTurns.length === 0) {
    console.log(`[PreCompute Execute] No pre-computed turns available (queue empty)`);
    return false;
  }

  // Get the next pre-computed turn
  const preComputedTurn = session.preComputedTurns.shift();
  if (!preComputedTurn) {
    return false;
  }

  console.log(`[PreCompute Execute] Using pre-computed turn: ${preComputedTurn.type} - ${preComputedTurn.speakerName}`);

  // Save turn to database
  const turn = await saveTurn(sessionId, {
    speakerType: preComputedTurn.type,
    speakerId: preComputedTurn.agentId,
    speakerName: preComputedTurn.speakerName,
    content: preComputedTurn.content,
    audioUrl: undefined, // Will be updated after S3 upload
    timestamp: new Date(),
    sequenceNumber: session.state.turnCount,
  });

  // Update context
  session.context.conversationHistory.push(turn);
  session.state.turnCount++;
  session.turnsSinceParticipantSpoke++;

  // Store audio buffer for S3 upload later
  session.audioBuffers.push({
    turnId: turn.id.toString(),
    audioBuffer: preComputedTurn.audioBuffer,
    turn,
  });

  // Send to client
  console.log(`[PreCompute Execute] Sending turn_start to client for ${preComputedTurn.speakerName}`);
  session.sendMessage({
    type: 'turn_start',
    payload: {
      turn,
      audioData: preComputedTurn.audioBuffer.toString('base64'),
    },
  });

  return true;
};

const decideNextSpeakerAI = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error(`[AI Decision] Session ${sessionId} not found!`);
    return;
  }

  console.log(`[AI Decision] ===== DECIDING NEXT SPEAKER for session ${sessionId} =====`);
  console.log(`[AI Decision] Current turn count: ${session.state.turnCount}, Phase: ${session.context.currentPhase}`);

  const { state, agents, context } = session;

  // Update phase based on turn count
  if (state.turnCount > 15) {
    context.currentPhase = 'closing';
  } else if (state.turnCount > 10) {
    context.currentPhase = 'synthesis';
  } else if (state.turnCount > 5) {
    context.currentPhase = 'deepening';
  } else if (state.turnCount > 2) {
    context.currentPhase = 'exploration';
  }

  console.log(`[AI Decision] Updated phase to: ${context.currentPhase}`);

  // In closing phase, moderator wraps up
  if (context.currentPhase === 'closing') {
    console.log(`[AI Decision] In closing phase, generating moderator closing turn`);
    await generateModeratorTurn(sessionId);
    // End session after moderator closing
    setTimeout(() => endSession(sessionId), 3000);
    return;
  }

  // Try to use pre-computed turn first
  console.log(`[AI Decision] Checking for pre-computed turns (queue size: ${session.preComputedTurns.length})`);
  const usedPreComputed = await executePreComputedTurn(sessionId);

  if (usedPreComputed) {
    console.log(`[AI Decision] ✅ Used pre-computed turn. Queue size now: ${session.preComputedTurns.length}`);

    // Replenish the queue in the background (don't wait)
    preComputeNextTurns(sessionId, 1).catch((error) => {
      console.error('[AI Decision] Error replenishing pre-computed turns:', error);
    });

    // IMPORTANT: Schedule the next speaker after a delay
    setTimeout(() => {
      console.log(`[AI Decision] Auto-triggering next speaker after pre-computed turn`);
      decideNextSpeakerAI(sessionId).catch((error) => {
        console.error('[AI Decision] Error scheduling next speaker:', error);
      });
    }, 3000); // Wait 3 seconds for current audio to play

    return;
  }

  // Fallback: Generate turn on-demand if no pre-computed turn available
  console.log('[AI Decision] ⚠️ No pre-computed turn available, generating on-demand');

  // Use AI to decide next speaker
  const decision = await decideNextSpeaker(
    context,
    agents,
    session.turnsSinceParticipantSpoke
  );

  console.log(`[AI Decision] AI decided: ${decision.type}${decision.agentId ? ` (${decision.agentId})` : ''}`);

  let shouldContinueAutomatically = false;

  if (decision.type === 'agent' && decision.agentId) {
    // Agent's turn - generate and continue
    session.turnsSinceParticipantSpoke++;
    await generateAgentTurn(sessionId, decision.agentId);
    shouldContinueAutomatically = true;
  } else if (decision.type === 'moderator') {
    // Moderator's turn - generate and continue
    session.turnsSinceParticipantSpoke++;
    await generateModeratorTurn(sessionId);
    shouldContinueAutomatically = true;
  } else if (decision.type === 'participant') {
    // Participant's turn - generate moderator prompt asking them to speak, then WAIT
    console.log(`[AI Decision] Participant's turn - generating moderator prompt, then waiting`);
    session.turnsSinceParticipantSpoke++;
    await generateModeratorTurn(sessionId);

    // After moderator prompt plays, signal to client it's their turn
    setTimeout(() => {
      console.log(`[AI Decision] Sending state_change: your-turn to client`);
      session.sendMessage({
        type: 'state_change',
        payload: { micState: 'your-turn' },
      });
    }, 3000); // Wait for moderator prompt to play

    // DON'T continue automatically - wait for participant
    shouldContinueAutomatically = false;
  }

  // Continue to next speaker if appropriate
  if (shouldContinueAutomatically) {
    setTimeout(() => {
      console.log(`[AI Decision] Auto-triggering next speaker after on-demand turn`);
      decideNextSpeakerAI(sessionId).catch((error) => {
        console.error('[AI Decision] Error scheduling next speaker:', error);
      });
    }, 3000); // Wait 3 seconds for current audio to play
  }

  // Start pre-computing turns for next time (don't wait)
  preComputeNextTurns(sessionId).catch((error) => {
    console.error('[AI Decision] Error pre-computing turns:', error);
  });
};

const endSession = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  console.log(`Session ${sessionId} ending - uploading ${session.audioBuffers.length} audio files to S3...`);

  // Upload all audio files to S3
  try {
    const uploadPromises = session.audioBuffers.map(async ({ turnId, audioBuffer, turn }) => {
      const key = generateAudioKey(sessionId, turnId, turn.speakerType);
      const audioUrl = await uploadAudioToS3(audioBuffer, key);

      // Update turn in database with S3 URL
      await prisma.turn.update({
        where: { id: parseInt(turnId) },
        data: { audioUrl },
      });

      return audioUrl;
    });

    const audioUrls = await Promise.all(uploadPromises);
    console.log(`✅ Successfully uploaded ${audioUrls.length} audio files to S3`);
  } catch (error) {
    console.error('❌ Error uploading audio files to S3:', error);
    // Continue with session end even if uploads fail
  }

  // Update session in database
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      endedAt: new Date(),
    },
  });

  // Notify client
  session.sendMessage({
    type: 'session_end',
    payload: { sessionId },
  });

  // Clean up
  activeSessions.delete(sessionId);

  console.log(`Session ${sessionId} ended and cleaned up`);
};

// ========================================
// Helpers
// ========================================

const saveTurn = async (sessionId: string, data: Omit<TurnData, 'id'>) => {
  const turn = await prisma.turn.create({
    data: {
      sessionId,
      speakerType: data.speakerType,
      speakerId: data.speakerId,
      speakerName: data.speakerName,
      content: data.content,
      audioUrl: data.audioUrl,
      sequenceNumber: data.sequenceNumber,
    },
  });

  return {
    id: turn.id,
    sessionId: turn.sessionId,
    speakerType: turn.speakerType as any,
    speakerId: turn.speakerId || undefined,
    speakerName: turn.speakerName,
    content: turn.content,
    audioUrl: turn.audioUrl || undefined,
    timestamp: turn.timestamp.toISOString(),
    sequenceNumber: turn.sequenceNumber,
  };
};

export const getActiveSession = (sessionId: string) => {
  return activeSessions.get(sessionId);
};

export const getAllActiveSessions = () => {
  return Array.from(activeSessions.keys());
};

// Skip to next speaker using simplified index system
export const skipToNextAgent = async (sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  console.log(`[Skip] Skipping current speaker (index ${session.currentSpeakerIndex}), moving to next (index ${session.nextSpeakerIndex})`);

  // Move directly to the next speaker
  await moveToNextSpeaker(sessionId);
};
