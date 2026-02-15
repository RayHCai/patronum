// NEW: Conversation flow hook for linear loop architecture with HeyGen integration
import { useCallback, useRef } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useVideoStreamManager } from './useVideoStreamManager';
import { Turn } from '../types';
import StreamingAvatar from '@heygen/streaming-avatar';
import { NUM_AI_AGENTS } from '../constants/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get authentication token
 * TODO: Implement proper authentication
 */
const getAuthToken = (): string => {
  // For now, return a placeholder token since auth is not fully implemented
  // In production, this should retrieve the token from localStorage or auth context
  return localStorage.getItem('authToken') || 'demo-token';
};

interface HeygenAvatarInstance {
  agentId: string;
  avatar: StreamingAvatar;
  sessionId: string;
  isReady: boolean;
}

export const useNewConversationFlow = () => {
  const store = useConversationStore();
  const { initializeStream } = useVideoStreamManager();

  // HeyGen avatar instances (one per agent + moderator)
  const heygenAvatars = useRef<Map<string, HeygenAvatarInstance>>(new Map());

  // Audio element for playback
  const audioElement = useRef<HTMLAudioElement | null>(null);

  /**
   * Phase 1: Initialize Session
   * - Create session
   * - Generate moderator context + initial message
   * - Generate agents in parallel
   * - Initialize HeyGen avatars
   * - Cache moderator's first message audio
   */
  const initializeSession = useCallback(async (participantId: string, participantName: string, topic?: string) => {
    console.log('[New Flow] ========================================');
    console.log('[New Flow] 🎬 INITIALIZING NEW CONVERSATION SESSION');
    console.log('[New Flow] ========================================');
    console.log('[New Flow] Participant ID:', participantId);
    console.log('[New Flow] Participant Name:', participantName);
    console.log('[New Flow] Topic:', topic || 'No topic specified');

    try {
      console.log('[New Flow] 📝 Phase 1: Session Initialization');
      store.setIsLoading(true);

      // Step 1: Initialize session (create session + moderator context)
      console.log('[New Flow] 🔨 Step 1: Creating session and generating moderator context...');
      const startTime = Date.now();
      const initResponse = await fetch(`${API_URL}/api/sessions/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId, topic }),
      });

      const elapsed1 = Date.now() - startTime;

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('[New Flow] ❌ Failed to initialize session:', errorData);
        throw new Error('Failed to initialize session');
      }

      const initData = await initResponse.json();
      const { sessionId, moderatorId, moderatorInitialMessage } = initData.data;

      console.log(`[New Flow] ✅ Session initialized in ${elapsed1}ms`);
      console.log(`[New Flow]   Session ID: ${sessionId}`);
      console.log(`[New Flow]   Moderator ID: ${moderatorId}`);
      console.log(`[New Flow]   Moderator Avatar ID: ${moderatorInitialMessage.avatarId}`);
      console.log(`[New Flow]   Moderator message (${moderatorInitialMessage.text.length} chars): "${moderatorInitialMessage.text.substring(0, 100)}..."`);

      store.setSessionId(sessionId);
      store.setModeratorId(moderatorId);
      store.setModeratorAvatarId(moderatorInitialMessage.avatarId);

      // Step 2: Generate agents in parallel
      console.log('\n\n');
      console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
      console.log('[New Flow] 🤖 Step 2: Generating AI agents...');
      console.log('[New Flow] About to call: POST /api/sessions/' + sessionId + '/generate-agents');
      console.log('[New Flow] Body:', { moderatorId, count: NUM_AI_AGENTS });
      console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
      console.log('\n\n');

      const startTime2 = Date.now();
      const agentsResponse = await fetch(`${API_URL}/api/sessions/${sessionId}/generate-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ moderatorId, count: NUM_AI_AGENTS }),
      });

      const elapsed2 = Date.now() - startTime2;

      if (!agentsResponse.ok) {
        const errorData = await agentsResponse.json();
        console.error('[New Flow] ❌ Failed to generate agents:', errorData);
        throw new Error('Failed to generate agents');
      }

      const agentsData = await agentsResponse.json();
      const agents = agentsData.data.agents;

      console.log(`[New Flow] ✅ Generated ${agents.length} agents in ${elapsed2}ms:`);
      agents.forEach((agent: any, idx: number) => {
        console.log(`[New Flow]   Agent ${idx + 1}: ${agent.name} (ID: ${agent.id}, Voice: ${agent.voiceId})`);
      });

      store.setAgents(agents);

      // Step 3: Initialize speakers array
      console.log('[New Flow] 👥 Step 3: Initializing speaker order...');
      store.initializeSpeakers(
        agents,
        participantId,
        participantName,
        moderatorId  // Pass moderator ID as 4th parameter
      );
      const speakers = store.speakers;
      console.log('[New Flow] ✅ Speaker order:', speakers.map(s => `${s.name}(${s.type})`).join(' → '));

      // Step 4: Initialize HeyGen avatars for moderator + all agents
      console.log('[New Flow] 🎬 Step 4: Initializing HeyGen video avatars...');
      const startTime4 = Date.now();
      await initializeAllHeygenAvatars(moderatorInitialMessage.avatarId, agents);
      const elapsed4 = Date.now() - startTime4;
      console.log(`[New Flow] ✅ HeyGen avatars initialized in ${elapsed4}ms`);

      // Step 5: Generate audio for moderator's initial message
      // Since we're using HeyGen for audio, we'll trigger the avatar to speak
      console.log('[New Flow] 🔊 Step 5: Preparing moderator opening audio via HeyGen...');

      // Hide loading screen
      store.setIsLoading(false);
      console.log('[New Flow] ✅ Loading screen hidden');

      const totalElapsed = Date.now() - startTime;
      console.log('[New Flow] ========================================');
      console.log(`[New Flow] ✅ Session initialization complete in ${totalElapsed}ms!`);
      console.log('[New Flow] ========================================');

      // Step 6: Begin conversation with moderator's opening
      console.log('[New Flow] 🎤 Step 6: Playing moderator opening message...');
      await speakWithHeygenAvatar(moderatorId, moderatorInitialMessage.text);

      // Save moderator's opening turn to database
      await saveTurn({
        sessionId,
        speakerType: 'moderator',
        speakerId: moderatorId,
        speakerName: 'Marcus',
        content: moderatorInitialMessage.text,
        sequenceNumber: 0,
        timestamp: new Date().toISOString(),
      });

      console.log('[New Flow] 💾 Saving moderator opening turn to database...');
      await saveTurn({
        sessionId,
        speakerType: 'moderator',
        speakerId: moderatorId,
        speakerName: 'Marcus',
        content: moderatorInitialMessage.text,
        sequenceNumber: 0,
        timestamp: new Date().toISOString(),
      });
      console.log('[New Flow] ✅ Moderator opening turn saved');

      // When moderator finishes speaking, advance to user
      console.log('[New Flow] ➡️ Advancing to next speaker (user)...');
      store.advanceToNextSpeaker();
      store.setMicState('your-turn');
      console.log('[New Flow] 🎤 User\'s turn to speak');

    } catch (error) {
      console.error('[New Flow] ========================================');
      console.error('[New Flow] ❌ INITIALIZATION FAILED');
      console.error('[New Flow] ========================================');
      console.error('[New Flow] Error:', error);
      console.error('[New Flow] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      store.setIsLoading(false);
      throw error;
    }
  }, [store]);

  /**
   * Initialize all HeyGen avatars (moderator + agents)
   */
  const initializeAllHeygenAvatars = async (moderatorAvatarId: string, agents: any[]) => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    try {
      // Initialize moderator video stream (mark as active in store)
      console.log('[New Flow] Initializing moderator video stream...');
      await initializeStream('moderator');

      // Initialize moderator avatar
      console.log('[New Flow] Initializing moderator HeyGen avatar...');
      await initializeHeygenAvatar('moderator', moderatorAvatarId, token);

      // Initialize agent video streams and avatars in parallel
      console.log('[New Flow] Initializing agent video streams and HeyGen avatars...');
      await Promise.all(
        agents.map(async (agent) => {
          await initializeStream(agent.id);
          await initializeHeygenAvatar(agent.id, agent.heygenAvatarId, token);
        })
      );

      console.log('[New Flow] All HeyGen avatars initialized');
    } catch (error) {
      console.error('[New Flow] Failed to initialize HeyGen avatars:', error);
      // Don't throw - allow conversation to continue without video
    }
  };

  /**
   * Initialize a single HeyGen avatar
   */
  const initializeHeygenAvatar = async (agentId: string, heygenAvatarId: string, token: string) => {
    try {
      // Get session token from backend
      const response = await fetch(`${API_URL}/api/heygen/avatar/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarId: heygenAvatarId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create HeyGen session for ${agentId}`);
      }

      const data = await response.json();
      const { token: heygenToken } = data.data;

      // Create StreamingAvatar instance
      const avatar = new StreamingAvatar({ token: heygenToken });

      // Set up event listeners
      avatar.on('stream_ready', (event: any) => {
        console.log(`[HeyGen] Stream ready for ${agentId}`);
        // Attach stream to video element (will be done in VideoAvatarGrid component)
      });

      avatar.on('avatar_start_talking', () => {
        console.log(`[HeyGen] ${agentId} started talking`);
        store.setIsPlaying(true);
      });

      avatar.on('avatar_stop_talking', () => {
        console.log(`[HeyGen] ${agentId} stopped talking`);
        store.setIsPlaying(false);
      });

      // Start avatar session
      await avatar.createStartAvatar({
        avatarName: heygenAvatarId,
        quality: 'medium',
        voice: { rate: 1.0 },
      });

      // Store instance
      heygenAvatars.current.set(agentId, {
        agentId,
        avatar,
        sessionId: heygenToken,
        isReady: true,
      });

      console.log(`[HeyGen] Avatar initialized for ${agentId}`);
    } catch (error) {
      console.error(`[HeyGen] Failed to initialize avatar for ${agentId}:`, error);
    }
  };

  /**
   * Speak with HeyGen avatar using 11Labs audio + HeyGen lip-sync (HYBRID APPROACH)
   * 1. Generate high-quality audio with ElevenLabs
   * 2. Get public URL for the audio
   * 3. Pass text + audioUrl to HeyGen for lip-sync animation
   */
  const speakWithHeygenAvatar = async (speakerId: string, text: string) => {
    const avatarInstance = heygenAvatars.current.get(speakerId);

    if (!avatarInstance || !avatarInstance.isReady) {
      console.warn(`[HeyGen] Avatar not ready for ${speakerId}, skipping video`);
      return;
    }

    try {
      console.log(`[HeyGen Hybrid] 🎙️ Step 1: Generating 11Labs audio for ${speakerId}`);

      // Get voiceId for this speaker
      const state = useConversationStore.getState();
      const speaker = state.speakers.find(s => s.id === speakerId);
      const voiceId = speaker?.voiceId || 'moderator_voice'; // Default to moderator voice

      console.log(`[HeyGen Hybrid] Using voiceId: ${voiceId}`);

      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Generate audio with ElevenLabs and get public URL
      const audioStartTime = Date.now();
      const audioResponse = await fetch(`${API_URL}/api/audio/generate-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          voiceId,
        }),
      });

      if (!audioResponse.ok) {
        console.warn(`[HeyGen Hybrid] Failed to generate 11Labs audio, falling back to HeyGen TTS`);
        // Fallback: Use HeyGen's built-in TTS
        await avatarInstance.avatar.speak({ text });
        return;
      }

      const audioData = await audioResponse.json();
      const audioUrl = audioData.data.audioUrl;
      const audioElapsed = Date.now() - audioStartTime;

      console.log(`[HeyGen Hybrid] ✅ 11Labs audio generated in ${audioElapsed}ms`);
      console.log(`[HeyGen Hybrid] Audio URL: ${audioUrl}`);

      // Step 2: Trigger HeyGen avatar with 11Labs audio for lip-sync
      console.log(`[HeyGen Hybrid] 🎬 Step 2: Syncing HeyGen avatar with 11Labs audio`);
      const syncStartTime = Date.now();

      await avatarInstance.avatar.speak({
        text,
        audioInput: audioUrl, // Use 11Labs audio for lip-sync
      });

      const syncElapsed = Date.now() - syncStartTime;
      console.log(`[HeyGen Hybrid] ✅ Avatar lip-sync completed in ${syncElapsed}ms`);
      console.log(`[HeyGen Hybrid] 🎉 Hybrid playback complete (11Labs voice + HeyGen video)`);

    } catch (error) {
      console.error(`[HeyGen Hybrid] ❌ Failed to speak with avatar ${speakerId}:`, error);
      // Last resort fallback: use HeyGen TTS only
      try {
        console.log(`[HeyGen Hybrid] Attempting fallback to HeyGen TTS only...`);
        await avatarInstance.avatar.speak({ text });
      } catch (fallbackError) {
        console.error(`[HeyGen Hybrid] Fallback also failed:`, fallbackError);
      }
    }
  };

  /**
   * Save turn to database
   */
  const saveTurn = async (turn: Omit<Turn, 'id'>): Promise<{ id: number; nextSpeakerId?: string }> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/api/conversation/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(turn),
    });

    if (!response.ok) {
      throw new Error('Failed to save turn');
    }

    const data = await response.json();
    return {
      id: data.data.id,
      nextSpeakerId: data.data.nextSpeakerId,
    };
  };

  /**
   * Generate text for moderator or agent
   */
  const generateText = async (
    speakerId: string,
    speakerType: 'moderator' | 'agent',
    photoData?: { photoUrl: string; caption: string; tags: string[]; id: string } | null
  ): Promise<string> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const endpoint = speakerType === 'moderator'
      ? `${API_URL}/api/ai-moderator/generate-response`
      : `${API_URL}/api/ai-patients/generate-response`;

    const requestBody: any = {
      sessionId: store.sessionId,
      ...(speakerType === 'agent' ? { agentId: speakerId } : {}),
      conversationHistory: store.turns.slice(-8),
      loopCount: store.loopCount,
    };

    // Add photo context for moderator turns if available
    if (speakerType === 'moderator' && photoData) {
      requestBody.currentPhoto = photoData;
      requestBody.isPhotoTurn = true;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to generate text');
    }

    const data = await response.json();
    return data.data.content || data.data.text;
  };

  /**
   * Execute a moderator or agent turn
   */
  const executeAITurn = useCallback(async () => {
    console.log('[New Flow] ========================================');
    console.log('[New Flow] 🎯 EXECUTING AI TURN');
    console.log('[New Flow] ========================================');

    const state = useConversationStore.getState();
    const currentSpeaker = state.speakers[state.currentIndex];

    console.log('[New Flow] Current speaker index:', state.currentIndex);
    console.log('[New Flow] Loop count:', state.loopCount, '/', state.maxLoops);

    if (!currentSpeaker || currentSpeaker.type === 'user') {
      console.error('[New Flow] ❌ Cannot execute AI turn - speaker is user or undefined');
      return;
    }

    console.log(`[New Flow] 🎤 Speaker: ${currentSpeaker.name} (${currentSpeaker.type})`);

    // Clear any previous photo at the start of a new turn
    store.clearCurrentPhoto();

    try {
      // 1. Check for photo turn (if moderator)
      let photoData: { photoUrl: string; caption: string; tags: string[]; id: string } | null = null;
      if (currentSpeaker.type === 'moderator') {
        console.log(`[New Flow] 🖼️ Step 1a: Checking for photo turn...`);
        try {
          const token = getAuthToken();
          const photoResponse = await fetch(`${API_URL}/api/sessions/${state.sessionId}/select-photo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (photoResponse.ok) {
            const photoResult = await photoResponse.json();
            if (photoResult.data.shouldShowPhoto && photoResult.data.photo) {
              photoData = photoResult.data.photo;
              console.log(`[New Flow] ✅ Photo selected: ${photoData.id}`);
              console.log(`[New Flow] Photo caption: "${photoData.caption?.substring(0, 60)}..."`);
              // Set photo in store to display it
              store.setCurrentPhoto(photoData.photoUrl, photoData.caption, photoData.id);
            } else {
              console.log(`[New Flow] ℹ️ No photo for this turn`);
            }
          }
        } catch (photoError) {
          console.warn(`[New Flow] ⚠️ Photo selection failed (non-critical):`, photoError);
          // Continue without photo - don't break the conversation
        }
      }

      // 2. Check if pre-generated turn exists
      console.log(`[New Flow] 📝 Step 2: Getting text for ${currentSpeaker.name}`);
      let text: string;
      if (state.preGeneratedTurn && state.preGeneratedTurn.speakerId === currentSpeaker.id) {
        console.log(`[New Flow] ✨ Using pre-generated turn for ${currentSpeaker.name}`);
        console.log(`[New Flow] Pre-generated text:`, state.preGeneratedTurn.text.substring(0, 100) + '...');
        text = state.preGeneratedTurn.text;
        store.clearPreGeneratedTurn();
      } else {
        // Generate text with optional photo context
        console.log(`[New Flow] 🔍 No pre-generated turn, generating text from AI...`);
        const startTime = Date.now();
        text = await generateText(currentSpeaker.id, currentSpeaker.type as 'moderator' | 'agent', photoData);
        const elapsed = Date.now() - startTime;
        console.log(`[New Flow] ✅ Text generated in ${elapsed}ms:`, text.substring(0, 100) + '...');
      }

      // 3. Speak with HeyGen avatar (audio + video)
      console.log(`[New Flow] 🔊 Step 3: Playing audio with HeyGen avatar...`);
      store.setIsPlaying(true);
      const startTime2 = Date.now();
      await speakWithHeygenAvatar(currentSpeaker.id, text);
      const elapsed2 = Date.now() - startTime2;
      console.log(`[New Flow] ✅ Avatar speaking completed in ${elapsed2}ms`);

      // 4. Save turn to database (include photo data if present)
      console.log(`[New Flow] 💾 Step 4: Saving turn to database...`);
      const turnData: any = {
        sessionId: state.sessionId!,
        speakerType: currentSpeaker.type,
        speakerId: currentSpeaker.id,
        speakerName: currentSpeaker.name,
        content: text,
        sequenceNumber: state.turns.length,
        timestamp: new Date().toISOString(),
      };

      // Add photo data if this was a photo turn
      if (photoData) {
        turnData.photoUrl = photoData.photoUrl;
        turnData.photoId = photoData.id;
        turnData.isPhotoTurn = true;
        console.log(`[New Flow] 📸 Including photo in turn: ${photoData.id}`);
      }

      const turnResult = await saveTurn(turnData);
      console.log(`[New Flow] ✅ Turn saved with ID: ${turnResult.id}`);

      // Add to local store
      store.addTurn({
        id: turnResult.id,
        sessionId: state.sessionId!,
        speakerType: currentSpeaker.type,
        speakerId: currentSpeaker.id,
        speakerName: currentSpeaker.name,
        content: text,
        sequenceNumber: state.turns.length,
        timestamp: new Date().toISOString(),
        ...(photoData && {
          photoUrl: photoData.photoUrl,
          photoId: photoData.id,
          isPhotoTurn: true,
        }),
      });
      console.log(`[New Flow] ✅ Turn added to local store, total turns: ${state.turns.length + 1}`);

      // Clear photo display after a delay (keep it visible during the turn)
      if (photoData) {
        // Photo will be cleared when the next speaker starts or turn advances
        console.log(`[New Flow] 📸 Photo will be cleared when turn advances`);
      }

      // 5. Pre-generate next turn while audio plays
      console.log(`[New Flow] 🚀 Step 5: Pre-generating next turn in background...`);
      preGenerateNextTurn();

      // 6. When avatar finishes, advance to next speaker
      // Note: We'll use HeyGen's avatar_stop_talking event to trigger this
      console.log(`[New Flow] ℹ️ Will advance to next speaker when avatar stops talking`);
      console.log('[New Flow] ========================================');

    } catch (error) {
      console.error('[New Flow] ========================================');
      console.error('[New Flow] ❌ ERROR EXECUTING AI TURN');
      console.error('[New Flow] ========================================');
      console.error('[New Flow] Error:', error);
      console.error('[New Flow] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      store.setIsPlaying(false);
    }
  }, [store]);

  /**
   * Pre-generate next turn (text + HeyGen video initialization)
   */
  const preGenerateNextTurn = useCallback(async () => {
    const state = useConversationStore.getState();
    const nextIndex = (state.currentIndex + 1) % state.speakers.length;
    const nextSpeaker = state.speakers[nextIndex];

    if (!nextSpeaker || nextSpeaker.type === 'user') {
      console.log('[New Flow] Next speaker is user, skipping pre-generation');
      return;
    }

    try {
      console.log(`[New Flow] Pre-generating turn for ${nextSpeaker.name}`);

      // Generate text in background
      const text = await generateText(nextSpeaker.id, nextSpeaker.type as 'moderator' | 'agent');

      // Store pre-generated turn
      store.setPreGeneratedTurn({
        speakerId: nextSpeaker.id,
        text,
        audioUrl: null, // HeyGen generates audio on-demand
      });

      console.log(`[New Flow] Pre-generated turn for ${nextSpeaker.name}`);
    } catch (error) {
      console.warn('[New Flow] Pre-generation failed:', error);
    }
  }, [store]);

  /**
   * Handle user turn
   */
  const handleUserTurn = useCallback(async (transcript: string) => {
    const state = useConversationStore.getState();

    try {
      console.log(`[New Flow] Handling user turn: "${transcript.substring(0, 50)}..."`);

      // Save user turn
      const turnResult = await saveTurn({
        sessionId: state.sessionId!,
        speakerType: 'participant',
        speakerName: state.speakers[state.currentIndex].name,
        content: transcript,
        sequenceNumber: state.turns.length,
        timestamp: new Date().toISOString(),
      });

      // Add to local store
      store.addTurn({
        id: turnResult.id,
        sessionId: state.sessionId!,
        speakerType: 'participant',
        speakerName: state.speakers[state.currentIndex].name,
        content: transcript,
        sequenceNumber: state.turns.length,
        timestamp: new Date().toISOString(),
      });

      // Advance to next speaker (check if server suggested a specific agent)
      store.advanceToNextSpeaker(turnResult.nextSpeakerId);

      // Execute next AI turn
      await executeAITurn();
    } catch (error) {
      console.error('[New Flow] Error handling user turn:', error);
    }
  }, [store, executeAITurn]);

  /**
   * Skip current speaker
   */
  const skipCurrentSpeaker = useCallback(() => {
    const state = useConversationStore.getState();
    const currentSpeaker = state.speakers[state.currentIndex];

    if (currentSpeaker.type === 'user') {
      console.warn('[New Flow] Cannot skip user turn');
      return;
    }

    console.log(`[New Flow] Skipping ${currentSpeaker.name}`);

    // Stop HeyGen avatar
    const avatarInstance = heygenAvatars.current.get(currentSpeaker.id);
    if (avatarInstance) {
      avatarInstance.avatar.interrupt().catch(console.error);
    }

    // Advance to next speaker
    store.setIsPlaying(false);
    store.advanceToNextSpeaker();

    // Execute next turn
    executeAITurn();
  }, [store, executeAITurn]);

  /**
   * Cleanup HeyGen avatars
   */
  const cleanup = useCallback(() => {
    console.log('[New Flow] Cleaning up HeyGen avatars...');

    heygenAvatars.current.forEach((instance) => {
      instance.avatar.stopAvatar().catch(console.error);
    });

    heygenAvatars.current.clear();
  }, []);

  return {
    initializeSession,
    executeAITurn,
    handleUserTurn,
    skipCurrentSpeaker,
    cleanup,
  };
};
