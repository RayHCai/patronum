// Agent service
import { prisma } from '../prisma/client';
import { GenerateAgentsDTO, NotFoundError, ValidationError } from '../types';
import { getHeygenService, HeygenAvatarConfig } from './heygen';

// Placeholder agent generator (will be replaced with Claude API in Phase 6)
const generateAgentProfiles = async (
  participantBackground: string,
  count: number = 2
) => {
  // Mock agent profiles for now
  // In Phase 6, this will use Claude API to generate personalized agents
  const mockProfiles = [
    {
      name: 'Mary Johnson',
      age: 68,
      background: {
        occupation: 'Retired Teacher',
        hometown: 'Boston, MA',
        family: 'Mother of three',
        interests: ['Reading', 'Gardening', 'Cooking'],
      },
      personality: {
        traits: ['Warm', 'Patient', 'Wise'],
        speakingStyle: 'Gentle and encouraging',
        quirks: ['Often quotes classic literature', 'Loves to share recipes'],
      },
      avatarColor: '#8B5CF6',
      voiceId: 'uYXf8XasLslADfZ2MB4u',
    },
    {
      name: 'Robert Chen',
      age: 72,
      background: {
        occupation: 'Retired Chef',
        hometown: 'San Francisco, CA',
        family: 'Grandfather of five',
        interests: ['Cooking', 'Travel', 'Photography'],
      },
      personality: {
        traits: ['Cheerful', 'Witty', 'Adventurous'],
        speakingStyle: 'Playful with occasional humor',
        quirks: ['Makes food puns', 'Tells travel stories'],
      },
      avatarColor: '#EC4899',
      voiceId: 'robert_voice_en',
    },
    {
      name: 'Susan Davis',
      age: 65,
      background: {
        occupation: 'Retired Librarian',
        hometown: 'Portland, OR',
        family: 'Book club enthusiast',
        interests: ['Literature', 'History', 'Knitting'],
      },
      personality: {
        traits: ['Thoughtful', 'Curious', 'Gentle'],
        speakingStyle: 'Calm and articulate',
        quirks: ['Recommends books', 'Shares historical facts'],
      },
      avatarColor: '#F59E0B',
      voiceId: 'susan_voice_en',
    },
    {
      name: 'James Miller',
      age: 70,
      background: {
        occupation: 'Retired Musician',
        hometown: 'Nashville, TN',
        family: 'Jazz enthusiast',
        interests: ['Music', 'Woodworking', 'Golf'],
      },
      personality: {
        traits: ['Creative', 'Relaxed', 'Friendly'],
        speakingStyle: 'Laid-back and expressive',
        quirks: ['Hums melodies', 'References songs in conversation'],
      },
      avatarColor: '#3B82F6',
      voiceId: 'james_voice_en',
    },
    {
      name: 'Patricia Williams',
      age: 67,
      background: {
        occupation: 'Retired Nurse',
        hometown: 'Chicago, IL',
        family: 'Community volunteer',
        interests: ['Healthcare', 'Yoga', 'Painting'],
      },
      personality: {
        traits: ['Caring', 'Empathetic', 'Strong'],
        speakingStyle: 'Supportive and reassuring',
        quirks: ['Gives health tips', 'Talks about mindfulness'],
      },
      avatarColor: '#10B981',
      voiceId: 'patricia_voice_en',
    },
  ];

  return mockProfiles.slice(0, count);
};

