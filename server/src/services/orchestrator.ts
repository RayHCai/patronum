// Simplified Conversation Orchestrator - session management only
// Turn management is now client-side
import { prisma } from '../prisma/client';
import { generateAgentPersonalities } from './aiPatient';
import { generateAgents } from './agent';

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
    console.log(`[Orchestrator] Fetching all agents for participant ${participantId}...`);
    agents = await prisma.agent.findMany({
      where: { participantId },
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
      5
    );

    // If AI generation failed, fall back to default generation
    if (personalities.length === 0) {
      console.log('[Orchestrator] AI generation failed, using default agents via generateAgents');
      agents = await generateAgents({
        participantId,
        participantBackground: participant.notes || '',
        count: 5,
      });
    } else {
      // Create agents in database with AI-generated personalities
      console.log(`[Orchestrator] Creating ${personalities.length} agents from AI-generated personalities...`);
      agents = await Promise.all(
        personalities.map((profile, index) => {
          console.log(`[Orchestrator] Creating agent ${index + 1}/${personalities.length}: ${profile.name}`);
          return prisma.agent.create({
            data: {
              participantId,
              name: profile.name,
              age: profile.age,
              background: profile.background,
              personality: profile.personality,
              avatarColor: profile.avatarColor,
              voiceId: profile.voiceId,
            },
          });
        })
      );
      console.log(`[Orchestrator] Successfully created ${agents.length} AI-generated agents`);
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

  return {
    id: session.id,
    agents,
    topic,
  };
};
