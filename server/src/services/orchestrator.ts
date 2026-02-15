// Simplified Conversation Orchestrator - session management only
// Turn management is now client-side
import { prisma } from '../prisma/client';
import { generateAgentPersonalities } from './aiPatient';
import { generateAgents } from './agent';
import { getHeygenService } from './heygen';
import { NUM_AI_AGENTS } from '../constants/config';

/**
 * Parse heygenConfig from JSON string to object and ensure it has all required fields
 */
function parseHeygenConfig(agent: any) {
  if (agent.heygenConfig) {
    try {
      if (typeof agent.heygenConfig === 'string') {
        agent.heygenConfig = JSON.parse(agent.heygenConfig);
      }

      // Fallback: If heygenConfig exists but is missing avatarId, use heygenAvatarId field
      if (agent.heygenConfig && !agent.heygenConfig.avatarId && agent.heygenAvatarId) {
        console.log(`[Orchestrator] Adding missing avatarId to heygenConfig for agent ${agent.id}`);
        agent.heygenConfig.avatarId = agent.heygenAvatarId;
      }
    } catch (e) {
      console.error(`[Orchestrator] Failed to parse heygenConfig for agent ${agent.id}:`, e);
      agent.heygenConfig = null;
    }
  } else if (agent.heygenAvatarId) {
    // Fallback: If no heygenConfig but has heygenAvatarId, create a minimal config
    console.log(`[Orchestrator] Creating minimal heygenConfig for agent ${agent.id} from heygenAvatarId`);
    agent.heygenConfig = {
      avatarId: agent.heygenAvatarId,
      appearance: {
        gender: 'male',
        ethnicity: 'Caucasian',
        age: agent.age || 68,
        clothing: 'casual sweater',
        background: 'cozy room',
      },
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  }
  return agent;
}

/**
 * Start a new conversation session
 * Simplified version - only creates session and returns agents
 * Client manages all turn flow
 */
export const startConversationSession = async (
  participantId: string,
  topic?: string,
  agentIds?: string[]
) => {
  console.log(`[Orchestrator] Starting session for participant ${participantId}`);
  console.log(`[Orchestrator] Topic: "${topic || 'none provided'}", agentIds: ${agentIds?.length || 0} specified`);

  // Get participant
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });

  if (!participant) {
    console.log(`[Orchestrator] Participant not found: ${participantId}`);
    throw new Error('Participant not found');
  }

  console.log(`[Orchestrator] Participant found: ${participant.name} (${participant.id})`);

  // Get or create agents
  let agents;
  if (agentIds && agentIds.length > 0) {
    console.log(`[Orchestrator] Fetching ${agentIds.length} specific agents...`);
    agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
    });
    console.log(`[Orchestrator] Found ${agents.length} matching agents`);
  } else {
    console.log(`[Orchestrator] Fetching agents for participant ${participantId} (limit: ${NUM_AI_AGENTS})...`);
    agents = await prisma.agent.findMany({
      where: { participantId },
      take: NUM_AI_AGENTS,
      orderBy: { createdAt: 'asc' }, // Get the oldest/first agents created
    });
    console.log(`[Orchestrator] Found ${agents.length} existing agents`);
  }

  // Generate custom agents for this session if none exist
  if (agents.length === 0) {
    console.log(`[Orchestrator] No agents found, generating custom agents for topic "${topic}"...`);

    // Generate custom personalities using Claude
    console.log(`[Orchestrator] Calling generateAgentPersonalities with topic: "${topic || 'general conversation'}"`);
    const personalities = await generateAgentPersonalities(
      participant.notes || '',
      topic || 'general conversation',
      NUM_AI_AGENTS
    );

    // If AI generation failed, fall back to default generation
    if (personalities.length === 0) {
      console.log('[Orchestrator] AI generation failed, using default agents via generateAgents');
      agents = await generateAgents({
        participantId,
        participantBackground: participant.notes || '',
        count: NUM_AI_AGENTS,
      });
    } else {
      // Create agents in database with AI-generated personalities
      console.log(`[Orchestrator] Creating ${personalities.length} agents from AI-generated personalities...`);

      // Get HeyGen service
      const heygenService = getHeygenService();

      // Create agents with HeyGen avatars
      const agentCreationPromises = personalities.map(async (profile, index) => {
        try {
          console.log(`[Orchestrator] Creating agent ${index + 1}/${personalities.length}: ${profile.name}`);

          // Generate HeyGen avatar ID based on appearance
          const appearance = {
            gender: profile.gender || (Math.random() > 0.5 ? 'male' : 'female'),
            ethnicity: profile.ethnicity || 'Caucasian',
            age: profile.age,
            clothing: 'casual sweater',
            background: 'cozy room',
          };

          console.log(`[Orchestrator]   Appearance for ${profile.name}:`, appearance);

          let heygenAvatarId: string;
          try {
            heygenAvatarId = await heygenService.getOrCreateAvatar({
              appearance,
              avatarId: '',
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString(),
            });
            console.log(`[Orchestrator]   ✅ Got HeyGen avatar ID: ${heygenAvatarId}`);
          } catch (heygenError) {
            console.error(`[Orchestrator]   ⚠️ HeyGen avatar creation failed:`, heygenError);
            // Use fallback avatar ID based on gender
            heygenAvatarId = appearance.gender === 'female'
              ? 'Angela-inblackskirt-20220820'
              : 'Wayne_20240711';
            console.log(`[Orchestrator]   Using fallback avatar: ${heygenAvatarId}`);
          }

          // Final validation - ensure we have a valid avatar ID
          if (!heygenAvatarId || heygenAvatarId === 'default' || heygenAvatarId === 'fallback-avatar-id') {
            heygenAvatarId = appearance.gender === 'female'
              ? 'Angela-inblackskirt-20220820'
              : 'Wayne_20240711';
            console.warn(`[Orchestrator]   ⚠️ Invalid avatar ID detected, using fallback: ${heygenAvatarId}`);
          }

          // Create agent in database
          return prisma.agent.create({
            data: {
              participantId,
              name: profile.name,
              age: profile.age,
              background: profile.background,
              personality: profile.personality,
              avatarColor: profile.avatarColor,
              voiceId: profile.voiceId,
              heygenAvatarId,
              heygenConfig: JSON.stringify({
                avatarId: heygenAvatarId,
                appearance,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
              }),
            },
          });
        } catch (error) {
          console.error(`[Orchestrator] ❌ Failed to create agent ${profile.name}:`, error);
          // Generate fallback avatar even in error case
          const fallbackGender = profile.gender || 'male';
          const fallbackAvatarId = fallbackGender === 'female'
            ? 'Angela-inblackskirt-20220820'
            : 'Wayne_20240711';

          return prisma.agent.create({
            data: {
              participantId,
              name: profile.name,
              age: profile.age,
              background: profile.background,
              personality: profile.personality,
              avatarColor: profile.avatarColor,
              voiceId: profile.voiceId,
              heygenAvatarId: fallbackAvatarId,
              heygenConfig: JSON.stringify({
                avatarId: fallbackAvatarId,
                appearance: {
                  gender: fallbackGender,
                  ethnicity: 'Caucasian',
                  age: profile.age,
                  clothing: 'casual sweater',
                  background: 'cozy room',
                },
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
              }),
            },
          });
        }
      });

      const results = await Promise.allSettled(agentCreationPromises);

      // Extract successful agents
      agents = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map((result) => result.value);

      console.log(`[Orchestrator] Successfully created ${agents.length} AI-generated agents with HeyGen avatars`);
    }

    console.log(`[Orchestrator] Total agents available: ${agents.length}`);
  }

  // Create session in database
  console.log(`[Orchestrator] Creating session in database...`);
  const session = await prisma.session.create({
    data: {
      participantId,
      topic,
      status: 'active',
    },
  });

  console.log(`[Orchestrator] Session created successfully: ${session.id}`);
  console.log(`[Orchestrator] Session details - ID: ${session.id}, Topic: "${topic || 'none'}", Agents: ${agents.length}, Status: ${session.status}`);

  // Parse heygenConfig for all agents before returning
  const parsedAgents = agents.map(parseHeygenConfig);

  console.log(`[Orchestrator] ==========================================`);
  console.log(`[Orchestrator] PARSED AGENTS BEFORE RETURN`);
  console.log(`[Orchestrator] ==========================================`);
  parsedAgents.forEach((agent: any, index: number) => {
    console.log(`[Orchestrator] Agent ${index + 1}:`, {
      id: agent.id,
      name: agent.name,
      heygenAvatarId: agent.heygenAvatarId,
      hasHeygenConfig: !!agent.heygenConfig,
      heygenConfigType: typeof agent.heygenConfig,
      heygenConfigAvatarId: agent.heygenConfig?.avatarId,
      heygenConfigKeys: agent.heygenConfig ? Object.keys(agent.heygenConfig) : [],
    });
  });

  return {
    id: session.id,
    agents: parsedAgents,
    topic,
  };
};
