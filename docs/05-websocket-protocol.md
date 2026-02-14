## 5. WebSocket Protocol

### File: `server/src/websocket/events.ts`

```typescript
// Client → Server events
type ClientEvent =
  | { type: 'session:start'; sessionId: string }
  | { type: 'session:end'; sessionId: string }
  | { type: 'participant:speaking_start' }
  | { type: 'participant:interim_transcript'; text: string }
  | { type: 'participant:final_transcript'; text: string }
  | { type: 'participant:speaking_end' }
  | { type: 'audio:playback_complete' }      // Agent audio finished playing
  | { type: 'reinforcement:answer'; itemId: number; answer: string };

// Server → Client events
type ServerEvent =
  | { type: 'session:started'; agents: Agent[]; topic: string }
  | { type: 'turn:start'; speaker: SpeakerInfo }           // Who is about to speak
  | { type: 'turn:transcript'; text: string; isFinal: boolean }  // Streaming text
  | { type: 'turn:audio'; audioBase64: string }             // Audio chunk
  | { type: 'turn:audio_complete' }                         // All audio sent
  | { type: 'turn:end'; speaker: SpeakerInfo }
  | { type: 'participant:your_turn' }                        // Cue to speak
  | { type: 'session:ended'; summary: string }
  | { type: 'reinforcement:items'; items: ReinforcementItem[] }
  | { type: 'error'; message: string };

interface SpeakerInfo {
  type: 'moderator' | 'agent' | 'participant';
  id?: string;
  name: string;
  avatarColor: string;
}
```

### Flow Example:

```
1. Client sends:  { type: 'session:start', sessionId: '...' }
2. Server sends:  { type: 'session:started', agents: [...], topic: 'Favorite meals' }
3. Server sends:  { type: 'turn:start', speaker: { type: 'moderator', name: 'Guide' } }
4. Server sends:  { type: 'turn:transcript', text: 'Good morning everyone...', isFinal: true }
5. Server sends:  { type: 'turn:audio', audioBase64: '...' }  // streamed in chunks
6. Server sends:  { type: 'turn:audio_complete' }
7. Client sends:  { type: 'audio:playback_complete' }
8. Server sends:  { type: 'turn:start', speaker: { type: 'agent', name: 'Margaret' } }
   ... Margaret speaks ...
9. Client sends:  { type: 'audio:playback_complete' }
10. Server sends: { type: 'participant:your_turn' }
11. Client sends: { type: 'participant:speaking_start' }
12. Client sends: { type: 'participant:interim_transcript', text: 'I remember...' }
13. Client sends: { type: 'participant:final_transcript', text: 'I remember my mother...' }
14. Client sends: { type: 'participant:speaking_end' }
15. Server plans next turns, loops to step 3/8...
```

---

