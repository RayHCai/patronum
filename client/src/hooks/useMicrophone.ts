// Microphone hook with voice activity detection
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMicrophoneOptions {
  onTranscript?: (transcript: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export const useMicrophone = (options: UseMicrophoneOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const callbacksRef = useRef(options);
  const lastTranscriptRef = useRef<string>(''); // Track last transcript (interim or final)

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  // Initialize speech recognition ONCE
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true; // Keep recording continuously (less sensitive to silence)
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
        if (callbacksRef.current.onSpeechStart) {
          callbacksRef.current.onSpeechStart();
        }
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        lastTranscriptRef.current = currentTranscript; // Always save the latest transcript

        if (finalTranscript) {
          console.log('[useMicrophone] 📝 Final transcript chunk:', finalTranscript.substring(0, 100));
          if (callbacksRef.current.onTranscript) {
            callbacksRef.current.onTranscript(finalTranscript);
          }
        }
      };

      recognition.onend = () => {
        console.log('[useMicrophone] Speech recognition ended');

        // If we have a transcript that wasn't finalized, send it now
        if (lastTranscriptRef.current && callbacksRef.current.onTranscript) {
          console.log('[useMicrophone] 📤 Sending last captured transcript on end:', lastTranscriptRef.current.substring(0, 100));
          callbacksRef.current.onTranscript(lastTranscriptRef.current);
        }

        setIsListening(false);
        lastTranscriptRef.current = ''; // Clear for next time

        if (callbacksRef.current.onSpeechEnd) {
          callbacksRef.current.onSpeechEnd();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort(); // Use abort instead of stop for immediate termination
        } catch (err) {
          console.error('Error aborting recognition:', err);
        }
      }
    };
  }, []); // Empty dependency array - only initialize once

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      lastTranscriptRef.current = ''; // Clear previous transcript
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.error('Failed to start recognition:', err);
        setError(err.message);
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop(); // Use stop() to allow final transcript processing
        console.log('[useMicrophone] Stopped speech recognition (will process final results)');
      } catch (err) {
        console.error('[useMicrophone] Error stopping recognition:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
  };
};
