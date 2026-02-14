// AI Patient (Agent) Service
// Handles all AI generation logic for agents
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ConversationContext, TurnData } from '../types';
import { removeExpressions, stripMarkdownCodeFences, anthropic } from './claude';

// Number of AI agent participants in each session
const NUM_AI_AGENTS = 2;

// ========================================
// Prompt Templates
// ========================================

const AGENT_SYSTEM_PROMPT_TEMPLATE = `You are {name}, a friendly member of a casual group conversation. Here's who you are:

Background:
{background}

Personality:
{personality}

Other people in the conversation:
{otherParticipants}

Conversation Guidelines:
- Share relevant personal stories and memories when appropriate, but VARY your responses - don't repeat the same stories or phrases
- React naturally to what others say - agree, relate, add perspective, ask follow-up questions
- Keep responses brief and conversational (1-3 sentences typically)
- You can speak to two people in this conversation:
  * The moderator (Maya) when you have questions or want to build on their prompts
  * {mainParticipant} when you want to directly engage with them
- IMPORTANT: Do NOT address other agents directly. Only speak to the moderator or {mainParticipant}.
- Address people by name when you're responding to them specifically (e.g., "I think what you're saying, Maya, is..." or "That's interesting, {mainParticipant}...")
- Be warm, supportive, and encouraging
- Stay in character but be natural - you're a real person, not performing
- Reference your background naturally when relevant, but explore different aspects each time
- CRITICAL: Review the conversation history before responding to avoid repeating yourself - each contribution should add something new
- NEVER use action expressions like *smiles*, *chuckles*, *nods*, etc. - only speak dialogue
- Speak naturally as if in a real conversation

Remember: You can only speak to the moderator (Maya) or {mainParticipant}. Do not address other agents.`;

const MEMORY_EXTRACTION_PROMPT = `Based on this conversation excerpt, extract key memories, preferences, and stories shared by the agents that should be remembered for future conversations.

Format your response as a JSON array of memories:
[
  {
    "agentId": "agent_id_here",
    "memoryType": "shared_story" | "opinion" | "preference" | "event",
    "content": "brief description",
    "keywords": ["keyword1", "keyword2"]
  }
]

Conversation:
{conversation}`;

// ========================================
// API Functions
// ========================================

