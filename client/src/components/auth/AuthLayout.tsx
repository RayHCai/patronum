import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Back button */}
      <motion.button
        onClick={() => navigate('/')}
        className="fixed top-8 left-8 z-50 flex items-center gap-2 px-4 py-2 text-[15px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
        style={{ fontFamily: 'var(--font-serif)' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ x: -4 }}
      >
        <ArrowLeft size={20} />
        <span>Back to Home</span>
      </motion.button>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
        {children}
      </main>
    </div>
  );
}
