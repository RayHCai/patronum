// Protected Patient Route - Ensures participant ID exists and provides it via context
import { ReactNode, useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { PatientProvider } from '../contexts/PatientContext';
import { useAuthStore } from '../stores/authStore';

interface ProtectedPatientRouteProps {
  children?: ReactNode;
}

export default function ProtectedPatientRoute({ children }: ProtectedPatientRouteProps) {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const { user, participant } = useAuthStore();

  useEffect(() => {
    // Redirect if no participant ID in URL
    if (!participantId) {
      console.error('[ProtectedPatientRoute] No participant ID found in URL');
      navigate('/');
      return;
    }

    // Note: Participant was already verified in PatientAccess page
    // No need to verify again here
  }, [participantId, navigate]);

  if (!participantId) {
    return null;
  }

  // Get participant name from auth store if available
  const participantName = participant?.name;

  return (
    <PatientProvider participantId={participantId} participantName={participantName}>
      {children || <Outlet />}
    </PatientProvider>
  );
}
