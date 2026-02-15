// AI Moderator Service
// Handles all AI generation logic for the conversation moderator
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ConversationContext, TurnData, EngagementLevel, SessionMemoryHook, ComfortTopic } from '../types';
import { removeExpressions, anthropic } from './claude';

// ========================================
// Prompt Templates
// ========================================

const MODERATOR_SYSTEM_PROMPT = `You are a skilled conversation moderator facilitating a supportive group conversation for someone with mild cognitive impairment. Your role is to:

1. Create a warm, encouraging atmosphere
2. Ask open-ended questions that spark memories and stories
3. Dynamically balance participation - redirect when one speaker dominates
4. Build on what's been shared to deepen the discussion
5. Maintain focus on the chosen topic while allowing natural tangents
6. Use simple, clear language - no medical or technical jargon
7. Facilitate conversation between agents - let them talk to each other, not just to you or the main participant
8. Adapt your approach based on participant engagement levels
9. Provide brief micro-affirmations after participant contributions
10. Quickly pivot to comfort topics when distress is detected
11. STEP BACK when agents are having a good conversation - don't interrupt unnecessarily

Guidelines:
- Keep questions and prompts brief (1-2 sentences max, even shorter when engagement is low)
- Be patient and supportive
- Add specific, genuine micro-affirmations (not praise inflation like "amazing" or therapy language)
- When confusion appears, simplify immediately: shorter sentences, single-idea prompts, concrete topics
- On distress, acknowledge briefly then pivot to a familiar comfort topic from their background
- Help participants make connections between their stories
- Ask specific agents questions by name, using detail-anchored bridging
- Reference earlier moments from the session naturally (without framing as "remembering")
- Vary question depth: concrete questions for low engagement, reflective for high engagement
- When rebalancing, redirect with curiosity: "I'd really love to hear what you think about that."
- IMPORTANT: When agents are responding to each other naturally, let the conversation flow - don't jump in with a new prompt
- Vary your contributions - don't always ask questions; sometimes affirm, bridge, or synthesize what's being shared
- NEVER use action expressions like *smiles*, *chuckles*, *nods*, etc. - only speak dialogue
- Speak naturally as if in a real conversation

Remember: This is a friendly group chat with multiple voices. Your job is to facilitate, not dominate. Let agents talk to each other naturally.`;

// ========================================
// Helper Functions
// ========================================

/**
 * Extract comfort topics from participant notes and session history
 */
const extractComfortTopics = (
  participantNotes: string,
  sessionMemoryHooks: SessionMemoryHook[]
): ComfortTopic[] => {
  const topics: ComfortTopic[] = [];

  // From session memory hooks
  sessionMemoryHooks.forEach(hook => {
    if (hook.type === 'personal_story' || hook.type === 'sensory_detail') {
      topics.push({
        topic: hook.content,
        source: 'current_session',
        keywords: hook.keywords,
      });
    }
  });

  // Simple extraction from notes (looking for interests, hobbies, etc.)
  const noteKeywords = ['garden', 'roses', 'baking', 'cooking', 'family', 'music', 'pets'];
  noteKeywords.forEach(keyword => {
    if (participantNotes.toLowerCase().includes(keyword)) {
      topics.push({
        topic: keyword,
        source: 'caregiver_notes',
        keywords: [keyword],
      });
    }
  });

  return topics;
};

// ========================================
// API Functions
// ========================================

