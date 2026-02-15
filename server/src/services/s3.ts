// S3 service for uploading audio files
import AWS from 'aws-sdk';
import { config } from '../config';

// Initialize S3 client
const s3 = new AWS.S3({
  region: config.AWS_REGION,
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
});

/**
 * Upload an audio buffer to S3
 * @param buffer - Audio buffer to upload
 * @param key - S3 object key (path within bucket)
 * @param contentType - MIME type of the audio
 * @returns S3 object URL
 */
export const uploadAudioToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<string> => {
  if (!config.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const params: AWS.S3.PutObjectRequest = {
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL removed - use bucket policy for access control
  };

  try {
    const result = await s3.upload(params).promise();
    console.log(`✅ Uploaded audio to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw new Error(`Failed to upload audio to S3: ${error}`);
  }
};

/**
 * Upload multiple audio files to S3
 * @param files - Array of { buffer, key, contentType }
 * @returns Array of S3 URLs
 */
export const uploadMultipleAudios = async (
  files: Array<{ buffer: Buffer; key: string; contentType?: string }>
): Promise<string[]> => {
  const uploadPromises = files.map((file) =>
    uploadAudioToS3(file.buffer, file.key, file.contentType)
  );

  return Promise.all(uploadPromises);
};

/**
 * Generate S3 key for a session audio file
 * @param sessionId - Session ID
 * @param turnId - Turn ID
 * @param speakerType - Type of speaker
 * @returns S3 key
 */
export const generateAudioKey = (
  sessionId: string,
  turnId: string,
  speakerType: 'participant' | 'agent' | 'moderator'
): string => {
  const timestamp = Date.now();
  return `sessions/${sessionId}/audio/${speakerType}-${turnId}-${timestamp}.mp3`;
};

/**
 * Generate S3 key for full session audio
 * @param sessionId - Session ID
 * @returns S3 key
 */
export const generateFullSessionAudioKey = (sessionId: string): string => {
  const timestamp = Date.now();
  return `sessions/${sessionId}/full-audio-${timestamp}.mp3`;
};

/**
 * Upload a photo buffer to S3
 * @param buffer - Photo buffer to upload
 * @param participantId - Participant ID
 * @param photoId - Photo ID
 * @param contentType - MIME type of the photo
 * @returns S3 object URL
 */
export const uploadPhotoToS3 = async (
  buffer: Buffer,
  participantId: string,
  photoId: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  if (!config.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const key = generatePhotoKey(participantId, photoId);

  const params: AWS.S3.PutObjectRequest = {
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL removed - use bucket policy for access control
  };

  try {
    const result = await s3.upload(params).promise();
    console.log(`✅ Uploaded photo to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error('❌ S3 photo upload error:', error);
    throw new Error(`Failed to upload photo to S3: ${error}`);
  }
};

/**
 * Generate S3 key for a patient photo
 * @param participantId - Participant ID
 * @param photoId - Photo ID
 * @returns S3 key
 */
export const generatePhotoKey = (
  participantId: string,
  photoId: string
): string => {
  const timestamp = Date.now();
  return `participants/${participantId}/photos/${photoId}-${timestamp}.jpg`;
};

/**
 * Generate a pre-signed URL for secure access to an S3 object
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL
 */
export const getPresignedUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  if (!config.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const params = {
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
    Expires: expiresIn,
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('❌ Error generating pre-signed URL:', error);
    throw new Error(`Failed to generate pre-signed URL: ${error}`);
  }
};

/**
 * Extract S3 key from a full S3 URL
 * @param s3Url - Full S3 URL
 * @returns S3 key
 */
export const extractKeyFromUrl = (s3Url: string): string => {
  try {
    const url = new URL(s3Url);
    // Handle both s3.amazonaws.com and s3-region.amazonaws.com formats
    const pathParts = url.pathname.split('/');

    if (url.hostname.startsWith('s3')) {
      // Format: https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key
      if (url.hostname.includes(config.AWS_S3_BUCKET || '')) {
        return pathParts.slice(1).join('/');
      } else {
        return pathParts.slice(2).join('/');
      }
    }

    return pathParts.slice(1).join('/');
  } catch (error) {
    console.error('❌ Error extracting key from URL:', error);
    throw new Error(`Invalid S3 URL: ${s3Url}`);
  }
};