export const generateAgentResponse = async (
  agent: any,
  context: ConversationContext,
  relevantMemories: string[] = [],
  userReturnCounter: number = 0
): Promise<{ content: string; returnToUser: boolean }> => {
  console.log(`[AI Patient] generateAgentResponse called for agent: ${agent.name} (${agent.id})`);
  console.log(`[AI Patient] User return counter: ${userReturnCounter}`);

  const startTime = Date.now();
  const { conversationHistory, agents, participant } = context;

  // Determine if agent should speak directly to the user
  let shouldSpeakToUser = false;
  if (userReturnCounter <= 2) {
    // Random probability check (higher counter = lower probability)
    const probability = userReturnCounter === 0 ? 0.3 : userReturnCounter === 1 ? 0.2 : 0.1;
    shouldSpeakToUser = Math.random() < probability;
    console.log(`[AI Patient] Should speak to user: ${shouldSpeakToUser} (probability: ${probability})`);
  } else {
    console.log(`[AI Patient] User return counter > 2, will NOT speak to user`);
  }

  console.log(`[AI Patient] Context: ${conversationHistory.length} history turns, ${agents.length} agents, ${relevantMemories.length} relevant memories`);

  // Build list of other participants (other agents + moderator)
  const otherAgents = agents.filter(a => a.id !== agent.id);
  const otherParticipantsList = [
    '- Maya (the moderator)',
    `- ${participant.name} (the main participant)`,
    ...otherAgents.map(a => `- ${a.name} (another agent)`)
  ].join('\n');

  const systemPrompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace('{name}', agent.name)
    .replace('{background}', JSON.stringify(agent.background, null, 2))
    .replace('{personality}', JSON.stringify(agent.personality, null, 2))
    .replace('{otherParticipants}', otherParticipantsList)
    .replace('{mainParticipant}', participant.name.split(' ')[0]);

  // Get more history for better context (last 12 turns instead of 8)
  const recentHistory = conversationHistory.slice(-12).map((turn) => {
    return `${turn.speakerName}: ${turn.content}`;
  }).join('\n');

  // Extract what THIS agent has already said in the conversation to avoid repetition
  const agentPreviousContributions = conversationHistory
    .filter(turn => turn.speakerName === agent.name)
    .slice(-5) // Last 5 contributions from this agent (increased from 3)
    .map(turn => turn.content);

  const repetitionWarning = agentPreviousContributions.length > 0
    ? `\n\nIMPORTANT - Your previous ${agentPreviousContributions.length} contributions (YOU MUST AVOID REPEATING THESE):\n${agentPreviousContributions.map((c, i) => `${i + 1}. "${c}"`).join('\n')}\n\nYou must provide a COMPLETELY DIFFERENT response with new content, new perspective, or new questions. Do not reuse phrases or themes from above.`
    : '';

  const memoryContext = relevantMemories.length > 0
    ? `\nThings you remember:\n${relevantMemories.join('\n')}`
    : '';

  // Add variety to who the agent might address
  // Get the last 2-3 speakers to see who just spoke
  const recentSpeakers = conversationHistory.slice(-3).map(t => ({
    name: t.speakerName,
    type: t.speakerType
  }));

  // Build conversation hint based on shouldSpeakToUser decision
  let conversationHint = '';

  if (shouldSpeakToUser) {
    // Agent should speak to the user
    conversationHint = `\n\nIMPORTANT: You should address ${participant.name.split(' ')[0]} directly in this response. Ask them a question or relate to something that would engage them in the conversation.`;
    console.log(`[AI Patient] Prompting agent to speak directly to user`);
  } else {
    // Agent should NOT speak to user - talk to moderator only (NOT other agents)
    conversationHint = `\n\nIMPORTANT: In this response, do NOT address ${participant.name.split(' ')[0]} directly. Instead, speak to the moderator (Maya). Do NOT address other agents directly.`;

    // Check if moderator just spoke - encourage responding to them
    const lastSpeaker = recentSpeakers.length > 0 ? recentSpeakers[recentSpeakers.length - 1] : null;
    if (lastSpeaker && lastSpeaker.type === 'moderator') {
      // Encourage responding to moderator
      conversationHint += `\n\nConsider: The moderator just spoke - you could build on their prompt or ask them a clarifying question.`;
    } else {
      // Generic guidance to speak to moderator
      conversationHint += `\n\nConsider: You could share your thoughts with the moderator (Maya) or respond to what they asked earlier.`;
    }
  }

  const userPrompt = `Recent conversation:
${recentHistory}${memoryContext}${repetitionWarning}${conversationHint}

CRITICAL INSTRUCTION: You must provide a UNIQUE response that is COMPLETELY DIFFERENT from anything you've said before. If you've shared a specific story or detail before, share a DIFFERENT one. If you've asked a certain type of question, ask a DIFFERENT type. Vary your perspective, topics, and approach.

What would you naturally say in response? Stay in character as ${agent.name}. Keep it conversational and brief. Only provide the dialogue - no actions or expressions.`;

  console.log(`[AI Patient] Calling Claude API for agent ${agent.name}...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300, // Increased from 250 to allow more varied responses
    temperature: 1.0, // Increased from 0.9 for maximum variety
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const elapsedTime = Date.now() - startTime;
  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleanedResponse = removeExpressions(response);

  console.log(`[AI Patient] Agent ${agent.name} response generated in ${elapsedTime}ms`);
  console.log(`[AI Patient] Response preview: "${cleanedResponse.substring(0, 80)}${cleanedResponse.length > 80 ? '...' : ''}"`);
  console.log(`[AI Patient] Returning to user: ${shouldSpeakToUser}`);

  return {
    content: cleanedResponse,
    returnToUser: shouldSpeakToUser
  };
};

export const extractMemories = async (
  conversationExcerpt: string,
  agentIds: string[]
): Promise<any[]> => {
  console.log(`[AI Patient] extractMemories called for ${agentIds.length} agents`);
  console.log(`[AI Patient] Conversation excerpt length: ${conversationExcerpt.length} characters`);

  const startTime = Date.now();
  const prompt = MEMORY_EXTRACTION_PROMPT.replace('{conversation}', conversationExcerpt);

  try {
    console.log(`[AI Patient] Calling Claude API for memory extraction...`);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const elapsedTime = Date.now() - startTime;
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const memories = JSON.parse(cleanedText);

    // Filter to only include memories for agents in this conversation
    const filteredMemories = memories.filter((m: any) => agentIds.includes(m.agentId));

    console.log(`[AI Patient] Memory extraction completed in ${elapsedTime}ms`);
    console.log(`[AI Patient] Extracted ${filteredMemories.length} memories (${memories.length} total, ${filteredMemories.length} filtered)`);

    return filteredMemories;
  } catch (error) {
    console.error('[AI Patient] Error extracting memories:', error);
    return [];
  }
};

// ========================================
// Agent Personality Generation - BATCH APPROACH
// ========================================

/**
 * Step 1: Generate a list of personality traits
 */
const generateAgentTraits = async (
  topic: string,
  count: number
): Promise<string[]> => {
  console.log(`[AI Patient] Generating ${count} personality traits for topic: "${topic}"`);

  const prompt = `Generate a list of EXACTLY ${count} unique personality traits for diverse participants in a supportive group conversation about "${topic}".

Each trait should be 2-4 words describing a personality type (e.g., "warm retired teacher", "cheerful gardening enthusiast", "thoughtful former librarian", "witty cookbook author").

Respond with ONLY a JSON array of ${count} trait strings:
["trait1", "trait2", "trait3"]

CRITICAL: The array must contain exactly ${count} items.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const cleanedText = stripMarkdownCodeFences(responseText);
  const traits = JSON.parse(cleanedText);

  console.log(`[AI Patient] Generated ${traits.length} traits:`, traits);

  // Ensure we have exactly the right count
  return traits.slice(0, count);
};

/**
 * Generate a single agent from a trait
 */
const generateSingleAgentFromTrait = async (
  trait: string,
  topic: string,
  color: string,
  index: number
): Promise<any> => {
  console.log(`[AI Patient] Generating agent ${index + 1} with trait: "${trait}"`);

  const prompt = `Create ONE agent personality for a supportive group conversation about "${topic}".

Personality trait: ${trait}

Create an agent with:
- Age: 60-75
- Background: retired profession, hometown, family, interests
- Personality: speaking style, quirks
- Cultural background

Respond with ONLY this JSON object:
{
  "name": "Full Name",
  "age": 68,
  "background": {
    "occupation": "Retired profession",
    "hometown": "City, State",
    "family": "Brief family info",
    "interests": ["Interest1", "Interest2", "Interest3"]
  },
  "personality": {
    "traits": ["Trait1", "Trait2", "Trait3"],
    "speakingStyle": "Brief description",
    "quirks": ["Quirk1", "Quirk2"]
  },
  "avatarColor": "${color}",
  "voiceId": "generated_voice_id"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const cleanedText = stripMarkdownCodeFences(responseText);
  const agent = JSON.parse(cleanedText);

  console.log(`[AI Patient] ✓ Generated agent ${index + 1}: ${agent.name}`);
  return agent;
};

/**
 * Main function: Generate agent personalities using parallel approach
 * This guarantees exactly ${count} agents by generating each individually
 */
export const generateAgentPersonalities = async (
  participantBackground: string,
  topic: string,
  count: number = NUM_AI_AGENTS
): Promise<any[]> => {
  console.log(`[AI Patient] ==========================================`);
  console.log(`[AI Patient] PARALLEL AGENT GENERATION`);
  console.log(`[AI Patient] ==========================================`);
  console.log(`[AI Patient] Topic: "${topic}", Count: ${count}`);
  console.log(`[AI Patient] Participant background length: ${participantBackground.length} characters`);

  const startTime = Date.now();
  const colors = [
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F59E0B', // amber
    '#3B82F6', // blue
    '#10B981', // green
    '#EF4444', // red
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#F97316', // orange
    '#06B6D4', // cyan
  ];

  try {
    // Step 1: Generate traits
    console.log(`[AI Patient] Step 1: Generating ${count} personality traits...`);
    const traits = await generateAgentTraits(topic, count);
    console.log(`[AI Patient] ✓ Generated ${traits.length} traits:`, traits);

    // Step 2: Generate each agent in parallel
    console.log(`[AI Patient] Step 2: Generating ${count} agents in parallel...`);

    const agentPromises = traits.map((trait, index) =>
      generateSingleAgentFromTrait(trait, topic, colors[index % colors.length], index)
    );

    const agents = await Promise.all(agentPromises);

    const elapsedTime = Date.now() - startTime;
    console.log(`[AI Patient] ==========================================`);
    console.log(`[AI Patient] PARALLEL GENERATION COMPLETE`);
    console.log(`[AI Patient] ==========================================`);
    console.log(`[AI Patient] Time elapsed: ${elapsedTime}ms`);
    console.log(`[AI Patient] Successfully generated ${agents.length} agents (requested: ${count})`);
    agents.forEach((agent: any, index: number) => {
      console.log(`[AI Patient]   Agent ${index + 1}: ${agent.name}, age ${agent.age}, color ${agent.avatarColor}`);
    });

    return agents;
  } catch (error) {
    console.error(`[AI Patient] Error in parallel agent generation:`, error);
    throw error;
  }
};
