// Participant management service
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CreatePatientData {
  name: string;
  dateOfBirth?: string;
  notes?: string;
  photoUrl?: string;
  caregiver?: {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface Participant {
  id: string;
  name: string;
  dateOfBirth?: string;
  notes?: string;
  photoUrl?: string;
  caregiver?: any;
  createdAt: string;
}

export const createPatient = async (
  data: CreatePatientData
): Promise<Participant> => {
  const response = await fetch(`${API_URL}/api/participants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create patient');
  }

  return result.data;
};

export const getParticipant = async (participantId: string): Promise<any> => {
  const response = await fetch(`${API_URL}/api/participants/${participantId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch participant');
  }

  return result.data;
};

export const getAllParticipants = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}/api/participants`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch participants');
  }

  return result.data;
};
