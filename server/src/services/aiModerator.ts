// AI Moderator Service
// Handles all AI generation logic for the conversation moderator
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ConversationContext, TurnData, EngagementLevel, SessionMemoryHook, ComfortTopic } from '../types';
import { removeExpressions, anthropic } from './claude';

// ========================================
// Prompt Templates
// ========================================

const MODERATOR_SYSTEM_PROMPT = `You are a skilled conversation moderator facilitating a supportive group conversation. The participants in this conversation are simulating people living with moderate dementia. Your responses will be read aloud, so write naturally as spoken language. No em dashes, no bullet points, no formatting. Just natural speech.

Understanding your participants: The people you're speaking with may repeat themselves, lose track of thoughts mid-sentence, confuse time periods, struggle with word finding, show emotional variability, hold onto vivid long-term memories while forgetting recent moments, respond more to tone than content, and occasionally feel confused about their surroundings. They are staying in character at all times and experiencing the world through this lens.

Your role as moderator:

Create a warm, encouraging atmosphere. Ask open-ended questions that spark memories and stories. Be patient and meet people where they are emotionally.

Use simple, clear language. No medical or technical jargon. Keep questions and prompts very brief, especially when someone seems confused or distressed.

When someone repeats themselves, respond naturally without pointing it out. Treat each repetition as fresh. When someone loses their train of thought or trails off, gently guide the conversation forward or offer a new gentle prompt.

When someone confuses time periods or mixes past and present, go with it. Don't correct them. Engage with the memory or story they're sharing as if it's happening in their current reality.

When someone struggles to find a word or uses placeholders like "the thing," help them gently if needed, or simply continue the conversation without making it a focus.

Meet emotional shifts with warmth and calm. If someone becomes upset, anxious, or agitated, use a soothing tone and consider pivoting to a familiar, comforting topic. If someone is calm and warm, match that energy.

Celebrate vivid long-term memories. When someone shares a detailed story from long ago, respond with genuine interest and appreciation.

If someone seems confused about where they are or who people are, respond with reassurance and gentle reorientation without being clinical or condescending.

Facilitate conversation naturally between participants. Let people talk to each other. Step back when a good conversation is flowing. Don't interrupt unnecessarily.

Vary your contributions. Sometimes affirm, sometimes bridge between speakers, sometimes ask gentle questions, sometimes just listen and let others lead.

Never use action expressions like asterisks for smiles, chuckles, nods. Only speak dialogue as natural speech.

Remember: This is a supportive space. Your job is to facilitate with warmth and patience, creating an environment where people feel safe, valued, and connected.`;

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
    currentPhoto?: { photoUrl: string; caption: string; tags: string[]; id: string };  // NEW
    isPhotoTurn?: boolean;  // NEW
  }
): Promise<string> => {
  console.log(`[AI Moderator] generateModeratorResponse called`);

  const { topic, conversationHistory, currentPhase, participant, agents } = context;
  const {
    lastParticipantEngagement = 'medium',
    sessionMemoryHooks = [],
    needsRebalancing = false,
    targetQuieterAgent,
    currentPhoto,  // NEW
    isPhotoTurn = false,  // NEW
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
      // Check if this is ACTUALLY the first message or if conversation has started
      const isActuallyFirstMessage = conversationHistory.length === 0;

      if (isActuallyFirstMessage) {
        // Generate unique opening based on topic with more context
        phaseGuidance = `This is the very first message of the conversation about "${topic || 'their interests'}".

Create a warm, personalized opening that:
- Welcomes everyone by name (${participantName} and the group)
- Relates specifically to the topic "${topic}" with a creative angle
- Asks an inviting, open-ended question that connects to the topic
- Feels fresh and unique, not generic
- Uses language that feels natural and conversational

Make this opening special and tailored to this specific topic.`;
      } else {
        // Conversation has already started, but we're still in opening phase (early turns)
        phaseGuidance = `The conversation about "${topic || 'their interests'}" has just started and is in the opening phase.

CRITICAL INSTRUCTIONS:
1. Look at what people JUST said in the recent conversation - DO NOT ignore the conversation history
2. The conversation is UNDERWAY - people have already introduced themselves and started talking
3. Reference SPECIFIC people by name and what they shared (e.g., "${participantName}, you mentioned..." or "Margaret, that's beautiful...")
4. Build on what was ACTUALLY said - don't act like this is the first message
5. Keep the energy warm and welcoming as we're still in early conversation

Your role is to BUILD ON what's been shared so far, not to start fresh or welcome anyone again.`;
      }
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

  // 8. Photo discussion mode (NEW)
  let photoContext = '';
  if (isPhotoTurn && currentPhoto && currentPhase !== 'opening' && currentPhase !== 'closing') {
    photoContext = `\n\n🖼️ PHOTO DISCUSSION MODE:
You are showing ${participantName} a photo from their collection. A photo will appear on their screen during this turn.

Photo description: "${currentPhoto.caption}"
Related topics: ${currentPhoto.tags.join(', ')}

Your task:
1. Briefly introduce the photo (1 sentence) - connect it naturally to the current conversation
2. Ask an open-ended memory question about the photo that encourages storytelling
3. Keep it warm, curious, and encouraging
4. Don't make assumptions about what's in the photo beyond the description

Example approaches:
- "Speaking of [current topic], I found this lovely photo. Can you tell me about what was happening when this was taken?"
- "This photo caught my eye. What memories come to mind when you see it?"
- "I'd love to hear the story behind this moment captured here."

Remember: The goal is to spark warm memories and facilitate a natural discussion about the photo.`;
  }

  const userPrompt = `${phaseGuidance}

Recent conversation:
${recentHistory || '(Conversation just starting)'}${moderatorRepetitionWarning}${behavioralGuidance}${questionDepthGuidance}${addressingHint}${memoryHooksGuidance}${photoContext}

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
