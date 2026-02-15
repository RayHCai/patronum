import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import AuthLayout from '../components/auth/AuthLayout';
import { LoadingScreen } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PatientAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginAsPatient = useAuthStore((state) => state.loginAsPatient);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = searchParams.get('id');

    if (!patientId) {
      setError('Invalid access link: No patient ID provided');
      setIsLoading(false);
      return;
    }

    verifyPatientAccess(patientId);
  }, [searchParams]);

  const verifyPatientAccess = async (patientId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/patient/verify/${patientId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify patient access');
      }

      if (data.success) {
        loginAsPatient(data.data.user, data.data.participant);
        navigate(`/patient/${patientId}/home`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify patient access');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AuthLayout>
        <LoadingScreen
          mode="card"
          size="large"
          message="Verifying access..."
          subtitle=""
        />
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout>
        <motion.div
          className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-[var(--color-border)] p-8 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-6">
            <motion.div
              className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <svg
                className="w-8 h-8 text-[var(--color-accent)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.div>
            <h1
              className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Access Denied
            </h1>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              {error}
            </p>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return null;
}
