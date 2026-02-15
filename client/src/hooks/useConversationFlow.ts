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
 *
 * CACHE MANAGEMENT STRATEGY:
 * - Text and audio are pre-computed for the next speaker while current audio plays
 * - Caches are ONLY cleared when the user speaks (to invalidate stale pre-computed responses)
 * - Caches are NOT cleared after AI speakers finish (to preserve pre-computed text)
 * - This ensures:
 *   1. Pre-computed text is used when valid (saving time)
 *   2. Fresh text is generated after user input (ensuring context accuracy)
 *   3. No repetition from using outdated cache entries
 */
export const useConversationFlow = () => {
  const store = useConversationStore();
  const { determineNextSpeaker, getSpeakerByIndex } = useSpeakerDetermination();
  const {
    requestText,
    clearCache: clearTextCache,
    getCachedText,
  } = useTextGeneration();
  const {
    fetchAudio,
    clearCache: clearAudioCache,
    getCachedAudio,
  } = useAudioFetcher();
  const {
    initializeStream,
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
      console.log('[Conversation Flow] enqueueAudio callback type:', typeof enqueueAudio);

      if (!enqueueAudio) {
        console.error('[Conversation Flow] ❌ CRITICAL: No enqueueAudio callback in executeAgentTurn');
        throw new Error('enqueueAudio callback is required for executeAgentTurn');
      }

      try {
        // Get fresh state from store to avoid stale closure issues
        const freshState = useConversationStore.getState();
        const nextIndex = freshState.nextSpeakerIndex;
        console.log('[Conversation Flow] Current state:', {
          nextSpeakerIndex: nextIndex,
          totalSpeakers: freshState.speakerIndices.length,
          turnCount: freshState.turns.length,
          sessionId: freshState.sessionId
        });

        // Get speaker indices from fresh state
        const speakerIndices = freshState.speakerIndices;
        console.log('[Conversation Flow] Looking for speaker at index', nextIndex, 'in', speakerIndices.length, 'total speakers');
        const speaker = speakerIndices.find(s => s.index === nextIndex);

        if (!speaker) {
          console.error('[Conversation Flow] ❌ No speaker found at index', nextIndex);
          console.error('[Conversation Flow] Available speakers:', speakerIndices.map(s => `${s.index}:${s.name}`).join(', '));
          throw new Error(`No speaker found at index ${nextIndex}`);
        }

        if (!speaker.voiceId) {
          console.error('[Conversation Flow] ❌ Speaker has no voice ID', speaker);
          return;
        }

        console.log(`[Conversation Flow] ▶️ Executing turn for ${speaker.name} (index ${nextIndex}, type: ${speaker.type})`);

        // 1. Get text (from cache or fetch)
        // 1. Get text (Always fetch fresh, ignoring cache as requested)
        console.log(`[Conversation Flow] 📝 Step 1: Generating fresh text for ${speaker.name}`);

        // Force fresh generation
        const startTime = Date.now();
        const response = await requestText(nextIndex);
        const text = response.content;
        const returnToUser = response.returnToUser;

        const elapsed = Date.now() - startTime;
        console.log(`[Conversation Flow] ✅ Text generated in ${elapsed}ms:`, text.substring(0, 100) + '...');
        if (returnToUser !== undefined) {
          console.log(`[Conversation Flow] Server says returnToUser: ${returnToUser}`);
        }

        // 2. Determine next speaker based on server response or content
        console.log(`[Conversation Flow] 🧭 Step 2: Determining next speaker`);

        let nextNextIndex: number;

        // If server explicitly said to return to user (agent speaking)
        if (returnToUser === true) {
          nextNextIndex = 1; // User index
          console.log(`[Conversation Flow] 🎯 Server says returnToUser=true → routing to user (index 1)`);
          // Increment the user return counter
          store.incrementUserReturnCounter();
          console.log(`[Conversation Flow] User return counter incremented`);
        } else if (returnToUser === false) {
          // Server explicitly said NOT to return to user - don't route to user
          console.log(`[Conversation Flow] 🚫 Server says returnToUser=false → will NOT route to user`);
          // Reset the counter since we're not going to user
          store.resetUserReturnCounter();
          // Use speaker determination logic but skip user
          nextNextIndex = determineNextSpeaker(nextIndex, text);
          // Make sure we don't accidentally route to user
          if (nextNextIndex === 1) {
            nextNextIndex = 2; // Go to first agent instead
            console.log(`[Conversation Flow] Overriding user routing → going to first agent (index 2)`);
          }
        } else {
          // No returnToUser flag (moderator or cached response) - use normal logic
          console.log(`[Conversation Flow] No returnToUser flag - using normal speaker determination`);

          // Check if any agent is mentioned by name (takes priority over "you/your" detection)
          let agentMentioned = false;
          if (nextIndex === 0 && text.includes('?')) {
            // Check if moderator is addressing a specific agent
            for (const s of speakerIndices) {
              if (s.type === 'agent') {
                const firstName = s.name.split(' ')[0].toLowerCase();
                const contentLower = text.toLowerCase();
                if (contentLower.includes(s.name.toLowerCase()) || contentLower.includes(firstName)) {
                  console.log(`[Conversation Flow] 🎯 Agent "${s.name}" mentioned in moderator's question`);
                  agentMentioned = true;
                  break;
                }
              }
            }
          }

          // Special case: When moderator asks a question to the user (and NOT to an agent)
          if (nextIndex === 0 && text.includes('?') && !agentMentioned &&
            (text.toLowerCase().includes('you') || text.toLowerCase().includes('your'))) {
            // Moderator is asking the user a question - go to user
            nextNextIndex = 1;
            console.log(`[Conversation Flow] 🎤 Moderator asked user a question → routing to user (index 1)`);
            // Increment counter since we're going to user
            store.incrementUserReturnCounter();
          } else {
            // Normal turn - use speaker determination logic
            console.log(`[Conversation Flow] 🎲 Running speaker determination logic...`);
            nextNextIndex = determineNextSpeaker(nextIndex, text);

            // If we're routing to user, increment counter; otherwise reset
            if (nextNextIndex === 1) {
              store.incrementUserReturnCounter();
              console.log(`[Conversation Flow] Routing to user - counter incremented`);
            } else {
              store.resetUserReturnCounter();
              console.log(`[Conversation Flow] Not routing to user - counter reset`);
            }
          }
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
          // Check if avatar is registered, and wait briefly if not
          const maxWaitTime = 3000; // 3 seconds max wait
          const startWaitTime = Date.now();
          const waitForAvatar = async () => {
            while (!avatarManager.has(speaker.agentId!) && (Date.now() - startWaitTime) < maxWaitTime) {
              console.log(`[Conversation Flow] ⏳ Waiting for avatar ${speaker.name} to register...`);
              await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
            }

            if (avatarManager.has(speaker.agentId!)) {
              console.log(`[Conversation Flow] 🎬 Triggering HeyGen avatar speech for ${speaker.name}`);
              await avatarManager.speak(speaker.agentId!, text, audioUrl);
            } else {
              console.warn(`[Conversation Flow] ⚠️ Avatar ${speaker.name} not ready after ${maxWaitTime}ms, skipping video speech`);
            }
          };

          waitForAvatar().catch((err) => {
            console.error(`[Conversation Flow] ❌ Failed to trigger avatar speech:`, err);
          });
        }

        // 5. Play audio
        console.log(`[Conversation Flow] 🔊 Step 5: Enqueueing audio for playback`);
        console.log(`[Conversation Flow] Audio URL:`, audioUrl.substring(0, 50) + '...');
        enqueueAudio(audioUrl, turnId.toString(), () => {
          console.log(`[Conversation Flow] ✅ Audio playback completed for ${speaker.name}`);

          // NOTE: We do NOT clear the cache here because the next speaker's response
          // may have been pre-computed while this audio was playing.
          // The cache will be cleared when the user speaks (in handleUserTurn).
          console.log(`[Conversation Flow] Cache NOT cleared - preserving pre-computed next turn`);

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
        // Note: Only pre-compute if next speaker is not the user
        const upcomingSpeaker = speakerIndices.find(s => s.index === nextNextIndex);
        if (upcomingSpeaker && upcomingSpeaker.type !== 'user') {
          console.log(`[Conversation Flow] 🚀 Step 6: Starting background pre-computation while audio plays`);
          preComputeNextTurn();
        } else {
          console.log(`[Conversation Flow] ⏭️ Skipping pre-computation - next speaker is user`);
        }
        console.log('[Conversation Flow] ========================================');
        console.log('[Conversation Flow] Turn execution initiated successfully');
        console.log('[Conversation Flow] ========================================');
      } catch (error) {
        console.error('[Conversation Flow] ========================================');
        console.error('[Conversation Flow] ❌ ERROR EXECUTING AGENT TURN');
        console.error('[Conversation Flow] ========================================');
        console.error('[Conversation Flow] Error:', error);
        console.error('[Conversation Flow] Stack:', error instanceof Error ? error.stack : 'No stack');
        throw error; // Re-throw to be caught by handleUserTurn
      }
    },
    [
      store,
      getSpeakerByIndex,
      determineNextSpeaker,
      requestText,
      fetchAudio,
      touchStream,
    ]
  );

  /**
   * Pre-compute next turn (text and audio) while current audio plays
   */
  const preComputeNextTurn = useCallback(() => {
    // Caching disabled per user request
    console.log('[Conversation Flow] Pre-computation skipped (caching disabled)');
    return;

    /* Original pre-computation logic preserved for reference but disabled
    // Get fresh state to avoid stale closure issues
    const freshState = useConversationStore.getState();
    const nextIndex = freshState.nextSpeakerIndex;
    ...
    */
  }, []);

  /**
   * Start pre-computing the next agent's response while user is speaking
   * This is called when user starts speaking (not after they finish)
   */
  const startPreComputingDuringUserSpeech = useCallback(() => {
    // Caching disabled per user request
    console.log('[Conversation Flow] Pre-computation during user speech skipped (caching disabled)');
    return;

    /* Original logic disabled
    // After user speaks, we always go to agent at index 2 (first agent)
    const nextAgentIndex = 2;
    ...
    */
  }, []);

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
      console.log('[Conversation Flow] enqueueAudio callback provided:', typeof enqueueAudio === 'function' ? 'YES' : 'NO');

      if (!enqueueAudio) {
        console.error('[Conversation Flow] ❌ CRITICAL: No enqueueAudio callback provided!');
        throw new Error('enqueueAudio callback is required');
      }

      try {
        // IMPORTANT: Clear ALL caches when user speaks to ensure agents respond to the latest context
        // Pre-computed responses are outdated since they don't include what the user just said
        console.log('[Conversation Flow] 🧹 Cache management: Clearing ALL caches to ensure fresh responses with user context');
        clearTextCache();
        clearAudioCache();
        console.log('[Conversation Flow] ✅ All caches cleared - agents will generate fresh responses based on complete conversation including user\'s latest contribution');

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
        await executeAgentTurn(enqueueAudio);
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
      enqueueAudio?: (audioUrl: string, id: string, onComplete: () => void, turnData?: { speakerName: string; speakerType: string; content: string; speakerId?: string; avatarColor?: string }) => void,
      onLoadingProgress?: (message: string) => void
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

      // Initialize all agent video streams at session start
      console.log('[Conversation Flow] 🎥 Initializing video streams for all agents...');
      // Filter agents that have BOTH an ID and a valid (non-empty) heygenAvatarId
      const agentsWithVideo = agents.filter(agent => {
        const hasValidConfig = agent.id &&
          agent.heygenAvatarId &&
          agent.heygenAvatarId.trim().length > 0;

        if (agent.id && !hasValidConfig) {
          console.log(`[Conversation Flow]   ⏭️ Skipping ${agent.name} - no valid HeyGen avatar ID`);
        }

        return hasValidConfig;
      });

      if (agentsWithVideo.length > 0) {
        // Initialize all streams
        onLoadingProgress?.('Connecting to video avatars...');
        for (const agent of agentsWithVideo) {
          console.log(`[Conversation Flow]   📹 Initializing video stream for ${agent.name} (${agent.id})`);
          await initializeStream(agent.id);
        }

        // Wait for all avatars to be fully initialized (max 30 seconds)
        console.log('[Conversation Flow] ⏳ Waiting for all avatars to fully initialize...');
        onLoadingProgress?.('Loading avatars...');
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        const checkInterval = 500; // Check every 500ms

        while (Date.now() - startTime < maxWaitTime) {
          const currentState = useConversationStore.getState();
          const allInitialized = agentsWithVideo.every(agent =>
            currentState.videoInitializedStates.get(agent.id) === true
          );

          if (allInitialized) {
            console.log('[Conversation Flow] ✅ All avatars fully initialized!');
            onLoadingProgress?.('All avatars ready!');
            break;
          }

          const initializedCount = agentsWithVideo.filter(agent =>
            currentState.videoInitializedStates.get(agent.id) === true
          ).length;

          console.log(`[Conversation Flow]   Progress: ${initializedCount}/${agentsWithVideo.length} avatars ready`);
          onLoadingProgress?.(`Loading avatars: ${initializedCount}/${agentsWithVideo.length}`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        // Check if we timed out
        const finalState = useConversationStore.getState();
        const finalInitializedCount = agentsWithVideo.filter(agent =>
          finalState.videoInitializedStates.get(agent.id) === true
        ).length;

        if (finalInitializedCount < agentsWithVideo.length) {
          console.warn(`[Conversation Flow] ⚠️ Timeout: Only ${finalInitializedCount}/${agentsWithVideo.length} avatars initialized`);
          const uninitialized = agentsWithVideo.filter(agent =>
            !finalState.videoInitializedStates.get(agent.id)
          );
          console.warn('[Conversation Flow] Uninitialized avatars:', uninitialized.map(a => a.name).join(', '));
        }
      } else {
        console.log('[Conversation Flow] ⏭️ No agents with video avatars configured');
      }

      onLoadingProgress?.('Starting conversation...');

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
    [store, clearTextCache, clearAudioCache, executeAgentTurn, initializeStream]
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
    endSession,
    preComputeNextTurn,
    startPreComputingDuringUserSpeech,
  };
};
