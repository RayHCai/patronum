## 3. Core Architecture: The Conversation Orchestrator

This is the most important part of the system. The orchestrator manages the sequential flow of the group conversation.

### File: `server/src/services/orchestrator.ts`

**State Machine:**

```
IDLE → MODERATOR_SPEAKING → AWAITING_PARTICIPANT → PARTICIPANT_SPEAKING →
  → PROCESSING → AGENT_SPEAKING → (loop back to MODERATOR or AGENT or AWAITING_PARTICIPANT)
```

**Design Principles:**
- Only ONE entity speaks at a time (strict sequential turn-taking)
- The moderator decides who speaks next after each turn
- Audio playback completion triggers the next turn
- The participant can interject at designated moments (after any agent finishes)

**Orchestrator Class API:**

```typescript
interface ConversationState {
  sessionId: string;
  participantId: string;
  status: 'idle' | 'moderator_speaking' | 'awaiting_participant' |
          'participant_speaking' | 'processing' | 'agent_speaking';
  currentSpeaker: string | null;
  turnQueue: PlannedTurn[];
  turnHistory: Turn[];
  sequenceNumber: number;
}

interface PlannedTurn {
  speakerType: 'moderator' | 'agent';
  speakerId?: string;
  speakerName: string;
  directive: string;  // instruction for what this agent should say
}

class Orchestrator {
  // Start a session: moderator introduces topic, agents introduce themselves
  async startSession(sessionId: string): Promise<void>;

  // Called when participant finishes speaking (transcript received)
  async handleParticipantTurn(transcript: string): Promise<void>;

  // Called when an audio finishes playing on the client
  async handlePlaybackComplete(): Promise<void>;

  // Internal: ask Claude to decide next moves and generate responses
  private async planNextTurns(): Promise<PlannedTurn[]>;

  // Internal: generate a single agent/moderator response
  private async generateTurn(turn: PlannedTurn): Promise<GeneratedTurn>;

  // Internal: send audio + transcript to client via WebSocket
  private async deliverTurn(turn: GeneratedTurn): Promise<void>;

  // End session gracefully
  async endSession(): Promise<void>;
}
```

**Turn Planning via Claude:**

Each time the orchestrator needs to decide what happens next, it sends a meta-prompt to Claude that includes:
1. The full conversation so far (last N turns)
2. All agent profiles
3. The current topic
4. Instructions to return a JSON plan of 1-3 next turns

Example meta-prompt response:
```json
{
  "next_turns": [
    {
      "speaker": "moderator",
      "directive": "Acknowledge what the participant said about gardening. Ask Margaret if she also enjoys gardening."
    },
    {
      "speaker": "Margaret",
      "directive": "Share a short story about your rose garden. Mention that your late husband used to help. Ask the participant what they like to grow."
    }
  ],
  "should_prompt_participant_after": true
}
```

Then, for each planned turn, a *separate* Claude call generates the actual dialogue for that agent, using that agent's personality profile and memories as system context.

---

