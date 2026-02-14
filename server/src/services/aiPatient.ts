// AI Patient (Agent) Service
// Handles all AI generation logic for agents
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ConversationContext, TurnData } from '../types';
import { removeExpressions, stripMarkdownCodeFences, anthropic } from './claude';

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
- Share relevant personal stories and memories when appropriate
- React naturally to what others say - agree, relate, add perspective
- Keep responses brief and conversational (1-3 sentences typically)
- IMPORTANT: Don't always talk to {mainParticipant}! Naturally address:
  * Other agents by name when their comment resonates with you
  * The moderator (Guide) when you have questions or want to build on their prompts
  * {mainParticipant} when directly relevant to what they said
- Address people by name when you're responding to them specifically (e.g., "I agree with you, Maria..." or "That's interesting, John...")
- Ask questions to other agents sometimes, not just {mainParticipant}
- Build on what others say - if an agent shares a story, you can relate to it or ask them about it
- Be warm, supportive, and encouraging
- Stay in character but be natural - you're a real person, not performing
- Reference your background naturally when relevant
- NEVER use action expressions like *smiles*, *chuckles*, *nods*, etc. - only speak dialogue
- Speak naturally as if in a real conversation

Remember: You're having a friendly group chat with multiple people. Mix it up - don't just focus on one person!`;

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
  relevantMemories: string[] = []
): Promise<string> => {
  console.log(`[AI Patient] generateAgentResponse called for agent: ${agent.name} (${agent.id})`);
  console.log(`[AI Patient] Context: ${conversationHistory.length} history turns, ${agents.length} agents, ${relevantMemories.length} relevant memories`);

  const startTime = Date.now();
  const { conversationHistory, agents, participant } = context;

  // Build list of other participants (other agents + moderator)
  const otherAgents = agents.filter(a => a.id !== agent.id);
  const otherParticipantsList = [
    '- Guide (the moderator)',
    `- ${participant.name} (the main participant)`,
    ...otherAgents.map(a => `- ${a.name} (another agent)`)
  ].join('\n');

  const systemPrompt = AGENT_SYSTEM_PROMPT_TEMPLATE
    .replace('{name}', agent.name)
    .replace('{background}', JSON.stringify(agent.background, null, 2))
    .replace('{personality}', JSON.stringify(agent.personality, null, 2))
    .replace('{otherParticipants}', otherParticipantsList)
    .replace('{mainParticipant}', participant.name.split(' ')[0]);

  const recentHistory = conversationHistory.slice(-8).map((turn) => {
    return `${turn.speakerName}: ${turn.content}`;
  }).join('\n');

  const memoryContext = relevantMemories.length > 0
    ? `\nThings you remember:\n${relevantMemories.join('\n')}`
    : '';

  // Add variety to who the agent might address
  // Get the last 2-3 speakers to see who just spoke
  const recentSpeakers = conversationHistory.slice(-3).map(t => ({
    name: t.speakerName,
    type: t.speakerType
  }));

  // Randomly decide on a conversation style hint (30% of the time)
  const shouldAddHint = Math.random() < 0.3;
  let conversationHint = '';

  if (shouldAddHint && recentSpeakers.length > 0) {
    const lastSpeaker = recentSpeakers[recentSpeakers.length - 1];
    const randomChoice = Math.random();

    if (randomChoice < 0.4 && lastSpeaker.type === 'agent' && lastSpeaker.name !== agent.name) {
      // Encourage responding to another agent
      conversationHint = `\n\nConsider: ${lastSpeaker.name} just spoke - you could respond to them directly, ask them a follow-up question, or relate to their comment.`;
    } else if (randomChoice < 0.7 && lastSpeaker.type === 'moderator') {
      // Encourage responding to moderator
      conversationHint = `\n\nConsider: The moderator just spoke - you could build on their prompt or ask them a clarifying question.`;
    } else if (otherAgents.length > 0 && randomChoice < 0.85) {
      // Encourage asking another agent a question
      const randomAgent = otherAgents[Math.floor(Math.random() * otherAgents.length)];
      conversationHint = `\n\nConsider: You could ask ${randomAgent.name} a question or bring them into the conversation.`;
    }
  }

  const userPrompt = `Recent conversation:
${recentHistory}${memoryContext}${conversationHint}

What would you naturally say in response? Stay in character as ${agent.name}. Keep it conversational and brief. Only provide the dialogue - no actions or expressions.`;

  console.log(`[AI Patient] Calling Claude API for agent ${agent.name}...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 250,
    temperature: 0.9,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const elapsedTime = Date.now() - startTime;
  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleanedResponse = removeExpressions(response);

  console.log(`[AI Patient] Agent ${agent.name} response generated in ${elapsedTime}ms`);
  console.log(`[AI Patient] Response preview: "${cleanedResponse.substring(0, 80)}${cleanedResponse.length > 80 ? '...' : ''}"`);

  return cleanedResponse;
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
// Agent Personality Generation
// ========================================

export const generateAgentPersonalities = async (
  participantBackground: string,
  topic: string,
  count: number = 5
): Promise<any[]> => {
  console.log(`[AI Patient] generateAgentPersonalities called - topic: "${topic}", count: ${count}`);
  console.log(`[AI Patient] Participant background length: ${participantBackground.length} characters`);

  const startTime = Date.now();
  const prompt = `Generate ${count} unique, diverse agent personalities for a supportive group conversation about "${topic}".

Context about the participant: ${participantBackground || 'General supportive conversation'}

Create agents with varied:
- Ages (60-75)
- Backgrounds (retired professions, hobbies, life experiences)
- Personalities (warm, cheerful, thoughtful, witty, etc.)
- Speaking styles
- Cultural backgrounds and hometowns

Respond with ONLY a JSON array in this exact format:
[
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
    "avatarColor": "#HEX_COLOR",
    "voiceId": "generated_voice_id"
  }
]

Use diverse colors: purple (#8B5CF6), pink (#EC4899), amber (#F59E0B), blue (#3B82F6), green (#10B981), red (#EF4444), indigo (#6366F1), etc.`;

  console.log(`[AI Patient] Calling Claude API to generate ${count} agent personalities...`);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }],
  });

  const elapsedTime = Date.now() - startTime;

  try {
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const agents = JSON.parse(cleanedText);

    console.log(`[AI Patient] Agent personalities generated in ${elapsedTime}ms`);
    console.log(`[AI Patient] Successfully generated ${agents.length} agent personalities`);
    agents.forEach((agent: any, index: number) => {
      console.log(`[AI Patient]   Agent ${index + 1}: ${agent.name}, age ${agent.age}, color ${agent.avatarColor}`);
    });

    return agents;
  } catch (error) {
    console.error(`[AI Patient] Error parsing agent personalities after ${elapsedTime}ms:`, error);
    // Return fallback empty array - caller will handle
    return [];
  }
};