export const generateAgents = async (data: GenerateAgentsDTO) => {
  const { participantId, participantBackground = '', count = 2 } = data;

  console.log(`[Agent Service] generateAgents called - participantId: ${participantId}, count: ${count}`);

  // Verify participant exists
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });

  if (!participant) {
    console.log(`[Agent Service] Participant not found: ${participantId}`);
    throw new NotFoundError('Participant');
  }

  console.log(`[Agent Service] Participant found: ${participant.name} (${participant.id})`);

  // Check if agents already exist
  const existingAgents = await prisma.agent.findMany({
    where: { participantId },
  });

  if (existingAgents.length > 0) {
    console.log(`[Agent Service] Returning ${existingAgents.length} existing agents for participant ${participantId}`);
    return existingAgents;
  }

  console.log(`[Agent Service] No existing agents found, generating ${count} new agent profiles...`);

  // Generate agent profiles
  const profiles = await generateAgentProfiles(participantBackground, count);

  // Get HeyGen service
  const heygenService = getHeygenService();
  console.log(`[Agent Service] HeyGen service configured: ${heygenService.isConfigured()}`);

  // Create agents in database with HeyGen avatars
  console.log(`[Agent Service] Creating ${profiles.length} agents in database...`);
  const agents = await Promise.all(
    profiles.map(async (profile, index) => {
      console.log(`[Agent Service] Creating agent ${index + 1}/${profiles.length}: ${profile.name}`);

      // Generate randomized appearance for HeyGen avatar
      const appearance = heygenService.generateRandomAppearance();

      // Get or create HeyGen avatar ID
      let heygenAvatarId: string | null = null;
      let heygenConfig: HeygenAvatarConfig | null = null;

      if (heygenService.isConfigured()) {
        try {
          console.log(`[Agent Service] Requesting HeyGen avatar for ${profile.name}...`);
          heygenAvatarId = await heygenService.getOrCreateAvatar({ appearance });
          heygenConfig = {
            avatarId: heygenAvatarId,
            appearance,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          };
          console.log(`[Agent Service] HeyGen avatar created for ${profile.name}: ${heygenAvatarId}`);
        } catch (error) {
          console.error(`[Agent Service] Failed to create HeyGen avatar for ${profile.name}:`, error);
          // Continue without HeyGen avatar - will fall back to bubble visualization
        }
      }

      const agent = await prisma.agent.create({
        data: {
          participantId,
          name: profile.name,
          age: profile.age,
          background: profile.background,
          personality: profile.personality,
          avatarColor: profile.avatarColor,
          voiceId: profile.voiceId,
          heygenAvatarId,
          heygenConfig: heygenConfig as any, // Prisma Json type
        },
      });

      console.log(`[Agent Service] Agent created successfully: ${agent.name} (${agent.id})`);
      return agent;
    })
  );

  console.log(`[Agent Service] Successfully generated ${agents.length} agents for participant ${participantId}`);
  return agents;
};

export const getAgentById = async (id: string) => {
  console.log(`[Agent Service] getAgentById called - id: ${id}`);

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      memories: {
        orderBy: { createdAt: 'desc' },
      },
      participant: true,
    },
  });

  if (!agent) {
    console.log(`[Agent Service] Agent not found: ${id}`);
    throw new NotFoundError('Agent');
  }

  console.log(`[Agent Service] Agent retrieved: ${agent.name} (${agent.id}) with ${agent.memories.length} memories`);
  return agent;
};

export const updateAgent = async (
  id: string,
  data: {
    name?: string;
    age?: number;
    background?: any;
    personality?: any;
    avatarColor?: string;
    voiceId?: string;
    heygenAvatarId?: string;
    heygenConfig?: any;
  }
) => {
  console.log(`[Agent Service] updateAgent called - id: ${id}, fields: ${Object.keys(data).join(', ')}`);

  const existing = await prisma.agent.findUnique({ where: { id } });

  if (!existing) {
    console.log(`[Agent Service] Agent not found for update: ${id}`);
    throw new NotFoundError('Agent');
  }

  const agent = await prisma.agent.update({
    where: { id },
    data,
  });

  console.log(`[Agent Service] Agent updated successfully: ${agent.name} (${agent.id})`);
  return agent;
};

export const deleteAgent = async (id: string) => {
  console.log(`[Agent Service] deleteAgent called - id: ${id}`);

  const existing = await prisma.agent.findUnique({ where: { id } });

  if (!existing) {
    console.log(`[Agent Service] Agent not found for deletion: ${id}`);
    throw new NotFoundError('Agent');
  }

  console.log(`[Agent Service] Deleting agent: ${existing.name} (${existing.id})`);
  await prisma.agent.delete({ where: { id } });

  console.log(`[Agent Service] Agent deleted successfully: ${id}`);
  return { success: true };
};

export const getAgentMemories = async (agentId: string, sessionId?: string) => {
  console.log(`[Agent Service] getAgentMemories called - agentId: ${agentId}, sessionId: ${sessionId || 'all'}`);

  const where: any = { agentId };

  if (sessionId) {
    where.sessionId = sessionId;
  }

  const memories = await prisma.agentMemory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`[Agent Service] Retrieved ${memories.length} memories for agent ${agentId}`);
  return memories;
};

export const createAgentMemory = async (
  agentId: string,
  sessionId: string,
  data: {
    memoryType: 'shared_story' | 'opinion' | 'preference' | 'event';
    content: string;
    keywords?: string[];
  }
) => {
  console.log(`[Agent Service] createAgentMemory called - agentId: ${agentId}, sessionId: ${sessionId}, type: ${data.memoryType}`);

  const memory = await prisma.agentMemory.create({
    data: {
      agentId,
      sessionId,
      memoryType: data.memoryType,
      content: data.content,
      keywords: data.keywords || [],
    },
  });

  console.log(`[Agent Service] Memory created: ${memory.id} - ${data.memoryType} with ${data.keywords?.length || 0} keywords`);
  return memory;
};
