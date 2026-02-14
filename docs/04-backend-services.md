## 4. Key Backend Services

### 4.1 `server/src/services/claude.ts` — Claude API Wrapper

```typescript
// Two main functions:

// 1. Plan next turns (uses structured JSON output)
async function planConversation(context: ConversationContext): Promise<TurnPlan>;

// 2. Generate a single agent's speech (uses agent's system prompt)
async function generateAgentResponse(
  agentProfile: AgentProfile,
  agentMemories: Memory[],
  conversationHistory: Turn[],
  directive: string
): Promise<string>;

// 3. Generate moderator speech
async function generateModeratorResponse(
  conversationHistory: Turn[],
  agentProfiles: AgentProfile[],
  directive: string,
  sessionTopic: string
): Promise<string>;

// 4. Generate reinforcement questions from a completed session
async function generateReinforcementItems(
  sessionTurns: Turn[],
  agentProfiles: AgentProfile[]
): Promise<ReinforcementItem[]>;

// 5. Extract memories from a session for agent long-term memory
async function extractAgentMemories(
  agentId: string,
  sessionTurns: Turn[]
): Promise<Memory[]>;
```

**Agent System Prompts (critical for personality consistency):**

Each agent call includes a system prompt like:

```
You are {name}, a {age}-year-old {background.occupation} from {background.hometown}.

PERSONALITY: {personality.traits}
SPEAKING STYLE: {personality.speakingStyle}
QUIRKS: {personality.quirks}

YOUR MEMORIES FROM PAST SESSIONS:
{formatted memories}

You are in a group conversation with other people. Speak naturally in 2-4 sentences.
Stay in character. Never break character or mention being an AI.
Your directive for this turn: {directive}
```

### 4.2 `server/src/services/elevenLabs.ts` — TTS

```typescript
// Each agent gets a distinct 11Labs voice ID assigned at creation.
// The moderator also has a fixed voice.

async function synthesizeSpeech(
  text: string,
  voiceId: string,
  options?: { stability?: number; similarity_boost?: number }
): Promise<Buffer>;  // Returns MP3 audio buffer

// Use 11Labs streaming API for lower latency:
async function synthesizeSpeechStream(
  text: string,
  voiceId: string
): AsyncGenerator<Buffer>;  // Yields audio chunks
```

**Voice Assignment Strategy:**
- Pre-select 5-6 distinct 11Labs voices that are clearly distinguishable
- Assign voices at agent creation time based on agent gender/age
- Store voice_id in the agents table
- Moderator always uses a calm, clear, warm voice

### 4.3 `server/src/services/transcription.ts` — STT

Use the Web Speech API (`webkitSpeechRecognition`) on the client for real-time transcription, sending interim results via WebSocket for the live transcript display. When the participant finishes speaking, send the final transcript to the server.

Fallback: If Web Speech API is unavailable, record audio on client and send to server for Whisper transcription via the OpenAI API.

```typescript
// Client-side (in useMicrophone hook):
// - Use webkitSpeechRecognition for interim + final results
// - Send interim results via WS for live display
// - Send final result via WS to trigger orchestrator.handleParticipantTurn()

// Server-side fallback:
async function transcribeAudio(audioBuffer: Buffer): Promise<string>;
```

### 4.4 `server/src/services/agentManager.ts` — Agent Identity + Memory

```typescript
// Generate a cohort of 3 agents for a new participant
async function generateAgentCohort(participantId: string): Promise<Agent[]>;

// Retrieve agent profiles with relevant memories for a session
async function loadAgentsForSession(
  participantId: string,
  sessionTopic: string
): Promise<AgentWithMemories[]>;

// After session: extract and store new memories
async function updateAgentMemories(sessionId: string): Promise<void>;
```

**Agent Generation Prompt (for `generateAgentCohort`):**

```
Generate 3 fictional characters for a group conversation program for older adults.

Requirements:
- Diverse ages (60s-80s), backgrounds, and personalities
- Each should have: name, age, occupation (current or former), hometown,
  family details, 3-4 personality traits, speaking style description,
  2-3 personal quirks or habits, and 3-4 specific personal interests/hobbies
- Characters should be warm, relatable, and have enough depth for
  recurring conversations
- Make them distinct from each other in personality and background
- One should be more talkative, one more reserved, one somewhere in between

Return as JSON array.
```

### 4.5 `server/src/services/reinforcement.ts` — Post-Session Recall

```typescript
// Generate recall prompts from the just-completed session
async function generateRecallPrompts(sessionId: string): Promise<ReinforcementItem[]>;

// Get items due for review (spaced repetition)
async function getDueItems(participantId: string): Promise<ReinforcementItem[]>;

// Record an answer and update scheduling
async function recordAnswer(itemId: number, answer: string): Promise<void>;
```

**Types of recall prompts:**

1. **Attribution**: "Who told the story about the fishing trip?" → [Margaret, Arthur, Frank] (multiple choice)
2. **Comparison**: "Margaret and Arthur both talked about cooking. What was different about their experiences?" → (open-ended with hint available)
3. **Content Recall**: "What did Frank say his favorite season was?" → [Spring, Autumn, Summer, Winter]

### 4.6 `server/src/services/analytics.ts` — Longitudinal Analysis

```typescript
// Run after each session completes
async function analyzeSession(sessionId: string): Promise<SessionAnalytics>;

// Compute longitudinal trends
async function getLongitudinalData(
  participantId: string
): Promise<LongitudinalReport>;
```

Metrics computed:
- **Lexical diversity**: Type-token ratio of participant turns per session
- **Turn length**: Average word count per participant turn
- **Turn count**: How many times participant spoke
- **Repeated phrases**: N-gram analysis across sessions to detect recurring phrases/stories
- **Topic coherence**: Whether participant responses relate to the current topic (via Claude classification)
- **Interaction patterns**: Response latency, turn-taking frequency

---

