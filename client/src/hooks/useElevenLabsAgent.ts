// ElevenLabs Conversational AI agent hook
// Continuous mic streaming with platform-handled turn taking
// No manual turn management — the platform detects speech start/end,
// handles interruptions, and streams audio responses
import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type ConversationMode = 'listening' | 'speaking';

interface UseElevenLabsAgentOptions {
    /** Override the agent prompt dynamically */
    prompt?: string;
    /** Override the agent voice ID */
    voiceId?: string;
    /** Override the agent's first message */
    firstMessage?: string;
    /** Callback when connected */
    onConnect?: () => void;
    /** Callback when disconnected */
    onDisconnect?: () => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Callback when a message is received (user transcripts, agent responses) */
    onMessage?: (message: { source: string; message: string }) => void;
    /** Callback when mode changes between listening and speaking */
    onModeChange?: (mode: { mode: ConversationMode }) => void;
}

export const useElevenLabsAgent = (options: UseElevenLabsAgentOptions = {}) => {
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ConversationMode>('listening');

    const conversation = useConversation({
        onConnect: () => {
            console.log('[ElevenLabs Agent] ✅ Connected — continuous mic streaming active');
            setError(null);
            options.onConnect?.();
        },
        onDisconnect: () => {
            console.log('[ElevenLabs Agent] Disconnected');
            setMode('listening');
            options.onDisconnect?.();
        },
        onError: (err: string) => {
            console.error('[ElevenLabs Agent] Error:', err);
            setError(err);
            options.onError?.(err);
        },
        onMessage: (message: { source: string; message: string }) => {
            console.log(`[ElevenLabs Agent] ${message.source}: ${message.message}`);
            options.onMessage?.(message);
        },
        onModeChange: (modeChange: { mode: ConversationMode }) => {
            console.log(`[ElevenLabs Agent] Mode → ${modeChange.mode}`);
            setMode(modeChange.mode);
            options.onModeChange?.(modeChange);
        },
        // Dynamic overrides for prompt, voice, and first message
        overrides: {
            agent: {
                prompt: options.prompt ? { prompt: options.prompt } : undefined,
                firstMessage: options.firstMessage,
            },
            tts: options.voiceId ? { voiceId: options.voiceId } : undefined,
        },
    });

    /**
     * Fetch a signed URL from our server and start the conversation.
     * Uses WebSocket connection for continuous audio streaming.
     * The platform handles turn detection, barge-in, and response timing.
     */
    const startSession = useCallback(async () => {
        try {
            console.log('[ElevenLabs Agent] Requesting microphone permission...');
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[ElevenLabs Agent] ✅ Microphone access granted');

            console.log('[ElevenLabs Agent] Fetching signed URL...');
            const response = await fetch(`${API_URL}/api/convai/signed-url`);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to get signed URL: ${response.statusText}`);
            }

            const data = await response.json();
            const signedUrl = data.signedUrl;

            console.log('[ElevenLabs Agent] Starting continuous conversation session...');
            const conversationId = await conversation.startSession({
                signedUrl,
            });

            console.log('[ElevenLabs Agent] ✅ Session started:', conversationId);
            console.log('[ElevenLabs Agent] 🎤 Mic is streaming — platform manages all turn-taking');
            return conversationId;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to start session';
            console.error('[ElevenLabs Agent] Start session error:', errorMsg);
            setError(errorMsg);
            throw err;
        }
    }, [conversation]);

    /**
     * End the current conversation session
     */
    const endSession = useCallback(async () => {
        try {
            console.log('[ElevenLabs Agent] Ending session...');
            await conversation.endSession();
            setMode('listening');
            console.log('[ElevenLabs Agent] Session ended');
        } catch (err) {
            console.error('[ElevenLabs Agent] End session error:', err);
        }
    }, [conversation]);

    return {
        startSession,
        endSession,
        /** 'connected' or 'disconnected' */
        status: conversation.status,
        /** Whether the agent is currently speaking (streaming audio out) */
        isSpeaking: conversation.isSpeaking,
        /** Current conversation mode: 'listening' (user's turn) or 'speaking' (agent's turn) */
        mode,
        /** Any error message */
        error,
    };
};
