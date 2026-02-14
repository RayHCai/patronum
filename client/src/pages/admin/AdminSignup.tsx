import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AdminSignup() {
  const navigate = useNavigate();
  const loginAsAdmin = useAuthStore((state) => state.loginAsAdmin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/admin/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      if (data.success) {
        loginAsAdmin(data.data.user);
        navigate('/admin/patients');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Create account" subtitle="Join as an administrator">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[var(--color-border-hover)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[var(--color-border-hover)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="••••••••"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Minimum 6 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Confirm password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[var(--color-border-hover)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="••••••••"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-3.5 text-[16px] font-semibold text-white bg-[var(--color-accent)] rounded-lg shadow-lg hover:shadow-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            style={{ fontFamily: 'var(--font-serif)' }}
            whileHover={!isLoading ? { scale: 1.01, boxShadow: '0 12px 40px rgba(140, 21, 21, 0.3)' } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
            Already have an account?{' '}
            <Link
              to="/admin/auth/login"
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-semibold transition-colors"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
