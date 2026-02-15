// Speaker determination hook - implements 7-rule logic for next speaker
import { useConversationStore, SpeakerIndex } from '../stores/conversationStore';

/**
 * Hook for determining next speaker based on content and conversation state
 * Implements 7 rules from the orchestrator logic
 */
export const useSpeakerDetermination = () => {
  /**
   * Determine next speaker index based on current speaker, content, and frequency rules
   * @param currentIndex - Current speaker's index
   * @param content - Content of the current turn (for content-based routing)
   * @returns Next speaker's index
   */
  const determineNextSpeaker = (currentIndex: number, content: string): number => {
    // Get fresh state to avoid stale closure issues
    const state = useConversationStore.getState();
    const speakerIndices = state.speakerIndices;
    const turnsSinceUserSpoke = state.turnsSinceUserSpoke;
    const userTurnsInLastFive = state.userTurnsInLastFive;
    const turnsSinceModeratorSpoke = state.turnsSinceModeratorSpoke;

    console.log('[Speaker Determination] ========================================');
    console.log('[Speaker Determination] 🎯 DETERMINING NEXT SPEAKER');
    console.log('[Speaker Determination] ========================================');
    console.log('[Speaker Determination] Current speaker index:', currentIndex);
    console.log('[Speaker Determination] Content preview:', content.substring(0, 100) + '...');
    console.log('[Speaker Determination] Frequency stats:', {
      turnsSinceUserSpoke,
      userTurnsInLastFive,
      turnsSinceModeratorSpoke
    });

    const maxIndex = speakerIndices.length - 1;
    console.log('[Speaker Determination] Total speakers:', speakerIndices.length);

    // RULE 0: Never allow the same speaker to speak twice in a row
    // This prevents turn violations and ensures proper turn-taking
    const validateNextSpeaker = (nextIndex: number): number => {
      if (nextIndex === currentIndex) {
        console.log(`[Next Speaker] ⚠️ TURN VIOLATION PREVENTED: Speaker ${currentIndex} cannot speak twice in a row`);
        // Move to next speaker in sequence
        let validIndex = nextIndex + 1;
        if (validIndex > maxIndex) {
          validIndex = 0; // Wrap to moderator
        }
        // If still same speaker (shouldn't happen), keep incrementing
        while (validIndex === currentIndex && validIndex <= maxIndex) {
          validIndex++;
        }
        console.log(`[Next Speaker] ✅ Redirected to speaker ${validIndex} instead`);
        return validIndex;
      }
      return nextIndex;
    };

    // RULE 1: Moderator interjection every 5 turns
    // If moderator hasn't spoken in 5 turns, they should interject to move conversation along
    if (turnsSinceModeratorSpoke >= 5) {
      console.log(`[Next Speaker] Moderator hasn't spoken in ${turnsSinceModeratorSpoke} turns, moderator interjecting (index 0)`);
      return validateNextSpeaker(0);
    }

    // RULE 2: User must speak at least once every 5 turns
    // Ensure user participation doesn't drop too low
    if (turnsSinceUserSpoke >= 5) {
      console.log(`[Next Speaker] User hasn't spoken in ${turnsSinceUserSpoke} turns, going to user (index 1)`);
      return validateNextSpeaker(1);
    }

    // RULE 3: User should speak at most 3 times in any 5-turn window
    // Prevent user from dominating the conversation
    if (userTurnsInLastFive >= 3) {
      console.log(`[Next Speaker] User has spoken ${userTurnsInLastFive} times in last 5 turns (max), skipping user`);
      // Skip to next agent
      let nextIndex = currentIndex + 1;
      if (nextIndex > maxIndex || nextIndex === 1) {
        nextIndex = 2; // Go to first agent
      }
      console.log(`[Next Speaker] Skipping user, going to agent at index ${nextIndex}`);
      return validateNextSpeaker(nextIndex);
    }

    // RULE 4: Content-based routing - Check if content mentions the moderator/guide
    // Keywords: guide, moderator, or collaborative questions (can we, should we, what if we)
    if (
      content.toLowerCase().includes('guide') ||
      content.toLowerCase().includes('moderator') ||
      (content.includes('?') &&
        (content.toLowerCase().includes('can we') ||
          content.toLowerCase().includes('should we') ||
          content.toLowerCase().includes('what if we')))
    ) {
      console.log(`[Next Speaker] Content addresses or questions the moderator, going to moderator (index 0)`);
      return validateNextSpeaker(0);
    }

    // RULE 5: Content-based routing - Check if content mentions any specific agent by name
    // Check both full name and first name
    for (let i = 2; i <= maxIndex; i++) {
      const speaker = speakerIndices[i];
      if (speaker.type === 'agent') {
        const firstName = speaker.name.split(' ')[0].toLowerCase();
        const contentLower = content.toLowerCase();

        // Check for direct mentions, questions to them, or addressing them
        if (
          contentLower.includes(speaker.name.toLowerCase()) ||
          contentLower.includes(firstName) ||
          (content.includes('?') && contentLower.includes(firstName))
        ) {
          console.log(`[Next Speaker] Content mentions or asks "${speaker.name}", going to index ${i}`);
          return validateNextSpeaker(i);
        }
      }
    }

    // RULE 6: Content-based routing - Check if content asks a question to the user
    // Look for question marks combined with user-directed language
    // IMPORTANT: Only 50% chance to route to user to prevent over-prompting
    if (
      content.includes('?') &&
      (content.toLowerCase().includes('you') ||
        content.toLowerCase().includes('your') ||
        content.toLowerCase().includes(speakerIndices[1]?.name.toLowerCase()))
    ) {
      // Random 50% chance to route to user
      if (Math.random() < 0.5) {
        console.log(`[Next Speaker] Content asks user a question, routing to user (index 1) [50% chance triggered]`);
        return validateNextSpeaker(1);
      } else {
        console.log(`[Next Speaker] Content asks user a question, but skipping user [50% chance not triggered]`);
        // Fall through to default routing
      }
    }

    // RULE 7: Default - go to next agent in sequence (wrap around if needed)
    // Prefer agent-to-agent conversation during exploration/deepening phases
    console.log('[Speaker Determination] 🔄 RULE 7: Default sequential routing');

    // Get current phase
    const currentPhase = state.currentPhase;
    const isAgentSpeaking = currentIndex >= 2; // Agent indices start at 2

    // During exploration/deepening, prefer keeping conversation among agents
    // Only route to moderator if agents have had 2-3 turns in a row
    if (isAgentSpeaking && (currentPhase === 'exploration' || currentPhase === 'deepening')) {
      // Count recent consecutive agent turns
      const recentTurns = state.turns.slice(-3);
      const consecutiveAgentTurns = recentTurns.filter(t => t.speakerType === 'agent').length;

      console.log('[Speaker Determination]   Agent speaking in exploration/deepening phase');
      console.log('[Speaker Determination]   Recent consecutive agent turns:', consecutiveAgentTurns);

      // If agents have been talking for 2-3 turns, consider routing to moderator (50% chance)
      if (consecutiveAgentTurns >= 2 && Math.random() < 0.5) {
        console.log('[Speaker Determination]   Agents had multiple turns, routing to moderator for guidance');
        return validateNextSpeaker(0); // Go to moderator
      }

      // Otherwise, continue to next agent
      let nextIndex = currentIndex + 1;
      if (nextIndex > maxIndex) {
        nextIndex = 2; // Wrap to first agent
      }
      if (nextIndex === 0 || nextIndex === 1) {
        nextIndex = 2; // Skip moderator and user
      }

      const nextSpeaker = speakerIndices.find(s => s.index === nextIndex);
      console.log(`[Speaker Determination] ✅ Agent-to-agent routing: ${currentIndex} → ${nextIndex} (${nextSpeaker?.name})`);
      console.log('[Speaker Determination] ========================================');
      return validateNextSpeaker(nextIndex);
    }

    // Default sequential routing for other cases
    let nextIndex = currentIndex + 1;
    if (nextIndex > maxIndex) {
      console.log('[Speaker Determination]   Wrapping around to start of sequence');
      nextIndex = 0; // Wrap to moderator to restart the cycle
    }

    // Allow user to participate in natural sequential rotation
    // User frequency is already controlled by RULE 2 (must speak once per 5 turns)
    // and RULE 3 (max 3 times per 5 turns)

    const nextSpeaker = speakerIndices.find(s => s.index === nextIndex);
    console.log(`[Speaker Determination] ✅ Default routing: ${currentIndex} → ${nextIndex} (${nextSpeaker?.name})`);
    console.log('[Speaker Determination] ========================================');
    return validateNextSpeaker(nextIndex);
  };

  /**
   * Get speaker information by index
   */
  const getSpeakerByIndex = (index: number): SpeakerIndex | null => {
    // Get fresh state to avoid stale closure issues
    const state = useConversationStore.getState();
    const speaker = state.speakerIndices.find((s) => s.index === index) || null;

    if (!speaker) {
      console.warn(`[Speaker Determination] No speaker found at index ${index}`);
      console.warn(`[Speaker Determination] Available speakers:`,
        state.speakerIndices.map(s => `${s.index}:${s.name}`).join(', '));
    }

    return speaker;
  };

  /**
   * Get all agent speakers (excludes moderator and user)
   */
  const getAgentSpeakers = (): SpeakerIndex[] => {
    // Get fresh state to avoid stale closure issues
    const state = useConversationStore.getState();
    return state.speakerIndices.filter((s) => s.type === 'agent');
  };

  return {
    determineNextSpeaker,
    getSpeakerByIndex,
    getAgentSpeakers,
  };
};
