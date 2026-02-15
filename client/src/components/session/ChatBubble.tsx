import { motion } from 'framer-motion';

interface ChatBubbleProps {
  speaker: string;
  message: string;
  isModerator: boolean;
  isUser: boolean;
  timestamp?: Date;
}

export default function ChatBubble({ speaker, message, isModerator, isUser, timestamp }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Speaker name */}
        <span
          className="text-xs font-medium px-2"
          style={{
            fontFamily: 'var(--font-sans)',
            color: isModerator ? '#065f46' : isUser ? '#3B82F6' : '#6B7280'
          }}
        >
          {speaker}
        </span>

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-5 py-3 shadow-sm ${
            isUser
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : isModerator
              ? 'bg-emerald-800 text-white rounded-tl-sm'
              : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
          }`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <p className="text-[15px] leading-relaxed">{message}</p>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-gray-400 px-2" style={{ fontFamily: 'var(--font-sans)' }}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}
