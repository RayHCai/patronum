// ElevenLabs Text-to-Speech service
import axios from 'axios';
import { config } from '../config';
import { TTSRequest, TTSResponse } from '../types';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice ID mapping (using ElevenLabs conversational voices for variety)
const VOICE_MAP: Record<string, string> = {
  mary_voice_en: 'EXAVITQu4vr4xnSDxMaL', // Bella - soft, calm female (fits gentle teacher)
  robert_voice_en: 'GxRhbOQYg8POKS1uwEy4', // Rajesh Patel - Indian male voice (fits Robert Chen)
  susan_voice_en: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - gentle, mature female (fits thoughtful librarian)
  james_voice_en: 'TxGEqnHWrfWFTfGW9XjX', // Josh - deep, laid-back male (fits relaxed musician)
  patricia_voice_en: 'MF3mGyEYCl7XYWbV9V6O', // Elli - caring, emotional female (fits empathetic nurse)
  margaret_chen_voice: 'EST9Ui6982FZPSi7gCHi', // Asian female voice (for Margaret Chen)
  moderator_voice: 'DODLEQrClDo8wCz460ld', // Maya - moderator voice
};

// Minimal valid silent MP3 (1 second of silence)
const SILENT_MP3_BASE64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T3kJJhAAAAAAD/+xDEAAADSAZQAMYeUAAANIAAAAATEFNRTMuMTAwBK8AAAAAAAAAABUgJAUHQQABzAAABITYe8nmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxBQAAADSAAAAABQAAAIkAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxKMAAADSAAAAABQAAAIkAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const synthesizeSpeech = async (
  text: string,
  voiceId: string
): Promise<TTSResponse> => {
  const apiKey = config.ELEVENLABS_API_KEY;

  if (!apiKey) {
    // Return actual silent MP3 if no API key (for development)
    console.warn('No ElevenLabs API key - returning silent audio');
    return {
      audioBuffer: Buffer.from(SILENT_MP3_BASE64, 'base64'),
      contentType: 'audio/mpeg',
    };
  }

  try {
    // Map internal voice ID to ElevenLabs voice ID
    const elevenLabsVoiceId = VOICE_MAP[voiceId] || VOICE_MAP.moderator_voice;

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${elevenLabsVoiceId}`,
      {
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 1, // Enable conversational style (0-1, higher = more conversational)
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
      }
    );

    return {
      audioBuffer: Buffer.from(response.data),
      contentType: 'audio/mpeg',
    };
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message);

    // Return actual silent MP3 as fallback
    console.warn('Falling back to silent audio due to TTS error');
    return {
      audioBuffer: Buffer.from(SILENT_MP3_BASE64, 'base64'),
      contentType: 'audio/mpeg',
    };
  }
};

export const getAvailableVoices = async () => {
  const apiKey = config.ELEVENLABS_API_KEY;

  if (!apiKey) {
    // Return mock voices if no API key
    return Object.keys(VOICE_MAP).map((id) => ({
      voice_id: id,
      name: id.replace(/_/g, ' ').toUpperCase(),
    }));
  }

  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    return response.data.voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
};

// Helper to convert text to audio and save temporarily
export const textToAudioBuffer = async (
  text: string,
  voiceId: string
): Promise<Buffer> => {
  const { audioBuffer } = await synthesizeSpeech(text, voiceId);
  return audioBuffer;
};
