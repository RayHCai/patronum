// Audio playback hook with queue management
import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioQueueItem {
  id: string;
  audioData: string; // base64 or blob URL
  onComplete?: () => void;
}

export const useAudioPlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const queueRef = useRef<AudioQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play next audio in queue
  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      setCurrentAudioId(null);
      return;
    }

    const item = queueRef.current[0];
    setCurrentAudioId(item.id);
    setIsPlaying(true);

    // Detect if audio data is blob URL or base64
    const isBlobUrl = item.audioData.startsWith('blob:');
    let audioUrl: string;
    let shouldRevokeUrl = false;

    if (isBlobUrl) {
      // Already a blob URL, use directly
      audioUrl = item.audioData;
      shouldRevokeUrl = false; // Don't revoke - managed by audio cache
    } else {
      // Convert base64 to audio blob
      const audioBlob = base64ToBlob(item.audioData, 'audio/mpeg');
      audioUrl = URL.createObjectURL(audioBlob);
      shouldRevokeUrl = true; // Revoke after playback
    }

    // Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      if (shouldRevokeUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      queueRef.current.shift(); // Remove completed item

      if (item.onComplete) {
        item.onComplete();
      }

      // Play next
      playNext();
    };

    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      queueRef.current.shift();
      playNext();
    };

    audio.play().catch((error) => {
      console.error('Failed to play audio:', error);
      queueRef.current.shift();
      playNext();
    });
  }, []);

  // Enqueue audio
  const enqueue = useCallback((audioData: string, id: string, onComplete?: () => void) => {
    queueRef.current.push({ id, audioData, onComplete });

    if (!isPlaying) {
      playNext();
    }
  }, [isPlaying, playNext]);

  // Clear queue and stop playback
  const clear = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentAudioId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    isPlaying,
    currentAudioId,
    enqueue,
    clear,
  };
};

// Helper to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}
