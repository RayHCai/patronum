// Patient state management with Zustand
import { create } from 'zustand';
import { Participant, Agent, Session } from '../types';

interface PatientState {
  participant: Participant | null;
  agents: Agent[];
  recentSessions: Session[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setParticipant: (participant: Participant | null) => void;
  setAgents: (agents: Agent[]) => void;
  setRecentSessions: (sessions: Session[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  // Initial state
  participant: null,
  agents: [],
  recentSessions: [],
  isLoading: false,
  error: null,

  // Actions
  setParticipant: (participant) => set({ participant }),

  setAgents: (agents) => set({ agents }),

  setRecentSessions: (sessions) => set({ recentSessions: sessions }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set({
    participant: null,
    agents: [],
    recentSessions: [],
    isLoading: false,
    error: null,
  }),
}));
