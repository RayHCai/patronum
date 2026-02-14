// Agent ring sidebar showing active agents
import { motion } from 'framer-motion';
import AgentAvatar from '../ui/AgentAvatar';
import { Agent } from '../../types';

interface AgentRingProps {
  agents: Agent[];
  currentSpeakerId?: string | null;
}

export default function AgentRing({ agents, currentSpeakerId }: AgentRingProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Conversation Friends</h3>

      <div className="space-y-6">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AgentAvatar
              name={agent.name}
              color={agent.avatarColor}
              size="large"
              isActive={currentSpeakerId === agent.id}
            />
            <p className="text-lg font-medium text-gray-800 mt-2 text-center">
              {agent.name}
            </p>
            <p className="text-sm text-gray-600 text-center">
              {agent.background.occupation || 'Friend'}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
