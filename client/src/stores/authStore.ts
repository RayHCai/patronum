import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PatientUser {
  id: string;
  participantId: string;
}

interface Participant {
  id: string;
  name: string;
  photoUrl?: string;
  dateOfBirth?: string;
  isActive: boolean;
}

interface AuthState {
  userType: 'admin' | 'patient' | null;
  userId: string | null;
  admin: Admin | null;
  patient: PatientUser | null;
  participant: Participant | null;
  isAuthenticated: boolean;

  // Actions
  loginAsAdmin: (admin: Admin) => void;
  loginAsPatient: (patient: PatientUser, participant: Participant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      userType: null,
      userId: null,
      admin: null,
      patient: null,
      participant: null,
      isAuthenticated: false,

      // Actions
      loginAsAdmin: (admin) =>
        set({
          userType: 'admin',
          userId: admin.id,
          admin,
          patient: null,
          participant: null,
          isAuthenticated: true,
        }),

      loginAsPatient: (patient, participant) =>
        set({
          userType: 'patient',
          userId: patient.id,
          admin: null,
          patient,
          participant,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          userType: null,
          userId: null,
          admin: null,
          patient: null,
          participant: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage', // Key in localStorage
    }
  )
);
