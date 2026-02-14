// Patient-specific card component (large, clear, touch-friendly)
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PatientCardProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  variant?: 'default' | 'topic';
}

export default function PatientCard({
  children,
  onClick,
  selected = false,
  className = '',
  variant = 'default',
}: PatientCardProps) {
  const isClickable = !!onClick;

  const baseClass = variant === 'topic'
    ? 'w-48 h-48 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl shadow-lg transition-all'
    : 'bg-white rounded-2xl shadow-lg p-6 transition-all';

  const selectedClass = selected ? 'ring-4 ring-[var(--color-accent)] shadow-xl' : '';
  const hoverClass = isClickable ? 'hover:shadow-xl cursor-pointer' : '';

  return (
    <motion.div
      className={`${baseClass} ${selectedClass} ${hoverClass} ${className}`}
      onClick={onClick}
      whileHover={isClickable ? { scale: 1.02, y: -4 } : {}}
      whileTap={isClickable ? { scale: 0.97 } : {}}
      transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.div>
  );
}
