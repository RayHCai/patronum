// Participant service
import { prisma } from '../prisma/client';
import {
  CreateParticipantDTO,
  UpdateParticipantDTO,
  NotFoundError,
  ValidationError,
} from '../types';

export const createParticipant = async (
  data: CreateParticipantDTO,
  adminEmail?: string
) => {
  const { name, notes, photoUrl, dateOfBirth, caregiver } = data;

  if (!name) {
    throw new ValidationError('Participant name is required');
  }

  // Create participant with PatientUser
  const participant = await prisma.participant.create({
    data: {
      name,
      notes,
      photoUrl,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      caregiver: caregiver || undefined,
      patientUser: {
        create: {},
      },
    },
    include: {
      patientUser: true,
      agents: true,
    },
  });

  return participant;
};

export const getParticipantById = async (id: string) => {
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      patientUser: true,
      agents: true,
      sessions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!participant) {
    throw new NotFoundError('Participant');
  }

  return participant;
};

export const getAllParticipants = async (filters?: {
  isActive?: boolean;
  search?: string;
}) => {
  const { isActive, search } = filters || {};

  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const participants = await prisma.participant.findMany({
    where,
    include: {
      patientUser: true,
      agents: true,
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return participants;
};

export const updateParticipant = async (id: string, data: UpdateParticipantDTO) => {
  const existing = await prisma.participant.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Participant');
  }

  const participant = await prisma.participant.update({
    where: { id },
    data: {
      name: data.name,
      notes: data.notes,
      photoUrl: data.photoUrl,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      caregiver: data.caregiver || undefined,
      isActive: data.isActive,
    },
    include: {
      patientUser: true,
      agents: true,
    },
  });

  return participant;
};

export const deleteParticipant = async (id: string) => {
  const existing = await prisma.participant.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Participant');
  }

  await prisma.participant.delete({ where: { id } });

  return { success: true };
};

export const getParticipantAgents = async (participantId: string) => {
  const agents = await prisma.agent.findMany({
    where: { participantId },
    include: {
      memories: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  return agents;
};

export const getParticipantSessions = async (
  participantId: string,
  limit: number = 20
) => {
  const sessions = await prisma.session.findMany({
    where: { participantId },
    include: {
      turns: {
        orderBy: { sequenceNumber: 'asc' },
      },
      reinforcementItems: true,
      sessionAnalytics: true,
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return sessions;
};
