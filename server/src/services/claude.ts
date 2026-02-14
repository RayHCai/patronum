// Claude API Shared Utilities
// Provides shared Claude API client and helper functions
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ConversationContext, TurnData, EngagementAssessment, EngagementLevel, NextSpeakerDecision, SpeakerTurnTracker, SessionMemoryHook } from '../types';

export const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY || 'placeholder-key',
});

// ========================================
// Helper Functions
// ========================================

// Remove action expressions like *smiles*, *chuckles*, etc.
export const removeExpressions = (text: string): string => {
  return text
    .replace(/\*[^*]+\*/g, '') // Remove *expression*
    .replace(/\([^)]*\b(smiles|chuckles|laughs|nods|sighs|grins|winks|shrugs)\b[^)]*\)/gi, '') // Remove (action)
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
};

// Strip markdown code fences from JSON responses
export const stripMarkdownCodeFences = (text: string): string => {
  // Remove ```json or ``` at the start and ``` at the end
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/, '')
    .trim();
};

// ========================================
// Shared API Functions
// ========================================

export const generateConversationSummary = async (
  conversationHistory: TurnData[]
): Promise<string> => {
  const fullHistory = conversationHistory.map((turn) => {
    return `${turn.speakerName}: ${turn.content}`;
  }).join('\n');

  const prompt = `Please provide a brief, warm summary of this conversation (2-3 sentences), highlighting key themes and moments:

${fullHistory}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 200,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
};

// ========================================
// Engagement Scoring
// ========================================

/**
 * Assess participant engagement level from their most recent turn
 * Uses Claude to analyze emotional engagement, clarity, and potential confusion/distress
 */
export const assessParticipantEngagement = async (
  participantTurn: TurnData,
  participantName: string
): Promise<EngagementAssessment> => {
  const content = participantTurn.content;
  const wordCount = content.split(/\s+/).length;

  const prompt = `Analyze this participant's response in a supportive conversation for someone with mild cognitive impairment:

"${content}"

Assess the following on a 0-1 scale:
1. Emotional engagement (interest, warmth, enthusiasm)
2. Clarity and coherence
3. Signs of confusion (yes/no)
4. Signs of distress or agitation (yes/no)

Respond with ONLY a JSON object:
{
  "emotionalEngagement": 0.0-1.0,
  "clarity": 0.0-1.0,
  "hasConfusion": true/false,
  "hasDistress": true/false
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 150,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const analysis = JSON.parse(cleanedText);

    // Determine engagement level based on scores and signals
    let level: EngagementLevel;
    if (analysis.hasDistress || analysis.hasConfusion || analysis.clarity < 0.4) {
      level = 'low';
    } else if (analysis.emotionalEngagement >= 0.7 && analysis.clarity >= 0.7 && wordCount >= 10) {
      level = 'high';
    } else {
      level = 'medium';
    }

    return {
      level,
      emotionalEngagement: analysis.emotionalEngagement,
      clarity: analysis.clarity,
      length: wordCount,
      hasConfusion: analysis.hasConfusion,
      hasDistress: analysis.hasDistress,
    };
  } catch (error) {
    console.error('Error assessing engagement:', error);
    // Fallback: simple heuristics
    const hasShortResponse = wordCount < 5;
    const hasVeryShortResponse = wordCount < 3;

    return {
      level: hasVeryShortResponse ? 'low' : hasShortResponse ? 'medium' : 'high',
      emotionalEngagement: hasShortResponse ? 0.3 : 0.6,
      clarity: 0.7,
      length: wordCount,
      hasConfusion: false,
      hasDistress: false,
    };
  }
};

// ========================================
// Session Memory Hooks
// ========================================

/**
 * Extract notable moments from a participant turn for session-local memory
 * These can be referenced later in the same session to create continuity
 */
export const extractSessionMemoryHooks = async (
  participantTurn: TurnData,
  turnNumber: number
): Promise<SessionMemoryHook[]> => {
  const content = participantTurn.content;

  const prompt = `Analyze this participant's contribution in a conversation and identify notable elements that could be referenced later:

"${content}"

Identify any of the following (if present):
1. Personal stories or anecdotes
2. Named people (family, friends, etc.)
3. Sensory details (smells, sounds, textures, tastes, visual details)
4. Strong emotions expressed

For each element found, extract:
- type: "personal_story", "named_person", "sensory_detail", or "strong_emotion"
- content: a brief description of what was shared
- keywords: 2-3 relevant keywords

Respond with ONLY a JSON array:
[
  {
    "type": "personal_story",
    "content": "brief description",
    "keywords": ["keyword1", "keyword2"]
  }
]

If nothing notable is found, return an empty array: []`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const extracted = JSON.parse(cleanedText);

    // Add metadata
    return extracted.map((hook: any) => ({
      ...hook,
      turnNumber,
      timestamp: new Date(),
    }));
  } catch (error) {
    console.error('Error extracting memory hooks:', error);
    return [];
  }
};

// ========================================
// AI-Directed Turn Routing
// ========================================

/**
 * Build speaker turn tracker from conversation history
 * Tracks consecutive turns and identifies speakers who have dominated
 */
