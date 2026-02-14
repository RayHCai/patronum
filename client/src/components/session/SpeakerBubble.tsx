// Speaker bubble component for conversation messages
import { motion } from 'framer-motion';
import AgentAvatar from '../ui/AgentAvatar';

interface SpeakerBubbleProps {
  speakerName: string;
  speakerType: 'participant' | 'agent' | 'moderator';
  avatarColor?: string;
  content: string;
  isCurrentSpeaker: boolean;
  timestamp: string;
}

export default function SpeakerBubble({
  speakerName,
  speakerType,
  avatarColor = '#3B82F6',
  content,
  isCurrentSpeaker,
}: SpeakerBubbleProps) {
  const isParticipant = speakerType === 'participant';

  return (
    <motion.div
      className={`flex items-start gap-4 mb-6 ${isParticipant ? 'flex-row-reverse' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <AgentAvatar
          name={speakerName}
          color={avatarColor}
          size="medium"
          isActive={isCurrentSpeaker}
        />
      </div>

      {/* Message Bubble */}
      <div className={`flex-1 ${isParticipant ? 'text-right' : ''}`}>
        <p className="text-lg font-semibold text-gray-800 mb-1">{speakerName}</p>
        <div
          className={`inline-block px-6 py-4 rounded-2xl shadow-md ${
            isParticipant
              ? 'bg-emerald-100 text-emerald-900'
              : 'bg-white text-gray-800'
          }`}
        >
          <p className="text-2xl leading-relaxed">{content}</p>
        </div>
      </div>
    </motion.div>
  );
}
