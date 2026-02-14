## 12. Implementation Order (for Claude Code)

**⚠️ CRITICAL REQUIREMENT**: All patient-facing interfaces MUST follow the Patient UX Design standards defined in **Section 6**. These guidelines are non-negotiable and ensure the interface is usable by people with mild-to-moderate dementia.

**Key Patient UX Principles to Remember**:
- **Everything 2x larger**: Fonts 22-26px, buttons 56-72px tall
- **One action per screen**: Never overwhelm with choices
- **Warm, encouraging language**: No medical/technical jargon
- **Voice-first conversation**: Zero clicking during active conversation
- **Forgiving design**: Easy to recover from mistakes
- **Test with real users**: If they hesitate, the design failed

**Design System Split**:
- **Patient Pages** (Landing, Auth, Home, Topic Selection, Mic Check, Conversation, Quiz) → **Section 6**
- **Admin Pages** (Admin Auth, Patient List, Profile, Dashboard) → **Section 7** (Aura Health)

Execute in this exact order:

### Phase 1: Foundation & Database
1. Initialize monorepo with `package.json` workspaces
2. Set up `server/` with Express + TypeScript + Prisma
3. Set up `client/` with Vite + React + TypeScript + Tailwind + Framer Motion
4. Create the Prisma schema with Admin, PatientUser, and updated models
5. Initialize PostgreSQL database and run `npx prisma migrate dev`
6. Generate Prisma Client (`npx prisma generate`)
7. Create Prisma client instance (`server/src/prisma/client.ts`)
8. Create all TypeScript type definitions (`types/index.ts` shared or mirrored)

### Phase 2: Authentication System
9. Implement JWT authentication service (`server/src/services/auth.ts`)
10. Implement password hashing with bcrypt
11. Create authentication middleware for route protection
12. Implement patient signup/login routes
13. Implement admin login routes (with optional 2FA)
14. Create authentication context and hooks on frontend (`useAuth`)
15. Build `ProtectedRoute` component for route guarding

### Phase 3: Frontend — Landing & Auth Pages
**CRITICAL: Follow Patient UX Design standards from Section 6 for all patient-facing pages!**

16. Set up React Router with route definitions
17. Set up Framer Motion page transitions with `AnimatePresence`
18. Build Landing page with smooth animations
    - **Follow Section 6.2 Step 1: Large 32px heading, one big 72px button**
19. Build PatientAuth page (login/signup forms with validation)
    - **Follow Section 6.2 Step 2: 24px input text, 72px button, friendly error messages**
20. Build AdminAuth page (uses Aura Health design system from Section 7)
21. Implement form validation with react-hook-form + zod
    - **Patient errors must be friendly (Section 6.3), not technical**
22. Add smooth transitions between auth states

**Testing Checkpoint**: Verify all patient pages meet Section 6.6 checklist (fonts ≥22px, buttons ≥56px)

### Phase 4: Patient Flow Pages
**CRITICAL: All patient pages must be super intuitive - see Section 6 for complete guidelines**

23. Build Patient Home page (dashboard with agent cohort)
    - **Follow Section 6.2 Step 3: 120px avatars, 32px welcome, 72px action button**
24. Build ConversationSetup page (topic selection, mic check)
    - **Follow Section 6.2 Steps 4-5: 200px topic cards, clear mic feedback**
25. Implement smooth page transitions between patient flow screens
26. Set up Zustand stores (auth, conversation, patient)
27. Build base UI components (Button, Card, Input, Modal, Tabs)
    - **Create separate patient-specific components following Section 6.3 standards**
    - **PatientButton, PatientHeading, PatientCard must use 2x larger sizes**

**Testing Checkpoint**: Have someone unfamiliar with the app try to use it. Should require zero explanation.

### Phase 5: Data Layer & API
28. Implement participant CRUD routes (using Prisma queries)
29. Implement agent generation (Claude call to create agent profiles)
30. Implement agent storage and retrieval (using Prisma)
31. Implement session CRUD with audio storage (using Prisma)

**Note:** All database operations should use Prisma Client. Example:
```typescript
// Create participant with user account
const participant = await prisma.participant.create({
  data: {
    name: 'John Doe',
    notes: 'First participant',
    patientUser: {
      create: {
        email: 'john@example.com',
        passwordHash: hashedPassword
      }
    }
  },
  include: { patientUser: true }
});

// Get participant with agents
const participant = await prisma.participant.findUnique({
  where: { id: participantId },
  include: { agents: true, sessions: true }
});
```

### Phase 6: Core Conversation Engine
32. Implement `claude.ts` — API wrapper with all prompt templates
33. Implement `elevenLabs.ts` — TTS synthesis
34. Implement audio recording service (save full session audio)
35. Implement WebSocket server with authentication (`websocket/handler.ts`)
36. Implement `orchestrator.ts` — the full state machine
37. Implement `moderator.ts` — moderator-specific logic
38. Wire up the complete conversation flow: start → turns → end