const buildSpeakerTurnTracker = (
  conversationHistory: TurnData[]
): { tracker: SpeakerTurnTracker; dominantSpeaker?: string } => {
  const tracker: SpeakerTurnTracker = {};
  let lastSpeakerId = '';
  let consecutiveCount = 0;

  conversationHistory.forEach((turn, idx) => {
    const speakerId = turn.speakerId || turn.speakerName;

    if (!tracker[speakerId]) {
      tracker[speakerId] = {
        name: turn.speakerName,
        type: turn.speakerType,
        consecutiveTurns: 0,
        totalTurns: 0,
        lastTurnNumber: idx,
      };
    }

    tracker[speakerId].totalTurns++;
    tracker[speakerId].lastTurnNumber = idx;

    // Track consecutive turns
    if (speakerId === lastSpeakerId) {
      consecutiveCount++;
      tracker[speakerId].consecutiveTurns = consecutiveCount;
    } else {
      consecutiveCount = 1;
      // Reset previous speaker's consecutive count
      if (lastSpeakerId && tracker[lastSpeakerId]) {
        tracker[lastSpeakerId].consecutiveTurns = 0;
      }
      tracker[speakerId].consecutiveTurns = 1;
    }

    lastSpeakerId = speakerId;
  });

  // Identify dominant speaker (3+ consecutive turns or spoke in 4+ of last 5 turns)
  const recentTurns = conversationHistory.slice(-5);
  const recentSpeakerCounts: { [id: string]: number } = {};

  recentTurns.forEach(turn => {
    const id = turn.speakerId || turn.speakerName;
    recentSpeakerCounts[id] = (recentSpeakerCounts[id] || 0) + 1;
  });

  const dominantSpeaker = Object.entries(recentSpeakerCounts).find(
    ([id, count]) => count >= 4 || (tracker[id]?.consecutiveTurns || 0) >= 3
  )?.[0];

  return { tracker, dominantSpeaker };
};

export const decideNextSpeaker = async (
  context: ConversationContext,
  agents: any[],
  participantTurnsSinceLastSpeak: number,
  lastParticipantEngagement?: EngagementLevel
): Promise<NextSpeakerDecision> => {
  const { conversationHistory, currentPhase, participant } = context;

  const recentHistory = conversationHistory.slice(-6).map((turn) => {
    return `${turn.speakerName} (${turn.speakerType}): ${turn.content}`;
  }).join('\n');

  const agentList = agents.map((a, idx) => `${idx + 1}. ${a.name} (ID: ${a.id})`).join('\n');
  const participantName = participant.name.split(' ')[0];

  // Build turn tracker and check for rebalancing needs
  const { tracker, dominantSpeaker } = buildSpeakerTurnTracker(conversationHistory);
  const needsRebalancing = !!dominantSpeaker;

  let rebalancingGuidance = '';
  if (needsRebalancing && dominantSpeaker) {
    const dominant = tracker[dominantSpeaker];
    // Find quieter members
    const quietMembers = Object.values(tracker)
      .filter(s => s.type === 'agent' && s.lastTurnNumber < conversationHistory.length - 3)
      .map(s => s.name);

    if (quietMembers.length > 0) {
      rebalancingGuidance = `\n\nIMPORTANT REBALANCING NEEDED: ${dominant.name} has dominated recent turns. The moderator should redirect to quieter members: ${quietMembers.join(', ')}. Choose moderator to facilitate this rebalancing.`;
    }
  }

  const engagementGuidance = lastParticipantEngagement
    ? `\n\nParticipant engagement level: ${lastParticipantEngagement}`
    : '';

  const prompt = `You are managing the flow of a supportive group conversation. Based on the recent conversation, decide who should speak next.

Participants:
- ${participantName} (the main participant - type: participant)
- Moderator (conversation guide - type: moderator)
- Agents (supportive group members):
${agentList}

Recent conversation:
${recentHistory}

Current phase: ${currentPhase}
Turns since ${participantName} last spoke: ${participantTurnsSinceLastSpeak}${engagementGuidance}${rebalancingGuidance}

Rules:
1. ${participantName} must speak at least once every 5 turns (currently at ${participantTurnsSinceLastSpeak})
2. If rebalancing is needed, prioritize moderator to redirect conversation
3. Agents can redirect conversation to other agents naturally (not just sequential order)
4. Moderator should prompt ${participantName} when needed or transition phases
5. Choose who would naturally speak next based on conversation flow
6. Vary the speaking order - don't just go in circles

Respond with ONLY a JSON object in this format:
{"type": "agent", "agentId": "agent_id_here"}
OR
{"type": "moderator"}
OR
{"type": "participant"}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 100,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const decision = JSON.parse(cleanedText);

    // Validate the response
    if (decision.type === 'agent' && decision.agentId) {
      // Verify agent exists
      const agentExists = agents.some(a => a.id === decision.agentId);
      if (!agentExists) {
        // Fallback to first agent
        decision.agentId = agents[0].id;
      }
    }

    // Build reasoning field
    const reasoning = {
      engagementLevel: lastParticipantEngagement || 'medium' as EngagementLevel,
      strategyApplied: needsRebalancing ? 'active_turn_rebalancing' : undefined,
      rebalancingApplied: needsRebalancing,
      participantTurnsSinceLastSpeak,
    };

    return {
      type: decision.type,
      agentId: decision.agentId,
      reasoning,
    };
  } catch (error) {
    console.error('Error parsing next speaker decision:', error);
    // Fallback logic
    const fallbackType = participantTurnsSinceLastSpeak >= 4 ? 'moderator' : 'agent';
    const fallbackAgentId = fallbackType === 'agent' ? agents[0].id : undefined;

    return {
      type: fallbackType,
      agentId: fallbackAgentId,
      reasoning: {
        engagementLevel: lastParticipantEngagement || 'medium',
        strategyApplied: 'fallback_logic',
        rebalancingApplied: false,
        participantTurnsSinceLastSpeak,
      },
    };
  }
};

