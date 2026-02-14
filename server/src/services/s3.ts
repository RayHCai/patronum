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
    ACL: 'public-read', // Make audio files publicly accessible
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
