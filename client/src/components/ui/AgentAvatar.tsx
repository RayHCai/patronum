// Agent avatar component
import { motion } from 'framer-motion';

interface AgentAvatarProps {
  name: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  isActive?: boolean;
  onClick?: () => void;
}

export default function AgentAvatar({
  name,
  color,
  size = 'medium',
  isActive = false,
  onClick,
}: AgentAvatarProps) {
  const sizeClasses = {
    small: 'w-16 h-16 text-xl',
    medium: 'w-24 h-24 text-3xl',
    large: 'w-32 h-32 text-4xl',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
        isActive ? 'ring-4 ring-emerald-500 ring-offset-2' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.1 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      animate={isActive ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
    >
      {initials}
    </motion.div>
  );
}
