## 16. Critical Implementation Notes

### Voice-Only Interaction (CRITICAL REQUIREMENT)

**The quiz/conversation MUST be completely voice-driven with NO typing or clicking required:**

1. **Automatic Turn Management:**
   - The system automatically detects when the participant should speak
   - Voice Activity Detection (VAD) automatically starts listening when it's the participant's turn
   - No "click to speak" button during conversation
   - Microphone activates automatically when `participant:your_turn` event is received

2. **Visual Feedback Only:**
   - Show visual indicators for whose turn it is
   - Display live transcript as the participant speaks
   - Show pulsing animation when microphone is listening
   - Display "Listening..." or "Your turn to speak" messages
   - NO interactive buttons during active conversation

3. **Automatic Flow:**
   ```
   Agent finishes speaking
     ↓
   Audio playback completes
     ↓
   System sends "participant:your_turn" event
     ↓
   Microphone AUTOMATICALLY activates (no click needed)
     ↓
   Visual indicator shows "Your turn" + pulsing mic
     ↓
   Participant speaks (detected via VAD)
     ↓
   Silence detected (1.5s threshold)
     ↓
   Transcript automatically sent to server
     ↓
   Next agent speaks automatically
   ```

4. **Implementation Requirements:**
   ```typescript
   // useConversation hook should handle automatic flow
   useEffect(() => {
     if (isParticipantTurn && !isListening) {
       // AUTOMATICALLY start listening when it's participant's turn
       startListening();
     }
   }, [isParticipantTurn]);

   // useMicrophone hook with VAD
   useEffect(() => {
     if (isListening) {
       // Automatically detect silence and end turn
       const silenceTimer = setTimeout(() => {
         if (silenceDuration > 1500) {
           stopListening();
           sendTranscript(finalTranscript);
         }
       }, 100);
     }
   }, [silenceDuration, isListening]);
   ```

5. **Exception - Session Controls Only:**
   - The ONLY clickable element should be "End Session" button (for safety)
   - All conversation flow is automatic and voice-driven
   - No quiz answer buttons, no "Next Question" buttons
   - Voice is the only input method during active session

### Audio Sequencing (MOST IMPORTANT for smooth experience)
The entire UX depends on clean, sequential audio playback. The flow MUST be:
1. Server generates text → sends `turn:transcript` event
2. Server generates audio → sends `turn:audio` as base64 chunks
3. Server sends `turn:audio_complete`
4. Client plays all audio chunks in sequence
5. Client sends `audio:playback_complete` ONLY after ALL audio has finished playing
6. Server then proceeds to next turn

**Never overlap audio. Never skip the playback_complete signal.**

### Agent Voice Distinctiveness
Each agent MUST have a clearly different voice. Pre-test the 11Labs voice combinations. Consider adjusting stability and similarity_boost parameters per agent to create more variation.

### Latency Management
- Stream Claude responses (use streaming API) so text appears quickly
- Use 11Labs streaming TTS API to begin audio playback before full generation completes
- Show the transcript immediately while audio plays (text appears first, then voice follows)
- Target: <2 seconds between turns

### Participant Turn Detection
- Use Voice Activity Detection (VAD) on the client to detect when the participant stops speaking
- Add a 1.5-second silence threshold before finalizing the turn
- Show visual feedback during silence gap ("Still listening..." → "Processing...")

### Memory Management for Long Sessions
- Keep only last 20 turns in the Claude context window
- Summarize earlier turns into a brief narrative
- Agent memories are separate and always included in full

### Error Recovery
- If TTS fails: show text only, continue conversation
- If Claude API fails: retry once, then skip to next planned turn
- If WebSocket disconnects: auto-reconnect, resume from last known state
- If microphone fails: offer text input fallback
```