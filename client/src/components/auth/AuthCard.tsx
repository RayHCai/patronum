import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1]
    }
  }
};

export default function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <motion.div
      className="w-full max-w-md"
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="text-5xl font-semibold mb-3 tracking-tight"
          style={{
            fontFamily: 'var(--font-serif)',
            background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #4B5563 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {title}
        </h1>
        <p
          className="text-lg text-[var(--color-text-secondary)]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {subtitle}
        </p>
      </div>

      {/* Card */}
      <motion.div
        className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-[var(--color-border)] p-8"
        whileHover={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)' }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