### Phase 7: Session UI (Voice-Only Interaction)
**CRITICAL: This is THE MOST IMPORTANT page - follow Section 6.2 Step 6 and Section 6.4 exactly!**

39. Build the Session page layout (conversation feed + group panel + mic bar)
    - **Reference Section 6.4 for exact layout specifications**
    - **Conversation messages: 26px font (extra large!)**
    - **Avatars: 64px circles with speaker colors**
    - **Microphone bar: 96px height with 48px emoji indicators**
40. Implement `useWebSocket` hook with auth token
41. Implement `useAudioPlayback` hook (queue + play audio, signal completion)
42. Implement `useMicrophone` hook (Web Speech API with VAD)
43. Implement `useConversation` hook (combine all into conversation state)
44. Build `SpeakerBubble`, `SpeakerAvatar`, `LiveTranscript`, `TurnIndicator` components
    - **Follow Section 6.4 MessageBubble specifications exactly**
    - **Current speaker must have pulsing ring animation**
45. Build `VoiceAnimation` component (pulsing indicators)
46. Build `ParticipantMic` component with automatic state transitions
    - **Follow Section 6.4 Microphone States exactly - ALL automatic!**
    - **States: 💤 Idle, 🎤 Your Turn, 👂 Listening, 💭 Processing, 💬 Agent Speaking**
    - **Background color changes per state, large visual cues**
47. Build `AgentRing` sidebar with smooth animations
    - **Show currently speaking agent clearly**
48. **ENSURE NO TYPING OR CLICKING REQUIRED DURING CONVERSATION**
    - **Everything is automatic voice activation**

**Testing Checkpoint**: Patient should never be confused about when to speak. Visual cues must be crystal clear.

### Phase 8: Reinforcement
**Follow Section 6.2 Steps 7-8 for Thank You screen and Quiz**

49. Implement `reinforcement.ts` service (generate + spaced repetition)
50. Build Reinforcement page (card UI, hints, feedback with animations)
    - **Thank You: 32px heading, two large buttons (72px & 56px)**
    - **Quiz: 24px question text, 180×100px option cards**
    - **Warm feedback: Confetti on success, gentle encouragement on incorrect**
    - **Progress dots (not numbers!), always-visible skip button**
51. Connect session end → reinforcement generation → reinforcement page flow
52. Add smooth transitions for question changes
    - **Patient should feel celebrated, not tested**

**Testing Checkpoint**: Quiz should feel optional and fun, never stressful or intimidating.

### Phase 9: Admin Dashboard Foundation
53. Build admin route structure and navigation
54. Implement admin-only API routes with auth middleware
55. Build PatientList page (table/grid with search, filters, sorting)
56. Build PatientTable component with smooth animations
57. Implement pagination and infinite scroll

### Phase 10: Patient Profile & Analytics
58. Implement `analytics.ts` service (per-session + longitudinal)
59. Build PatientProfile page with tabs
60. Implement `SessionTimeline`, `RepetitionChart`, `LexicalDiversityChart`, `TopicRecurrenceMap`
61. Add smooth tab transitions and chart animations

### Phase 11: Conversation Visualization
62. Implement conversation graph generation service
63. Build AudioPlayer component with waveform visualization (WaveSurfer.js)
64. Build Waveform and AudioControls components
65. Build ConversationGraph component (React Flow or D3)
66. Build ComponentTimeline (shows which conversation components were active)
67. Build InteractionMatrix (heatmap of who spoke to whom)
68. Build TranscriptView with audio synchronization
69. Build complete ConversationView page assembling all components
70. Add smooth animations for graph interactions

### Phase 12: Audio Storage & Playback
71. Set up audio file storage (AWS S3 or local storage)
72. Implement audio recording during sessions (merge all audio chunks)
73. Implement audio upload/download routes
74. Wire up full session audio playback in ConversationView
75. Add audio download functionality

### Phase 13: Polish & Animations
76. Add page transition animations throughout app
77. Add stagger animations for lists and cards
78. Add loading states with smooth spinners
79. Add microinteractions (hover effects, button feedback)
80. Ensure `prefers-reduced-motion` support
81. Add agent memory persistence (extract + store after each session)
82. Cross-session memory retrieval for agent responses
83. Add CST topic bank and topic selection UI
84. Error handling, loading states, and edge cases
85. Responsive design pass for all screen sizes

### Phase 14: Final Features
86. Implement clinical notes feature for admins
87. Implement system-wide admin dashboard
88. Add export functionality (PDF reports, transcripts)
89. Add search functionality across sessions and transcripts
90. Performance optimization (lazy loading, code splitting)
91. Accessibility audit and fixes
92. Security audit (SQL injection, XSS, CSRF protection)
93. Final testing and bug fixes

---