export const generateModeratorResponse = async (
  context: ConversationContext,
  options?: {
    lastParticipantEngagement?: EngagementLevel;
    sessionMemoryHooks?: SessionMemoryHook[];
    needsRebalancing?: boolean;
    targetQuieterAgent?: string;
  }
): Promise<string> => {
  console.log(`[AI Moderator] generateModeratorResponse called`);

  const { topic, conversationHistory, currentPhase, participant, agents } = context;
  const {
    lastParticipantEngagement = 'medium',
    sessionMemoryHooks = [],
    needsRebalancing = false,
    targetQuieterAgent,
  } = options || {};

  console.log(`[AI Moderator] Context - phase: ${currentPhase}, engagement: ${lastParticipantEngagement}, history: ${conversationHistory.length} turns`);
  console.log(`[AI Moderator] Options - rebalancing: ${needsRebalancing}, target: ${targetQuieterAgent || 'none'}, hooks: ${sessionMemoryHooks.length}`);

  const startTime = Date.now();

  const recentHistory = conversationHistory.slice(-15).map((turn) => {
    return `${turn.speakerName}: ${turn.content}`;
  }).join('\n');

  const participantName = participant.name.split(' ')[0];

  // Extract what the moderator has already asked/said to avoid repetition
  const moderatorPreviousContributions = conversationHistory
    .filter(turn => turn.speakerType === 'moderator')
    .slice(-3) // Last 3 moderator contributions
    .map(turn => turn.content);

  const moderatorRepetitionWarning = moderatorPreviousContributions.length > 0
    ? `\n\n🚫 ANTI-REPETITION CHECK - Your previous contributions (YOU MUST NOT REPEAT these patterns, questions, or themes):
${moderatorPreviousContributions.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

CRITICAL:
- If you previously welcomed people or introduced the topic, DO NOT do it again
- If you asked about "food that reminds you of home" or similar, ask something DIFFERENT
- DO NOT use similar phrasing, themes, or question structures as above
- The conversation has MOVED ON - reference what people have ACTUALLY said since then`
    : '';

  // Get agent names for potential addressing
  const agentNames = agents.map(a => a.name);

  // Extract comfort topics for potential pivot
  const comfortTopics = extractComfortTopics(participant.notes || '', sessionMemoryHooks);

  // Check if last turn was from participant and needs micro-affirmation
  const lastTurn = conversationHistory[conversationHistory.length - 1];
  const needsMicroAffirmation = lastTurn && lastTurn.speakerType === 'participant';

  // Check for distress or confusion in last participant turn
  const needsComfortPivot = lastParticipantEngagement === 'low' && comfortTopics.length > 0;
  const needsSimplification = lastParticipantEngagement === 'low';

  let phaseGuidance = '';
  switch (currentPhase) {
    case 'opening':
      // Generate unique opening based on topic with more context
      phaseGuidance = `This is the very first message of the conversation about "${topic || 'their interests'}".

Create a warm, personalized opening that:
- Welcomes everyone by name (${participantName} and the group)
- Relates specifically to the topic "${topic}" with a creative angle
- Asks an inviting, open-ended question that connects to the topic
- Feels fresh and unique, not generic
- Uses language that feels natural and conversational

Make this opening special and tailored to this specific topic.`;
      break;
    case 'exploration':
      phaseGuidance = `The conversation is now UNDERWAY - the opening is DONE. DO NOT welcome people again or re-introduce the topic.

CRITICAL INSTRUCTIONS:
1. Look at what people JUST said in the recent conversation
2. Reference SPECIFIC people by name and what they shared (e.g., "Hiroshi, you mentioned your grandmother's miso soup...")
3. Build connections between different people's responses
4. Ask follow-up questions that go DEEPER into what was already mentioned
5. DO NOT ask generic questions - make them specific to what was actually discussed

Your role now is to FACILITATE and CONNECT what people are sharing, not to start fresh or welcome anyone.`;
      break;
    case 'deepening':
      phaseGuidance = `The conversation is in the DEEPENING phase - you are facilitating an ongoing discussion.

CRITICAL INSTRUCTIONS:
1. Reference SPECIFIC details from what people have shared (e.g., "Ingrid mentioned her farmor's rye bread earlier...")
2. Draw connections between different people's stories (e.g., "Both Hiroshi and Ingrid talked about morning smells...")
3. Ask reflective questions that explore the MEANING or FEELINGS behind what was shared
4. DO NOT welcome anyone, re-introduce topics, or ask generic starter questions
5. You are GUIDING a conversation in progress - build on the existing threads

Your job is to help people explore what's been shared more deeply, not to change subjects.`;
      break;
    case 'synthesis':
      phaseGuidance = `Bringing threads together. Reflect on themes or connections that emerged in the conversation.`;
      break;
    case 'closing':
      phaseGuidance = `Wrapping up warmly. Thank everyone and celebrate what was shared.`;
      break;
  }

  // Build behavioral guidance based on strategies
  let behavioralGuidance = '';

  // 1. Micro-affirmation (after participant turns)
  if (needsMicroAffirmation && currentPhase !== 'opening') {
    behavioralGuidance += `\n\nMICRO-AFFIRMATION: Start with a brief, genuine affirmation of what ${participantName} just shared (one short sentence). Be specific and warm, but avoid therapy language or praise inflation. Examples: "I love how you described the smell of the kitchen." or "That sounds like a really warm memory."`;
  }

  // 2. Comfort-topic fast pivot (on distress/confusion)
  if (needsComfortPivot && currentPhase !== 'opening' && currentPhase !== 'closing') {
    const comfortTopic = comfortTopics[0]; // Use first available
    behavioralGuidance += `\n\nCOMFORT PIVOT NEEDED: ${participantName} seems confused or distressed. After briefly acknowledging, pivot to a familiar comfort topic: "${comfortTopic.topic}". Reference something familiar and positive. Example: "That sounds really hard. You know, last time you told us about your ${comfortTopic.keywords[0]} — what comes to mind when you think about that?"`;
  }

  // 3. Prompt simplification (on low engagement)
  if (needsSimplification && !needsComfortPivot && currentPhase !== 'opening') {
    behavioralGuidance += `\n\nSIMPLIFY PROMPTS: ${participantName}'s engagement is low. Use:
- Shorter sentences (1-2 sentences max)
- Single-idea prompts
- Concrete, present-focused questions
- Warm, supportive tone
Example: "That's okay, ${participantName}. What comes to mind when you think about [familiar topic]?"`;
  }

  // 4. Active turn rebalancing
  if (needsRebalancing && targetQuieterAgent && currentPhase !== 'opening' && currentPhase !== 'closing') {
    behavioralGuidance += `\n\nREBALANCING NEEDED: One speaker has dominated. Explicitly redirect to ${targetQuieterAgent} with curiosity, not control. Use detail-anchored bridging if possible. Examples:
- "${targetQuieterAgent}, I'd really love to hear what you think about that."
- "${targetQuieterAgent}, that connects nicely to what [someone] said earlier — what do you make of it?"`;
  }

  // 5. Adaptive question depth based on engagement
  let questionDepthGuidance = '';
  if (lastParticipantEngagement === 'high' && currentPhase === 'deepening') {
    questionDepthGuidance = `\n\nQUESTION DEPTH: High engagement - you can use gentle reflective questions. Example: "What do you enjoy most about being in the garden?"`;
  } else if (lastParticipantEngagement === 'low' || lastParticipantEngagement === 'medium') {
    questionDepthGuidance = `\n\nQUESTION DEPTH: Keep questions concrete and present-focused. Example: "What do you usually plant first in your garden?"`;
  }

  // 6. Agent bridging with details
  let addressingHint = '';
  if (currentPhase !== 'opening' && currentPhase !== 'closing' && !needsRebalancing) {
    const recentSpeakers = conversationHistory.slice(-3);
    const agentsSpokeRecently = recentSpeakers.filter(t => t.speakerType === 'agent');

    if (agentsSpokeRecently.length >= 2) {
      // Detail-anchored bridging between agents
      const agent1Turn = agentsSpokeRecently[agentsSpokeRecently.length - 1];
      const agent2Turn = agentsSpokeRecently[agentsSpokeRecently.length - 2];
      addressingHint = `\n\nAGENT BRIDGING: Create a detail-anchored bridge between ${agent1Turn.speakerName} and ${agent2Turn.speakerName}. Reference a specific detail from one of their earlier turns and connect it to the other. Example: "${agent2Turn.speakerName}, you mentioned [specific detail] earlier — ${agent1Turn.speakerName} was just talking about [related topic]. What do you think about that?"`;
    }
  }

  // 7. Session memory hooks integration
  let memoryHooksGuidance = '';
  if (sessionMemoryHooks.length > 0 && currentPhase !== 'opening') {
    const recentHooks = sessionMemoryHooks.slice(-3);
    const hookDescriptions = recentHooks.map(h => `- ${h.content} (${h.keywords.join(', ')})`).join('\n');
    memoryHooksGuidance = `\n\nSESSION CONTEXT: ${participantName} has shared these notable moments earlier:\n${hookDescriptions}\n\nYou may naturally reference these ONLY if highly relevant to the current discussion. DO NOT ask follow-up questions about these just for the sake of it - let the conversation flow naturally.`;
  }

  const userPrompt = `${phaseGuidance}

Recent conversation:
${recentHistory || '(Conversation just starting)'}${moderatorRepetitionWarning}${behavioralGuidance}${questionDepthGuidance}${addressingHint}${memoryHooksGuidance}

Participant engagement level: ${lastParticipantEngagement}

What should you say next as the moderator?

REQUIREMENTS:
- Reference SPECIFIC people and what they JUST said (use their names and details)
- Build on the ACTUAL conversation that just happened
- Keep it brief (1-2 sentences), warm, and natural
- If this is not the opening, DO NOT welcome people or introduce topics
- Only provide the dialogue - no actions or expressions`;

  console.log(`[AI Moderator] Calling Claude API for moderator response (phase: ${currentPhase})...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    temperature: 0.9, // Increased for more variety in openings
    system: MODERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const elapsedTime = Date.now() - startTime;
  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleanedResponse = removeExpressions(response);

  console.log(`[AI Moderator] Moderator response generated in ${elapsedTime}ms (phase: ${currentPhase})`);
  console.log(`[AI Moderator] Response preview: "${cleanedResponse.substring(0, 80)}${cleanedResponse.length > 80 ? '...' : ''}"`);

  return cleanedResponse;
};

// Specialized function for generating opening statement
export const generateModeratorOpening = async (
  topic: string,
  participantName: string,
  agentNames: string[]
): Promise<string> => {
  console.log(`[AI Moderator] generateModeratorOpening called - topic: "${topic}", participant: ${participantName}, agents: ${agentNames.length}`);

  const startTime = Date.now();
  const phaseGuidance = `This is the very first message of the conversation about "${topic}".

Create a warm, personalized opening that:
- Welcomes everyone by name (${participantName} and the group)
- Relates specifically to the topic "${topic}" with a creative angle
- Asks an inviting, open-ended question that connects to the topic
- Feels fresh and unique, not generic
- Uses language that feels natural and conversational

Make this opening special and tailored to this specific topic.`;

  const userPrompt = `${phaseGuidance}

Agents in the conversation: ${agentNames.join(', ')}

What should you say to open this conversation? Keep it brief, warm, and natural. Only provide the dialogue - no actions or expressions.`;

  console.log(`[AI Moderator] Calling Claude API for opening statement...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    temperature: 0.9,
    system: MODERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const elapsedTime = Date.now() - startTime;
  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleanedResponse = removeExpressions(response);

  console.log(`[AI Moderator] Opening statement generated in ${elapsedTime}ms`);
  console.log(`[AI Moderator] Opening preview: "${cleanedResponse.substring(0, 80)}${cleanedResponse.length > 80 ? '...' : ''}"`);

  return cleanedResponse;
};

// Specialized function for generating closing statement
export const generateModeratorClosing = async (
  conversationHistory: TurnData[],
  topic: string,
  participantName: string,
  sessionMemoryHooks?: SessionMemoryHook[]
): Promise<string> => {
  console.log(`[AI Moderator] generateModeratorClosing called - topic: "${topic}", participant: ${participantName}`);
  console.log(`[AI Moderator] History: ${conversationHistory.length} turns, hooks: ${sessionMemoryHooks?.length || 0}`);

  const startTime = Date.now();
  const fullHistory = conversationHistory.slice(-15).map((turn) => {
    return `${turn.speakerName}: ${turn.content}`;
  }).join('\n');

  // Extract personalized highlight from session memory hooks
  let personalizedHighlight = '';
  if (sessionMemoryHooks && sessionMemoryHooks.length > 0) {
    // Prefer emotionally positive moments or personal stories
    const highlight = sessionMemoryHooks.find(
      h => h.type === 'personal_story' || h.type === 'sensory_detail'
    ) || sessionMemoryHooks[0];

    personalizedHighlight = `\n\nIMPORTANT: Include at least one specific detail that ${participantName} shared in this session. Reference this highlight naturally: "${highlight.content}" (related to: ${highlight.keywords.join(', ')})`;
  }

  const userPrompt = `This is the closing moment of a conversation about "${topic}".

Recent conversation:
${fullHistory}${personalizedHighlight}

Create a warm closing that:
- Thanks everyone for sharing
- MUST include at least one specific, emotionally positive detail that ${participantName} shared during THIS session
- Highlights a key theme or beautiful moment from the conversation
- Leaves everyone feeling valued and connected
- Feels sincere and heartfelt

What should you say to close this conversation? Keep it brief, warm, and natural. Only provide the dialogue - no actions or expressions.`;

  console.log(`[AI Moderator] Calling Claude API for closing statement...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    temperature: 0.9,
    system: MODERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const elapsedTime = Date.now() - startTime;
  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleanedResponse = removeExpressions(response);

  console.log(`[AI Moderator] Closing statement generated in ${elapsedTime}ms`);
  console.log(`[AI Moderator] Closing preview: "${cleanedResponse.substring(0, 80)}${cleanedResponse.length > 80 ? '...' : ''}"`);

  return cleanedResponse;
};
