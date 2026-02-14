## 1. Project Structure

```
project-root/
├── package.json                    # Root workspace config
├── tsconfig.base.json
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express app entry
│   │   ├── config.ts               # Env vars, constants
│   │   ├── routes/
│   │   │   ├── sessions.ts         # Session CRUD + lifecycle
│   │   │   ├── participants.ts     # Participant management
│   │   │   ├── agents.ts           # Agent profiles
│   │   │   ├── dashboard.ts        # Longitudinal data API
│   │   │   └── speech.ts           # TTS proxy (11Labs)
│   │   ├── services/
│   │   │   ├── orchestrator.ts     # **Core**: conversation turn engine
│   │   │   ├── moderator.ts        # AI moderator logic
│   │   │   ├── agentManager.ts     # Agent identity + memory
│   │   │   ├── claude.ts           # Claude API wrapper
│   │   │   ├── elevenLabs.ts       # 11Labs TTS wrapper
│   │   │   ├── transcription.ts    # Whisper/Deepgram STT
│   │   │   ├── reinforcement.ts    # Post-session recall activity
│   │   │   └── analytics.ts        # NLP longitudinal analysis
│   │   ├── models/
│   │   │   ├── participant.ts
│   │   │   ├── agent.ts
│   │   │   ├── session.ts
│   │   │   ├── turn.ts
│   │   │   └── memory.ts
│   │   ├── websocket/
│   │   │   ├── handler.ts          # WS connection manager
│   │   │   └── events.ts           # Event type definitions
│   │   └── prisma/
│   │       ├── schema.prisma       # Prisma schema definition
│   │       └── client.ts           # Prisma client instance
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── styles/
│   │   │   └── globals.css         # Tailwind + custom properties
│   │   ├── pages/
│   │   │   ├── Landing.tsx                      # Public landing page
│   │   │   ├── auth/
│   │   │   │   ├── PatientAuth.tsx              # Patient login/signup
│   │   │   │   └── AdminAuth.tsx                # Admin login
│   │   │   ├── patient/
│   │   │   │   ├── Home.tsx                     # Patient dashboard
│   │   │   │   ├── ConversationSetup.tsx        # Pre-session setup
│   │   │   │   ├── Session.tsx                  # **Core**: live conversation
│   │   │   │   └── Reinforcement.tsx            # Post-session quiz
│   │   │   └── admin/
│   │   │       ├── PatientList.tsx              # All patients overview
│   │   │       ├── PatientProfile.tsx           # Individual patient details
│   │   │       ├── ConversationView.tsx         # Audio + transcript + graph
│   │   │       └── Dashboard.tsx                # Admin analytics
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── PageTransition.tsx       # Framer Motion page wrapper
│   │   │   │   ├── Header.tsx               # Navigation header
│   │   │   │   └── ProtectedRoute.tsx       # Auth guard component
│   │   │   ├── conversation/
│   │   │   │   ├── ConversationStage.tsx    # Main conversation view
│   │   │   │   ├── SpeakerBubble.tsx        # Individual message
│   │   │   │   ├── SpeakerAvatar.tsx        # Colored avatar with initials
│   │   │   │   ├── LiveTranscript.tsx       # Real-time transcription overlay
│   │   │   │   ├── TurnIndicator.tsx        # Who's speaking now
│   │   │   │   ├── ParticipantMic.tsx       # Mic control + VAD
│   │   │   │   └── VoiceAnimation.tsx       # Pulsing voice indicator
│   │   │   ├── agents/
│   │   │   │   ├── AgentCard.tsx            # Agent profile display
│   │   │   │   └── AgentRing.tsx            # Visual group layout
│   │   │   ├── audio/
│   │   │   │   ├── AudioPlayer.tsx          # Full-featured audio player
│   │   │   │   ├── Waveform.tsx             # Audio waveform visualization
│   │   │   │   └── AudioControls.tsx        # Play/pause/speed controls
│   │   │   ├── graphs/
│   │   │   │   ├── ConversationGraph.tsx    # D3/React Flow network graph
│   │   │   │   ├── ComponentTimeline.tsx    # Component activity timeline
│   │   │   │   └── InteractionMatrix.tsx    # Who-spoke-to-whom heatmap
│   │   │   ├── reinforcement/
│   │   │   │   ├── RecallPrompt.tsx
│   │   │   │   └── HintSystem.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── RepetitionChart.tsx
│   │   │   │   ├── LexicalDiversityChart.tsx
│   │   │   │   ├── TopicRecurrenceMap.tsx
│   │   │   │   └── SessionTimeline.tsx
│   │   │   ├── admin/
│   │   │   │   ├── PatientTable.tsx         # Sortable patient list
│   │   │   │   ├── SessionCard.tsx          # Session preview card
│   │   │   │   └── TranscriptView.tsx       # Synchronized transcript
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Tabs.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useAudioPlayback.ts
│   │   │   ├── useMicrophone.ts
│   │   │   └── useConversation.ts
│   │   ├── stores/
│   │   │   └── conversationStore.ts   # Zustand store
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── audio.ts
│   │   └── types/
│   │       └── index.ts
```

---

