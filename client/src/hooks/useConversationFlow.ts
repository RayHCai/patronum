// Conversation flow orchestration hook - main client-side turn management
import { useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useSpeakerDetermination } from './useSpeakerDetermination';
import { useTextGeneration } from './useTextGeneration';
import { useAudioFetcher } from './useAudioFetcher';
import { useVideoStreamManager } from './useVideoStreamManager';
import { avatarManager } from '../services/avatarManager';
import { Turn } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Main conversation flow orchestration hook
 * Manages the entire client-side turn management system
 */
export const useConversationFlow = () => {
  const store = useConversationStore();
  const { determineNextSpeaker, getSpeakerByIndex } = useSpeakerDetermination();
  const {
    requestText,
    preComputeText,
    getCachedText,
    clearCache: clearTextCache,
  } = useTextGeneration();
  const {
    fetchAudio,
    prefetchAudio,
    getCachedAudio,
    clearCache: clearAudioCache,
  } = useAudioFetcher();
  const {
    initializeStream,
    preInitializeStream,
    touchStream,
  } = useVideoStreamManager();

  /**
   * Save turn to server database
   */
  const saveTurnToServer = async (turn: Omit<Turn, 'id'>): Promise<number> => {
    console.log('[Conversation Flow] 💾 Saving turn to server:', {
      sessionId: turn.sessionId,
      speaker: turn.speakerName,
      type: turn.speakerType,
      contentPreview: turn.content.substring(0, 100) + (turn.content.length > 100 ? '...' : ''),
      sequenceNumber: turn.sequenceNumber
    });

    try {
      const response = await fetch(`${API_URL}/api/conversation/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: turn.sessionId,
          speakerType: turn.speakerType,
          speakerId: turn.speakerId,
          speakerName: turn.speakerName,
          content: turn.content,
          sequenceNumber: turn.sequenceNumber,
          timestamp: turn.timestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Conversation Flow] ❌ Server rejected turn:', errorData);
        throw new Error(errorData.error || 'Failed to save turn');
      }

      const data = await response.json();
      console.log('[Conversation Flow] ✅ Turn saved successfully with ID:', data.data.id);
      return data.data.id;
    } catch (error) {
      console.error('[Conversation Flow] ❌ Failed to save turn to server:', error);
      throw error;
    }
  };

  /**
   * Execute an agent or moderator turn
   */
  const executeAgentTurn = useCallback(
    async (enqueueAudio: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void) => {
      console.log('[Conversation Flow] ========================================');
      console.log('[Conversation Flow] 🎯 EXECUTING AGENT TURN');
      console.log('[Conversation Flow] ========================================');

      try {
        // Get fresh state from store to avoid stale closure issues
        const freshState = useConversationStore.getState();
        const nextIndex = freshState.nextSpeakerIndex;
        console.log('[Conversation Flow] Current state:', {
          nextSpeakerIndex: nextIndex,
          totalSpeakers: freshState.speakerIndices.length,
          turnCount: freshState.turns.length
        });

        // Get speaker indices from fresh state
        const speakerIndices = freshState.speakerIndices;
        const speaker = speakerIndices.find(s => s.index === nextIndex);

        if (!speaker) {
          console.error('[Conversation Flow] ❌ No speaker found at index', nextIndex);
          console.error('[Conversation Flow] Available speakers:', speakerIndices.map(s => `${s.index}:${s.name}`).join(', '));
          return;
        }

        if (!speaker.voiceId) {
          console.error('[Conversation Flow] ❌ Speaker has no voice ID', speaker);
          return;
        }

        console.log(`[Conversation Flow] ▶️ Executing turn for ${speaker.name} (index ${nextIndex}, type: ${speaker.type})`);

        // 1. Get text (from cache or fetch)
        console.log(`[Conversation Flow] 📝 Step 1: Getting text for ${speaker.name}`);
        let text = getCachedText(nextIndex);
        if (!text) {
          console.log(`[Conversation Flow] 🔍 Cache miss, requesting text from server for ${speaker.name}`);
          const startTime = Date.now();
          text = await requestText(nextIndex);
          const elapsed = Date.now() - startTime;
          console.log(`[Conversation Flow] ✅ Text generated in ${elapsed}ms:`, text.substring(0, 100) + '...');
        } else {
          console.log(`[Conversation Flow] ✨ Cache hit! Using cached text for ${speaker.name}`);
          console.log(`[Conversation Flow] Cached text preview:`, text.substring(0, 100) + '...');
        }

        // 2. Determine next speaker based on content
        console.log(`[Conversation Flow] 🧭 Step 2: Determining next speaker based on content`);
        // Special case: After moderator's opening (very first turn), always go to user
        let nextNextIndex: number;
        if (nextIndex === 0 && store.turns.length === 0) {
          // This is the moderator's opening - always go to user next
          nextNextIndex = 1;
          console.log(`[Conversation Flow] 🎤 Moderator's opening complete → routing to user (index 1)`);
        } else {
          // Normal turn - use speaker determination logic
          console.log(`[Conversation Flow] 🎲 Running speaker determination logic...`);
          nextNextIndex = determineNextSpeaker(nextIndex, text);
        }
        store.setNextSpeakerIndex(nextNextIndex);
        const nextSpeaker = speakerIndices.find(s => s.index === nextNextIndex);
        console.log(`[Conversation Flow] ➡️ Next speaker will be: ${nextSpeaker?.name || 'Unknown'} (index ${nextNextIndex})`);

        // 3. Fetch audio (from cache or fetch)
        console.log(`[Conversation Flow] 🔊 Step 3: Getting audio for ${speaker.name}`);
        let audioUrl = getCachedAudio(text, speaker.voiceId);
        if (!audioUrl) {
          console.log(`[Conversation Flow] 🔍 Audio cache miss, fetching from TTS service for ${speaker.name}`);
          const startTime = Date.now();
          audioUrl = await fetchAudio(text, speaker.voiceId);
          const elapsed = Date.now() - startTime;
          console.log(`[Conversation Flow] ✅ Audio generated in ${elapsed}ms:`, audioUrl.substring(0, 50) + '...');
        } else {
          console.log(`[Conversation Flow] ✨ Audio cache hit for ${speaker.name}!`);
        }

        // 4. Create and save turn
        console.log(`[Conversation Flow] 💾 Step 4: Creating and saving turn`);
        const turn: Omit<Turn, 'id'> = {
          sessionId: freshState.sessionId!,
          speakerType: speaker.type === 'moderator' ? 'moderator' : 'agent',
          speakerId: speaker.speakerId || speaker.agentId,  // Use speakerId (includes moderator/user/agent IDs)
          speakerName: speaker.name,
          content: text,
          timestamp: new Date().toISOString(),
          sequenceNumber: freshState.turns.length,
        };

        // Save to server immediately
        const turnId = await saveTurnToServer(turn);
        console.log(`[Conversation Flow] ✅ Turn saved to server with ID ${turnId}`);

        // Add to local store
        store.addTurn({ ...turn, id: turnId });
        console.log(`[Conversation Flow] ✅ Turn added to local store, total turns: ${freshState.turns.length + 1}`);

        // Track turn for frequency analysis
        store.trackTurn(speaker.type === 'moderator' ? 'moderator' : 'agent');

        // Update phase
        const currentTurnCount = useConversationStore.getState().turns.length;
        console.log(`[Conversation Flow] 📊 Updating phase based on turn count: ${currentTurnCount}`);
        store.updatePhase(currentTurnCount + 1);

        // Touch video stream to keep it alive (if agent with video)
        if (speaker.agentId && speaker.type === 'agent') {
          console.log(`[Conversation Flow] 🎥 Touching video stream for ${speaker.name}`);
          touchStream(speaker.agentId);

          // Trigger HeyGen avatar to speak with lip-sync to audio
          console.log(`[Conversation Flow] 🎬 Triggering HeyGen avatar speech for ${speaker.name}`);
          avatarManager.speak(speaker.agentId, text, audioUrl).catch((err) => {
            console.error(`[Conversation Flow] ❌ Failed to trigger avatar speech:`, err);
          });
        }

        // 5. Play audio
        console.log(`[Conversation Flow] 🔊 Step 5: Enqueueing audio for playback`);
        console.log(`[Conversation Flow] Audio URL:`, audioUrl.substring(0, 50) + '...');
        enqueueAudio(audioUrl, turnId.toString(), () => {
          console.log(`[Conversation Flow] ✅ Audio playback completed for ${speaker.name}`);

          // Check if this is the moderator's closing remarks
          const currentState = useConversationStore.getState();
          const isModeratorClosing = currentState.currentPhase === 'closing' && speaker.type === 'moderator';

          if (isModeratorClosing) {
            // Trigger game choice screen instead of moving to next speaker
            console.log('[Conversation Flow] 🎮 Moderator closing complete - showing game choice screen');
            store.setShowGameChoice(true);
          } else {
            // Normal flow - move to next speaker
            console.log('[Conversation Flow] ➡️ Moving to next speaker after audio completion');
            moveToNextSpeaker(enqueueAudio);
          }
        }, {
          speakerName: speaker.name,
          speakerType: speaker.type === 'moderator' ? 'moderator' : 'agent',
          content: text,
          speakerId: speaker.speakerId || speaker.agentId,
          avatarColor: speaker.avatarColor,
        });

        // 6. Pre-compute next turn WHILE audio is playing (not after)
        console.log(`[Conversation Flow] 🚀 Step 6: Starting background pre-computation while audio plays`);
        preComputeNextTurn();
        console.log('[Conversation Flow] ========================================');
        console.log('[Conversation Flow] Turn execution initiated successfully');
        console.log('[Conversation Flow] ========================================');
      } catch (error) {
        console.error('[Conversation Flow] Error executing agent turn:', error);
        // TODO: Show error to user
      }
    },
    [
      store,
      getSpeakerByIndex,
      determineNextSpeaker,
      getCachedText,
      requestText,
      getCachedAudio,
      fetchAudio,
      touchStream,
    ]
  );

  /**
   * Pre-compute next turn (text and audio) while current audio plays
   */
  const preComputeNextTurn = useCallback(() => {
    // Get fresh state to avoid stale closure issues
    const freshState = useConversationStore.getState();
    const nextIndex = freshState.nextSpeakerIndex;
    const speaker = getSpeakerByIndex(nextIndex);

    if (!speaker || speaker.type === 'user') {
      console.log('[Conversation Flow] Next speaker is user, skipping pre-computation');
      return;
    }

    console.log(`[Conversation Flow] Pre-computing next turn for ${speaker.name} (index ${nextIndex})`);

    // Pre-compute text in background
    preComputeText(nextIndex);

    // Pre-fetch audio will happen after text is cached
    setTimeout(() => {
      const text = getCachedText(nextIndex);
      if (text && speaker.voiceId) {
        console.log(`[Conversation Flow] Pre-fetching audio for ${speaker.name}`);
        prefetchAudio(text, speaker.voiceId);
      }
    }, 1000); // Wait 1 second for text to be cached

    // Pre-initialize video stream for next speaker (if agent and has HeyGen config)
    if (speaker.agentId && speaker.type === 'agent') {
      console.log(`[Conversation Flow] Pre-initializing video stream for ${speaker.name}`);
      preInitializeStream(speaker.agentId);
    }
  }, [getSpeakerByIndex, preComputeText, getCachedText, prefetchAudio, preInitializeStream]);

  /**
   * Start pre-computing the next agent's response while user is speaking
   * This is called when user starts speaking (not after they finish)
   */
  const startPreComputingDuringUserSpeech = useCallback(() => {
    // After user speaks, we always go to agent at index 2 (first agent)
    const nextAgentIndex = 2;
    const speaker = getSpeakerByIndex(nextAgentIndex);

    if (!speaker || speaker.type === 'user') {
      console.log('[Conversation Flow] Cannot pre-compute during user speech - invalid next speaker');
      return;
    }

    console.log(`[Conversation Flow] Pre-computing ${speaker.name}'s response WHILE user is speaking`);

    // Pre-compute text in background (using current conversation state, NOT what user is saying now)
    preComputeText(nextAgentIndex);

    // Pre-fetch audio after text is generated
    setTimeout(() => {
      const text = getCachedText(nextAgentIndex);
      if (text && speaker.voiceId) {
        console.log(`[Conversation Flow] Pre-fetching audio for ${speaker.name} while user speaks`);
        prefetchAudio(text, speaker.voiceId);
      }
    }, 2000); // Wait 2 seconds for text generation to complete
  }, [getSpeakerByIndex, preComputeText, getCachedText, prefetchAudio]);

  /**
   * Move to next speaker
   */
  const moveToNextSpeaker = useCallback(
    (enqueueAudio: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void) => {
      // Get fresh state to avoid stale closure issues
      const freshState = useConversationStore.getState();
      const nextIndex = freshState.nextSpeakerIndex;
      const speaker = getSpeakerByIndex(nextIndex);

      if (!speaker) {
        console.error('[Conversation Flow] No speaker found at next index', nextIndex);
        return;
      }

      console.log(`[Conversation Flow] Moving to speaker ${speaker.name} (index ${nextIndex}, type: ${speaker.type})`);

      // Update current speaker index
      store.setCurrentSpeakerIndex(nextIndex);

      // Note: We removed the early return for closing phase
      // The moderator will still deliver closing remarks, but we'll trigger
      // the game choice screen after the audio completes

      if (speaker.type === 'user') {
        // User's turn - set mic state
        console.log('[Conversation Flow] User\'s turn - enabling microphone');
        store.setMicState('your-turn');
      } else {
        // Agent or moderator turn - execute
        executeAgentTurn(enqueueAudio);
      }
    },
    [store, getSpeakerByIndex, executeAgentTurn]
  );

  /**
   * Handle user turn (when user finishes speaking)
   */
  const handleUserTurn = useCallback(
    async (
      transcript: string,
      enqueueAudio: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void
    ) => {
      console.log('[Conversation Flow] ========================================');
      console.log('[Conversation Flow] 🎤 HANDLING USER TURN');
      console.log('[Conversation Flow] ========================================');
      console.log(`[Conversation Flow] User transcript (${transcript.length} chars):`, transcript.substring(0, 150) + (transcript.length > 150 ? '...' : ''));

      try {
        // IMPORTANT: Preserve cache for index 2 (first agent) because we pre-computed it during user speech
        // The agent's response was generated based on the conversation flow, not necessarily directly responding to the user
        // This is intentional for group therapy dynamics where agents continue conversation threads
        console.log('[Conversation Flow] 🧹 Cache management: Preserving pre-computed text for agent at index 2, clearing others');

        const index2Text = getCachedText(2);
        if (index2Text) {
          console.log('[Conversation Flow] ✅ Found pre-computed text for index 2:', index2Text.substring(0, 100) + '...');
        } else {
          console.log('[Conversation Flow] ⚠️ No pre-computed text found for index 2');
        }

        // Clear all text caches (will restore index 2 below)
        console.log('[Conversation Flow] Clearing all text caches...');
        clearTextCache();

        // Restore index 2's cached text
        if (index2Text) {
          store.cacheText(2, index2Text);
          console.log('[Conversation Flow] ✅ Restored pre-computed text for index 2');
        }

        // Note: Audio cache is managed separately by useAudioFetcher's LRU cache and persists automatically
        console.log('[Conversation Flow] ℹ️ Audio cache is managed by LRU and persists automatically');

        // Get fresh state
        const freshState = useConversationStore.getState();
        console.log('[Conversation Flow] 📊 Current state:', {
          sessionId: freshState.sessionId,
          totalTurns: freshState.turns.length,
          userName: freshState.speakerIndices[1]?.name
        });

        // Create user turn
        console.log('[Conversation Flow] 💾 Creating user turn object');
        const userSpeaker = freshState.speakerIndices[1];  // Index 1 is always the user
        const turn: Omit<Turn, 'id'> = {
          sessionId: freshState.sessionId!,
          speakerType: 'participant',
          speakerId: userSpeaker?.speakerId,  // Store participant ID
          speakerName: userSpeaker?.name || 'User',
          content: transcript,
          timestamp: new Date().toISOString(),
          sequenceNumber: freshState.turns.length,
        };

        // Save to server immediately
        const turnId = await saveTurnToServer(turn);
        console.log(`[Conversation Flow] ✅ User turn saved to server with ID ${turnId}`);

        // Add to local store
        store.addTurn({ ...turn, id: turnId });
        console.log(`[Conversation Flow] ✅ User turn added to local store`);

        // Track turn
        store.trackTurn('user');
        console.log(`[Conversation Flow] 📊 Tracked user turn for frequency analysis`);

        // Update phase
        const currentTurnCount = useConversationStore.getState().turns.length;
        console.log(`[Conversation Flow] 📈 Updating conversation phase based on ${currentTurnCount} turns`);
        store.updatePhase(currentTurnCount + 1);

        // Update current speaker
        store.setCurrentSpeakerIndex(1); // User just spoke
        console.log(`[Conversation Flow] 👤 Set current speaker index to 1 (user)`);

        // After user, ALWAYS go to agent at index 2
        store.setNextSpeakerIndex(2);
        console.log('[Conversation Flow] ➡️ After user, routing to first agent (index 2)');

        // Execute next turn
        console.log('[Conversation Flow] 🚀 Executing next agent turn...');
        console.log('[Conversation Flow] ========================================');
        executeAgentTurn(enqueueAudio);
      } catch (error) {
        console.error('[Conversation Flow] ========================================');
        console.error('[Conversation Flow] ❌ ERROR HANDLING USER TURN');
        console.error('[Conversation Flow] ========================================');
        console.error('[Conversation Flow] Error details:', error);
        console.error('[Conversation Flow] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        // TODO: Show error to user
      }
    },
    [store, clearTextCache, getCachedText, executeAgentTurn]
  );

  /**
   * Start a new conversation session
   */
  const startSession = useCallback(
    async (
      sessionId: string,
      agents: any[],
      participantId: string,
      participantName: string,
      topic?: string,
      enqueueAudio?: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void
    ) => {
      console.log('[Conversation Flow] ========================================');
      console.log('[Conversation Flow] 🎬 STARTING NEW SESSION');
      console.log('[Conversation Flow] ========================================');
      console.log(`[Conversation Flow] Session ID: ${sessionId}`);
      console.log(`[Conversation Flow] Participant ID: ${participantId}`);
      console.log(`[Conversation Flow] Participant Name: ${participantName}`);
      console.log(`[Conversation Flow] Topic: ${topic || 'No topic'}`);
      console.log(`[Conversation Flow] Agents: ${agents.length}`);
      agents.forEach((agent, idx) => {
        console.log(`[Conversation Flow]   Agent ${idx + 1}: ${agent.name} (ID: ${agent.id})`);
      });

      // Initialize store
      console.log('[Conversation Flow] 📦 Initializing store...');
      store.setSessionId(sessionId);
      if (topic) {
        store.setTopic(topic);
      }
      store.setAgents(agents);

      // Clear caches before starting
      console.log('[Conversation Flow] 🧹 Clearing all caches...');
      clearTextCache();
      clearAudioCache();

      // Initialize speaker indices (MUST be before executing turn)
      console.log('[Conversation Flow] 👥 Initializing speaker indices...');
      store.initializeSpeakers(agents, participantId, participantName);

      // Set initial phase
      console.log('[Conversation Flow] 📊 Setting initial conversation phase...');
      store.updatePhase(0);

      // Get fresh state to verify initialization
      const freshState = useConversationStore.getState();
      console.log('[Conversation Flow] ✅ Session initialized successfully!');
      console.log('[Conversation Flow] Speaker configuration:');
      console.log('[Conversation Flow]   Total speakers:', freshState.speakerIndices.length);
      console.log('[Conversation Flow]   Order:', freshState.speakerIndices.map(s => `${s.index}:${s.name}(${s.type})`).join(' → '));
      console.log('[Conversation Flow]   Next speaker index:', freshState.nextSpeakerIndex);
      console.log('[Conversation Flow]   Current phase:', freshState.currentPhase);

      console.log('[Conversation Flow] 🎤 Starting with moderator opening...');

      // Start conversation with moderator opening
      if (enqueueAudio) {
        console.log('[Conversation Flow] ▶️ Executing first turn (moderator)');
        console.log('[Conversation Flow] ========================================');
        executeAgentTurn(enqueueAudio);
      } else {
        console.warn('[Conversation Flow] ⚠️ No enqueueAudio callback provided, turn will not execute');
      }
    },
    [store, clearTextCache, clearAudioCache, executeAgentTurn]
  );

  /**
   * Skip to next speaker (manual skip)
   */
  const skipToNextSpeaker = useCallback(
    (enqueueAudio: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void) => {
      console.log('[Conversation Flow] Skipping current speaker');
      moveToNextSpeaker(enqueueAudio);
    },
    [moveToNextSpeaker]
  );

  /**
   * End conversation session
   */
  const endSession = useCallback(() => {
    console.log('[Conversation Flow] Ending session');

    // Clear all caches
    clearTextCache();
    clearAudioCache();

    // Reset store
    // (Don't reset yet - let the Session component handle this)
  }, [clearTextCache, clearAudioCache]);

  return {
    startSession,
    handleUserTurn,
    skipToNextSpeaker,
    endSession,
    preComputeNextTurn,
    startPreComputingDuringUserSpeech,
  };
};
