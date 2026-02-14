// Patient Context - Provides participant ID throughout the app
import { createContext, useContext, ReactNode } from 'react';

interface PatientContextType {
  participantId: string;
  participantName?: string;
}

const PatientContext = createContext<PatientContextType | null>(null);

interface PatientProviderProps {
  participantId: string;
  participantName?: string;
  children: ReactNode;
}

export function PatientProvider({ participantId, participantName, children }: PatientProviderProps) {
  return (
    <PatientContext.Provider value={{ participantId, participantName }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
