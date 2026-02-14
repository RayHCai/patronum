import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthCard from '../components/auth/AuthCard';

export default function PatientAuth() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      // Navigate to patient access with the ID
      navigate(`/patient/access?id=${accessCode.trim()}`);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome"
        subtitle="Enter your personal access code to continue"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="accessCode"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Access code
            </label>
            <input
              type="text"
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[var(--color-border-hover)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all font-mono"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="Enter your code"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-2" style={{ fontFamily: 'var(--font-sans)' }}>
              This code was provided by your healthcare provider
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={!accessCode.trim()}
            className="w-full px-8 py-3.5 text-[16px] font-semibold text-white bg-[var(--color-accent)] rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-serif)' }}
            whileHover={accessCode.trim() ? { scale: 1.01, boxShadow: '0 12px 40px rgba(140, 21, 21, 0.3)' } : {}}
            whileTap={accessCode.trim() ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
          >
            Continue
          </motion.button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <p
            className="text-sm text-center text-[var(--color-text-secondary)] mb-3"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Don't have an access code?
          </p>
          <p
            className="text-xs text-center text-[var(--color-text-muted)] mb-4"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Please contact your healthcare provider or administrator to receive your personal access link.
          </p>

          <motion.button
            onClick={() => navigate('/admin/auth/login')}
            className="w-full px-6 py-2.5 text-[14px] font-semibold text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] rounded-lg hover:border-[var(--color-text-primary)] transition-all duration-150"
            style={{ fontFamily: 'var(--font-serif)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Administrator Login
          </motion.button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
