// Participant service
import { prisma } from '../prisma/client';
import {
  CreateParticipantDTO,
  UpdateParticipantDTO,
  NotFoundError,
  ValidationError,
} from '../types';
import { analyzePhoto } from './photoAnalysis';
import { uploadPhotoToS3, extractKeyFromUrl, getPresignedUrl } from './s3';
import { createId } from '@paralleldrive/cuid2';

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

  // Generate pre-signed URL for participant's profile photo if it's an S3 URL
  if (participant.photoUrl && participant.photoUrl.includes('s3')) {
    try {
      const key = extractKeyFromUrl(participant.photoUrl);
      const presignedUrl = await getPresignedUrl(key, 3600);
      participant.photoUrl = presignedUrl;
    } catch (error) {
      console.error(`[Participant Service] Failed to generate pre-signed URL for participant ${id} photo:`, error);
      // Keep original URL as fallback
    }
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

  // Generate pre-signed URLs for participant photos
  const participantsWithPresignedUrls = await Promise.all(
    participants.map(async (participant) => {
      if (participant.photoUrl && participant.photoUrl.includes('s3')) {
        try {
          const key = extractKeyFromUrl(participant.photoUrl);
          const presignedUrl = await getPresignedUrl(key, 3600);
          return { ...participant, photoUrl: presignedUrl };
        } catch (error) {
          console.error(`[Participant Service] Failed to generate pre-signed URL for participant ${participant.id}:`, error);
          return participant;
        }
      }
      return participant;
    })
  );

  return participantsWithPresignedUrls;
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

  console.log(`[Participant Service] Fetched ${sessions.length} sessions for participant ${participantId}`);
  sessions.forEach(session => {
    console.log(`  Session ${session.id}: status=${session.status}, aiSummary=${!!session.aiSummary}, analytics=${session.sessionAnalytics.length}`);
  });

  return sessions;
};

// ========================================
// Photo Management Functions
// ========================================

/**
 * Upload and analyze photos for a participant
 * Uses AI vision to automatically generate captions and tags
 * @param participantId - Participant ID
 * @param files - Array of file buffers with metadata
 * @returns Array of created PatientPhoto records
 */
export const uploadParticipantPhotos = async (
  participantId: string,
  files: Array<{ buffer: Buffer; mimetype: string }>
) => {
  console.log(`[Participant Service] Uploading ${files.length} photos for participant ${participantId}`);

  // Verify participant exists
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });

  if (!participant) {
    throw new NotFoundError('Participant');
  }

  const photos = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[Participant Service] Processing photo ${i + 1}/${files.length}...`);

    try {
      // 1. Analyze photo with AI vision
      const { caption, tags } = await analyzePhoto(file.buffer, file.mimetype);

      // 2. Upload to S3
      const photoId = createId();
      const photoUrl = await uploadPhotoToS3(file.buffer, participantId, photoId, file.mimetype);

      // 3. Save to database with AI-generated metadata
      const photo = await prisma.patientPhoto.create({
        data: {
          participantId,
          photoUrl,
          caption,
          tags,
          isAIGenerated: true,
        },
      });

      console.log(`[Participant Service] ✅ Photo ${i + 1} uploaded: ${photo.id}`);
      photos.push(photo);

    } catch (error) {
      console.error(`[Participant Service] ❌ Failed to process photo ${i + 1}:`, error);
      throw new Error(`Failed to process photo ${i + 1}: ${error}`);
    }
  }

  console.log(`[Participant Service] ✅ Successfully uploaded ${photos.length} photos`);
  return photos;
};

/**
 * Get all photos for a participant
 * @param participantId - Participant ID
 * @param options - Query options
 * @returns Array of PatientPhoto records with pre-signed URLs
 */
export const getParticipantPhotos = async (
  participantId: string,
  options?: { orderBy?: 'newest' | 'oldest' | 'mostShown' | 'leastShown' }
) => {
  const { orderBy = 'newest' } = options || {};

  let orderByClause: any;
  switch (orderBy) {
    case 'oldest':
      orderByClause = { uploadedAt: 'asc' };
      break;
    case 'mostShown':
      orderByClause = { timesShown: 'desc' };
      break;
    case 'leastShown':
      orderByClause = { timesShown: 'asc' };
      break;
    case 'newest':
    default:
      orderByClause = { uploadedAt: 'desc' };
  }

  const photos = await prisma.patientPhoto.findMany({
    where: { participantId },
    orderBy: orderByClause,
  });

  console.log(`[Participant Service] Fetched ${photos.length} photos for participant ${participantId}`);

  // Generate pre-signed URLs for secure access (valid for 1 hour)
  const photosWithPresignedUrls = await Promise.all(
    photos.map(async (photo) => {
      try {
        const key = extractKeyFromUrl(photo.photoUrl);
        const presignedUrl = await getPresignedUrl(key, 3600); // 1 hour expiration
        return {
          ...photo,
          photoUrl: presignedUrl,
        };
      } catch (error) {
        console.error(`[Participant Service] Failed to generate pre-signed URL for photo ${photo.id}:`, error);
        // Return original URL as fallback
        return photo;
      }
    })
  );

  return photosWithPresignedUrls;
};

/**
 * Update a photo's caption and/or tags
 * Marks photo as manually edited (isAIGenerated = false)
 * @param photoId - Photo ID
 * @param updates - Fields to update
 * @returns Updated PatientPhoto record
 */
export const updateParticipantPhoto = async (
  photoId: string,
  updates: { caption?: string; tags?: string[]; isAIGenerated?: boolean }
) => {
  const existing = await prisma.patientPhoto.findUnique({
    where: { id: photoId },
  });

  if (!existing) {
    throw new NotFoundError('Photo');
  }

  const photo = await prisma.patientPhoto.update({
    where: { id: photoId },
    data: {
      caption: updates.caption !== undefined ? updates.caption : existing.caption,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      isAIGenerated: updates.isAIGenerated !== undefined ? updates.isAIGenerated : false,
    },
  });

  console.log(`[Participant Service] Updated photo ${photoId}`);
  return photo;
};

/**
 * Delete a photo
 * @param photoId - Photo ID
 * @returns Success status
 */
export const deleteParticipantPhoto = async (photoId: string) => {
  const existing = await prisma.patientPhoto.findUnique({
    where: { id: photoId },
  });

  if (!existing) {
    throw new NotFoundError('Photo');
  }

  await prisma.patientPhoto.delete({
    where: { id: photoId },
  });

  console.log(`[Participant Service] Deleted photo ${photoId}`);
  return { success: true };
};

/**
 * Update photo statistics when shown during a session
 * @param photoId - Photo ID
 */
export const recordPhotoShown = async (photoId: string) => {
  await prisma.patientPhoto.update({
    where: { id: photoId },
    data: {
      lastShownAt: new Date(),
      timesShown: {
        increment: 1,
      },
    },
  });

  console.log(`[Participant Service] Recorded photo ${photoId} as shown`);
};
