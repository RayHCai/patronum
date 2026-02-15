// Single agent connection component
// Each instance manages one ElevenLabs conversation session
// Parent controls mic muting to coordinate multi-agent turns
import { useConversation } from '@elevenlabs/react';
import { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AgentCallHandle {
    startSession: () => Promise<string | undefined>;
    endSession: () => Promise<void>;
}

interface AgentCallProps {
    /** Agent ID for this connection */
    agentId: string;
    /** Display name */
    name: string;
    /** Emoji avatar */
    emoji: string;
    /** Color theme */
    color: string;
    /** Whether this agent's mic is active (receives user audio) */
    micActive: boolean;
    /** Optional prompt override */
    prompt?: string;
    /** Optional first message override */
    firstMessage?: string;
    /** Called when agent finishes speaking (mode changes to listening) */
    onFinishedSpeaking?: () => void;
    /** Called when agent starts speaking */
    onStartedSpeaking?: () => void;
    /** Called on connection */
    onConnect?: () => void;
    /** Called on disconnect */
    onDisconnect?: () => void;
    /** Called on error */
    onError?: (error: string) => void;
}

const AgentCall = forwardRef<AgentCallHandle, AgentCallProps>(
    (
        {
            agentId,
            name,
            emoji,
            color,
            micActive,
            prompt,
            firstMessage,
            onFinishedSpeaking,
            onStartedSpeaking,
            onConnect,
            onDisconnect,
            onError,
        },
        ref
    ) => {
        const [error, setError] = useState<string | null>(null);
        const wasSpeakingRef = useRef(false);

        // Store callbacks in refs to avoid re-creating useConversation config
        const callbacksRef = useRef({
            onFinishedSpeaking,
            onStartedSpeaking,
            onConnect,
            onDisconnect,
            onError,
        });
        callbacksRef.current = {
            onFinishedSpeaking,
            onStartedSpeaking,
            onConnect,
            onDisconnect,
            onError,
        };

        // Memoize overrides to prevent useConversation re-initialization
        const overrides = useMemo(
            () => ({
                agent: {
                    prompt: prompt ? { prompt } : undefined,
                    firstMessage: firstMessage,
                },
            }),
            [prompt, firstMessage]
        );

        const conversation = useConversation({
            micMuted: !micActive,
            onConnect: () => {
                console.log(`[Agent:${name}] ✅ Connected`);
                setError(null);
                callbacksRef.current.onConnect?.();
            },
            onDisconnect: () => {
                console.log(`[Agent:${name}] Disconnected`);
                callbacksRef.current.onDisconnect?.();
            },
            onError: (err: string) => {
                console.error(`[Agent:${name}] Error:`, err);
                setError(err);
                callbacksRef.current.onError?.(err);
            },
            onMessage: (message: { source: string; message: string }) => {
                console.log(`[Agent:${name}] ${message.source}: ${message.message}`);
            },
            onModeChange: (modeChange: { mode: 'listening' | 'speaking' }) => {
                console.log(`[Agent:${name}] Mode → ${modeChange.mode}`);
                if (modeChange.mode === 'speaking') {
                    wasSpeakingRef.current = true;
                    callbacksRef.current.onStartedSpeaking?.();
                } else if (modeChange.mode === 'listening' && wasSpeakingRef.current) {
                    wasSpeakingRef.current = false;
                    callbacksRef.current.onFinishedSpeaking?.();
                }
            },
            overrides,
        });

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            startSession: async () => {
                try {
                    console.log(`[Agent:${name}] Fetching signed URL...`);
                    const response = await fetch(
                        `${API_URL}/api/convai/signed-url?agentId=${encodeURIComponent(agentId)}`
                    );

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || `Failed to get signed URL`);
                    }

                    const data = await response.json();
                    console.log(`[Agent:${name}] Starting session...`);
                    const convId = await conversation.startSession({ signedUrl: data.signedUrl });
                    console.log(`[Agent:${name}] ✅ Session started:`, convId);
                    return convId;
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Failed to start';
                    console.error(`[Agent:${name}] Error:`, msg);
                    setError(msg);
                    throw err;
                }
            },
            endSession: async () => {
                try {
                    await conversation.endSession();
                } catch {
                    // Ignore cleanup errors
                }
            },
        }));

        const isConnected = conversation.status === 'connected';
        const isSpeaking = conversation.isSpeaking;

        return (
            <div className="flex flex-col items-center gap-4">
                {/* Agent avatar */}
                <div className="relative">
                    {/* Pulse rings when speaking */}
                    {isSpeaking && (
                        <>
                            <div
                                className="absolute -inset-6 rounded-full border opacity-20 animate-ping"
                                style={{ borderColor: color, animationDuration: '2s' }}
                            />
                            <div
                                className="absolute -inset-3 rounded-full border opacity-30 animate-pulse"
                                style={{ borderColor: color, animationDuration: '1.5s' }}
                            />
                        </>
                    )}

                    {/* Listening pulse when mic is active for this agent */}
                    {micActive && !isSpeaking && isConnected && (
                        <div
                            className="absolute -inset-3 rounded-full border opacity-20 animate-pulse"
                            style={{ borderColor: '#22c55e', animationDuration: '2s' }}
                        />
                    )}

                    {/* Main circle */}
                    <div
                        className="w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700"
                        style={{
                            background: isSpeaking
                                ? `linear-gradient(135deg, ${color}, ${color}dd)`
                                : isConnected
                                    ? 'linear-gradient(135deg, #1f2937, #111827)'
                                    : 'linear-gradient(135deg, #374151, #1f2937)',
                            boxShadow: isSpeaking ? `0 0 40px ${color}40` : '0 0 20px rgba(0,0,0,0.3)',
                            transform: isSpeaking ? 'scale(1.05)' : 'scale(1)',
                        }}
                    >
                        <span className="text-4xl select-none">{emoji}</span>
                    </div>
                </div>

                {/* Agent name */}
                <h2
                    style={{ fontFamily: 'var(--font-serif)' }}
                    className="text-lg font-semibold text-white"
                >
                    {name}
                </h2>

                {/* Status */}
                <p
                    className="text-xs transition-colors duration-500"
                    style={{
                        fontFamily: 'var(--font-sans)',
                        color: !isConnected
                            ? '#6b7280'
                            : isSpeaking
                                ? color
                                : micActive
                                    ? '#4ade80'
                                    : '#6b7280',
                    }}
                >
                    {!isConnected
                        ? 'Connecting...'
                        : isSpeaking
                            ? 'Speaking...'
                            : micActive
                                ? 'Listening'
                                : 'Waiting'}
                </p>

                {/* Error */}
                {error && (
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}
            </div>
        );
    }
);

AgentCall.displayName = 'AgentCall';

export default AgentCall;
