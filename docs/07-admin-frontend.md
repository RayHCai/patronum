## 7. Admin Frontend Architecture (Aura Health Design System)

### 7.1 Admin Flow Structure

**Admin Flow:**
1. **Admin Login** → Separate admin authentication
2. **Patient List** → Overview of all patients
3. **Patient Profile** → Individual patient details and analytics
4. **Recent Conversations** → Audio recordings + conversation graphs/diagrams showing which components were discussed

### 7.2 Admin Design System — Aura Health Design DNA

**IMPORTANT**: This design system is for ADMIN/CLINICIAN interfaces ONLY. Patient-facing interfaces use the separate Patient UX Design standards defined in Section 6.

**Design Philosophy**: World-class UX Engineering with "Linear-style" minimalism meets "Notion-level" functional clarity. Medical but premium — avoiding "hospital blue" in favor of sophisticated "Slate & Zinc" palette.

**Visual Identity: "Soft-Skeuomorphism"**
- 1px inner borders (`border-zinc-200/50`)
- Subtle box shadows (`shadow-[0_1px_3px_rgba(0,0,0,0.1)]`)
- Backdrop-blur for overlays (`backdrop-blur-md`)
- Generous negative space with 12-column Bento Grid layout

**Typography:**
- Primary Font: `"Inter"` or `"Geist"` (strict sans-serif stack)
- Headings: `tracking-tight` for visual refinement
- Secondary Metadata: `text-xs` with `font-medium`
- Body: Clean, highly legible sizing (16px base)
- Monospace (code/data): `"JetBrains Mono"`

**Color Palette — Slate & Zinc Foundation:**
```css
:root {
  /* Base — Zinc-50 Foundation */
  --white: #FFFFFF;
  --bg-primary: #FAFAFA;        /* Zinc-50 */
  --bg-secondary: #F4F4F5;      /* Zinc-100 */
  --bg-tertiary: #E4E4E7;       /* Zinc-200 */
  --border: #E4E4E7;            /* Zinc-200 */
  --border-light: rgba(228, 228, 231, 0.5);  /* Zinc-200/50 */

  /* Text — High Contrast Slate */
  --text-primary: #18181B;      /* Zinc-900 */
  --text-secondary: #52525B;    /* Zinc-600 */
  --text-tertiary: #A1A1AA;     /* Zinc-400 */

  /* Primary Accent — Deep Emerald (health-positive) */
  --accent: #065f46;            /* Emerald-800 */
  --accent-light: #D1FAE5;      /* Emerald-100 */
  --accent-dark: #064E3B;       /* Emerald-900 */

  /* Alert Accent — Rose Tint */
  --alert: #BE123C;             /* Rose-700 */
  --alert-light: #FFE4E6;       /* Rose-100 */

  /* Agent Colors (distinct, accessible, premium) */
  --agent-1: #6366F1;  /* Indigo-500 */
  --agent-2: #EC4899;  /* Pink-500 */
  --agent-3: #F59E0B;  /* Amber-500 */
  --moderator: #065f46; /* Emerald-800 */
  --participant: #3B82F6; /* Blue-500 */

  /* Status Colors */
  --success: #10B981;   /* Emerald-500 */
  --warning: #F59E0B;   /* Amber-500 */
  --error: #EF4444;     /* Red-500 */

  /* Shadows — Soft & Subtle */
  --shadow-soft: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-elevated: 0 12px 32px rgba(0,0,0,0.12);
  --shadow-inner: inset 0 1px 2px rgba(0,0,0,0.06);
}
```

**Layout System: 12-Column Bento Grid**
- Sidebar-driven navigation (240px fixed width)
- Main content: 12-column CSS Grid with `gap-4` (16px)
- Generous negative space: minimum 24px padding, 32px-48px for major sections
- Card-based layout with variable spanning (2x2, 1x2, 2x1, etc.)

**Spacing Scale**: Tailwind's 4px base scale
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

**Animations & Transitions — Framer Motion Spring Physics:**
- **Spring Configuration**: `{ stiffness: 400, damping: 30, mass: 1 }`
- **Staggered Load**: Cards slide up + fade in sequentially (`staggerChildren: 0.05`)
- **Hover States**: Cards lift subtly or border-color shift
  ```typescript
  whileHover={{ y: -2, borderColor: 'var(--accent)' }}
  ```
- **Layout Transitions**: Content "morphs" when switching tabs/views
  ```typescript
  <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
  ```
- **Page Transitions**: 300ms ease-out with y-offset
- **Microinteractions**: 200ms spring for buttons, 150ms for small UI elements

**Accessibility:**
- Respect `prefers-reduced-motion`
- WCAG AA contrast ratios (minimum 4.5:1 for text)
- Large touch targets (minimum 44px for interactive elements)
- Clear focus indicators (2px accent ring)
- High contrast between Zinc base and Emerald/Rose accents

**Key UI Principles:**
- **Minimalism**: One primary action per view, no clutter
- **Functional Clarity**: Every element serves a purpose
- **Premium Feel**: Subtle shadows, refined borders, elegant spacing
- **Medical but Modern**: Professional without being cold
- **Information Density**: High-density data presentation with clean hierarchy

### 7.2.1 Aura Health Dashboard Components (Admin Only)

**Component Architecture:** Sidebar-driven Bento Grid layout with specialized health metric components.

#### 1. The "Vitals" Command Bar (Cmd+K Style)
**Location:** Top of dashboard, persistent across views
**Design:** Notion-style search/action bar

```typescript
// components/dashboard/VitalsCommandBar.tsx
interface CommandBarProps {
  onSearch: (query: string) => void;
  onAction: (action: string) => void;
}

<motion.div
  className="command-bar"
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
  {/* Search input with icon */}
  {/* Quick actions */}
  {/* Keyboard shortcut hint: ⌘K */}
</motion.div>
```

**Visual Style:**
- Background: `bg-white` with `border border-zinc-200/50`
- Shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.1)]`
- Height: 48px
- Rounded: `rounded-lg`
- Icon: Subtle zinc-400, active state emerald-600
- Placeholder: `text-zinc-400 text-sm`
- Keyboard shortcut: `text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded`

**Interaction:**
- Opens on `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- Modal overlay with `backdrop-blur-md`
- Fuzzy search across patients, sessions, metrics
- Arrow key navigation with emerald highlight
- Smooth spring animation on open/close

#### 2. Health-Metric Bento Cards
**Grid Layout:** 12-column grid, cards span 2-4 columns each
**Metrics:** Sleep, Heart Rate, Activity, Blood Pressure, etc.

```typescript
// components/dashboard/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  sparklineData: number[];
  status: 'positive' | 'negative' | 'neutral';
  span?: '1x1' | '2x1' | '1x2' | '2x2';
}

<motion.div
  className="metric-card"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -2, borderColor: 'rgb(6, 95, 70)' }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
  {/* Card header: icon + title */}
  {/* Large metric value */}
  {/* Simple SVG sparkline (not bulky charts) */}
  {/* Trend indicator */}
</motion.div>
```

**Visual Style:**
- Background: `bg-white`
- Border: `border border-zinc-200/50` (1px inner border)
- Shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.1)]`
- Padding: `p-6`
- Rounded: `rounded-xl`
- Hover: Border shifts to `border-emerald-800`, lifts `-2px`

**Sparkline Specifications:**
- Simple, clean SVG paths (not Recharts for these)
- Height: 40-60px
- Stroke: 2px
- Color: Emerald-600 for positive, Rose-600 for alerts
- No axes, no labels, pure visual indicator
- Smooth cubic bezier curves

**Status Indicators:**
- Positive: Emerald-600 text + emerald-100 background badge
- Negative: Rose-700 text + rose-100 background badge
- Neutral: Zinc-600 text + zinc-100 background badge

#### 3. Upcoming Consultations (Linear-Style List)
**Design:** Clean row-based list, minimal borders, hover reveals actions

```typescript
// components/dashboard/ConsultationList.tsx
interface Consultation {
  id: string;
  patientName: string;
  time: Date;
  duration: number;
  type: 'video' | 'in-person';
  status: 'scheduled' | 'in-progress' | 'completed';
}

<motion.div
  className="consultation-list"
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {consultations.map((item, i) => (
    <motion.div
      key={item.id}
      className="consultation-row"
      variants={itemVariants}
      whileHover="hover"
      custom={i}
    >
      {/* Status badge (only visible on hover) */}
      {/* Patient name + avatar */}
      {/* Time + duration */}
      {/* Join Call button (appears on hover only) */}
    </motion.div>
  ))}
</motion.div>
```

**Visual Style:**
- Row height: 56px
- Border: `border-b border-zinc-100` (thin separator)
- Background: `bg-transparent`, hover: `bg-zinc-50`
- Typography: Patient name in `font-medium text-zinc-900`, metadata in `text-xs text-zinc-500`
- Status badge: Small pill, 6px height dot + label

**Hover Interaction:**
- Background fades to `bg-zinc-50`
- "Join Call" button slides in from right with spring physics
- Button style: `bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium`
- Row lifts imperceptibly (1px)

**Status Badges:**
- Scheduled: Zinc-400 dot, "Scheduled" text
- In Progress: Emerald-500 dot with pulse animation, "Live" text
- Completed: Zinc-300 dot, no text

#### 4. Patient Timeline (Vertical Log)
**Design:** Chronological medical history with thin lines and muted dots

```typescript
// components/dashboard/PatientTimeline.tsx
interface TimelineEvent {
  id: string;
  date: Date;
  type: 'session' | 'medication' | 'diagnosis' | 'note';
  title: string;
  description?: string;
  icon?: string;
}

<motion.div
  className="timeline"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.2 }}
>
  {events.map((event, i) => (
    <motion.div
      key={event.id}
      className="timeline-event"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      {/* Date (left side, muted) */}
      {/* Thin vertical line + dot */}
      {/* Event card (right side) */}
    </motion.div>
  ))}
</motion.div>
```

**Visual Style:**
- Vertical line: 1px, `border-l border-zinc-200`
- Timeline dots: 8px circle, `bg-zinc-300`, active/recent: `bg-emerald-600`
- Date typography: `text-xs font-medium text-zinc-400 tracking-tight`
- Event cards: Minimal, `bg-white border border-zinc-100 p-4 rounded-lg`
- Spacing: 24px between events

**Timeline Structure:**
```
┌────────────────────────────────────┐
│ Timeline                           │
├────────────────────────────────────┤
│                                    │
│  Feb 10    ●────  Consultation     │
│  2026      │      Discussed...     │
│            │                       │
│  Feb 8     ●────  Medication       │
│  2026      │      Prescribed...    │
│            │                       │
│  Feb 5     ○────  Note             │
│  2026      │      Patient...       │
│            │                       │
└────────────────────────────────────┘
```

**Interaction:**
- Hover on event card: Border shifts to `border-emerald-800/50`
- Click to expand: Card grows vertically with `layout` animation
- Smooth scroll with momentum

**Stagger Animation:**
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};
```

### 7.3 Pages (Detailed Specifications)

**IMPORTANT**: All patient-facing pages (1-6) MUST follow the Patient UX Design standards defined in **Section 6**. Admin pages (7-10) follow the Aura Health Design System.

#### 1. Landing Page (`pages/Landing.tsx`) - PATIENT UX
- **Audience**: Public (potential patients)
- **Design Reference**: Section 6.2, Step 1
- **Key Requirements**:
  - Large friendly welcome message (32px, emerald-800)
  - One big green button: "Get Started" (72px tall, centered, impossible to miss)
  - Simple tagline: "Chat with friendly companions" (24px)
  - Soft, welcoming colors (white background, emerald accents)
  - Smooth fade-in animations on mount
  - Optional: Gentle parallax effects on scroll
- **Success Metric**: Patient can immediately understand what to do

#### 2. Patient Login/Signup (`pages/auth/PatientAuth.tsx`) - PATIENT UX
- **Design Reference**: Section 6.2, Step 2
- **Key Requirements**:
  - Large welcome message with patient name (32px)
  - Password field with large, clear text (24px input)
  - Large text inputs (minimum 48px height)
  - "Remember me" checkbox (already checked by default)
  - Big green "Continue" button (72px tall)
  - Clear labels and error messages (friendly, not technical - see Section 6.3)
  - Optional: Face/fingerprint login for mobile
  - Minimal fields (name, password, optional caregiver contact)
  - "Forgot Password" flow with email/SMS recovery
  - Smooth transitions between login/signup modes
  - Loading states with encouraging messages (see Section 6.3)
- **Time Goal**: <30 seconds for returning users

#### 3. Patient Home (`pages/patient/Home.tsx`) - PATIENT UX
- **Design Reference**: Section 6.2, Step 3
- **Key Requirements**:
  - "Hello [Name]! Good to see you today!" (32px, emerald-800)
  - Show 3 friendly AI companion faces with names (120px avatars with consistent colors)
  - One sentence about each companion (24px)
  - One giant green button: "Start Conversation" (72px tall, takes up most screen)
  - Optional: "View Past Conversations" link (subtle, smaller)
  - Session history with recent topics (large cards)
  - Card-based layout with stagger animations on load
- **Time Goal**: <1 minute to understand and start conversation

#### 4. Topic Selection (`pages/patient/ConversationSetup.tsx`) - PATIENT UX
- **Design Reference**: Section 6.2, Step 4
- **Key Requirements**:
  - "What would you like to talk about today?" (32px heading)
  - 6 large topic cards with pictures (200px × 200px each):
    - Food & Cooking (image of homemade food)
    - Family & Friends (image of people smiling)
    - Music & Songs (image of musical notes)
    - Nature & Gardens (image of flowers)
    - Childhood Memories (vintage photo style)
    - Hobbies & Interests (image of activities)
  - Cards are HUGE, one tap to select
  - Selected card highlights in green with visible 4px border
  - Big "Next" button appears when topic selected (72px tall)
  - Smooth slide transitions between steps
- **Time Goal**: <1 minute to select topic

#### 5. Microphone Check (`pages/patient/ConversationSetup.tsx`) - PATIENT UX
- **Design Reference**: Section 6.2, Step 5
- **Key Requirements**:
  - "Let's make sure we can hear you" (32px)
  - Microphone permission request with clear, simple explanation
  - Automatic test: "Please say hello"
  - Visual feedback: Large green checkmark ✓ when working (48px icon)
  - If issue detected: Simple troubleshooting with visual guides
  - Big "I'm Ready" button (only appears when mic works, 72px tall)
  - Patient-friendly error messages (see Section 6.3)
- **Time Goal**: <1 minute total

#### 6. Conversation Page (`pages/patient/Session.tsx`) - PATIENT UX — THE CORE UI
- **Design Reference**: Section 6.2, Step 6 & Section 6.4
- **Critical Requirement**: 100% VOICE-DRIVEN - NO CLICKING DURING CONVERSATION!

**Key Requirements**:

**Layout** (see Section 6.4 for detailed specs):
```
┌─────────────────────────────────────────────────────────┐
│ Topic: Food & Cooking                        [End] btn  │  ← Clear topic, always visible exit
├───────────────────────────┬─────────────────────────────┤
│                           │                             │
│   💬 CONVERSATION         │   👥 YOUR FRIENDS          │
│   (scrolling)             │   (static reference)        │
│                           │                             │
│   ┌─────────────────┐     │      ┌───┐                 │
│   │  🟢 Guide        │     │      │ G │ Guide           │
│   │  Welcome! Let's  │     │      └───┘                 │
│   │  talk about...   │     │                            │
│   └─────────────────┘     │   ┌───┐   ┌───┐          │
│                           │   │ M │   │ A │           │
│   ┌─────────────────┐     │   └───┘   └───┘           │
│   │  🟣 Margaret     │     │  Margaret  Arthur          │
│   │  I love baking!  │     │                            │
│   └─────────────────┘     │      ┌───┐                 │
│                           │      │ F │ Frank           │
│   ┌─────────────────┐     │      └───┘                 │
│   │  🔵 You          │     │                             │
│   │  Me too! My...   │     │   🟣 Margaret is speaking │
│   └─────────────────┘     │   (pulsing gentle glow)   │
│                           │                             │
├───────────────────────────┴─────────────────────────────┤
│                                                         │
│   🎤  Your turn to speak                                │
│   (pulsing gently, automatic activation)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Conversation Feed** (left side):
- Messages appear one at a time, scrolling down
- Large avatars (64px) with speaker initials in consistent colors
- Speaker name above message (18px, semibold, speaker's color)
- Message text: **26px font** (extra large for easy reading - see Section 6.3)
- Current speaker has pulsing ring animation (4px ring, speaker color)
- Live transcript shows as patient speaks
- Smooth scroll-to-bottom on new messages (animated)
- All message bubbles follow Section 6.4 specifications

**Group Panel** (right sidebar):
- Shows all participants as colored circles with initials (64px avatars)
- Arranged in visual cluster/grid
- Currently speaking agent has pulsing ring animation
- Clear "Currently speaking: [Name]" indicator below avatars
- Simple and visual — no information overload

**Microphone Bar** (bottom - CRITICAL):
- **Height: 96px (extra large for visibility)**
- **Automatic state transitions - patient never clicks during conversation**
- **States** (see Section 6.4 for complete specs):
  - 💤 Idle: "Others are talking..." (patient just listens)
  - 🎤 Your Turn (pulsing green): "Your turn to speak" (patient starts talking)
  - 👂 Listening (waveform): "Listening..." (patient keeps talking)
  - 💭 Processing (spinner): "Thinking..." (wait a moment)
  - 💬 Agent Speaking: "[Name] is speaking..." (patient just listens)
- Large emoji indicators (48px)
- Message text: 24px
- Background color changes based on state (see Section 6.4)
- Live waveform visualization when patient speaks

**Header**:
- Topic name (24px, left)
- "End" button always visible (top-right, 48px tall, red/subtle)

**Duration**: 15-20 minutes of natural conversation

#### 7. Thank You & Quiz Option (`pages/patient/Reinforcement.tsx`) - PATIENT UX
- **Design Reference**: Section 6.2, Steps 7 & 8
- **Key Requirements**:

**Thank You Screen**:
- "That was wonderful, [Name]!" (32px, celebratory)
- "Would you like to remember what we talked about?" (24px)
- Two big buttons:
  - "Yes, let's remember!" (green, 72px tall)
  - "No thanks, I'm done" (gray, subtle, 56px tall)

**Memory Quiz (if selected)**:
- One question at a time, centered on screen
- Large question text (24px): "Who talked about baking pies?"
- 3 large option cards (180px × 100px each): [Margaret] [Arthur] [Frank]
- Tap to select
- Warm feedback (see Section 6.3):
  - ✓ "That's right! Great memory!" (with confetti animation)
  - ✗ "It was Margaret - good try though!" (gentle, encouraging)
- Progress dots at bottom (not intimidating numbers)
- "Need a hint?" button (appears after 10+ seconds)
- Skip button (always available, no pressure)
- 5 questions total (or patient can skip entire quiz)
- Celebration screen: "You did great today, [Name]!" with score
- Auto-return to home screen after 5 seconds OR "Start Another Conversation" button
- All text follows Section 6.3 typography standards

---

### 7.4 Admin Pages (Aura Health Design System)

#### 8. Admin Login (`pages/admin/AdminAuth.tsx`) - ADMIN DESIGN
- **Separate authentication for administrators/clinicians**
- Professional, clean design
- Email + password authentication
- Two-factor authentication option
- "Remember this device" option
- Secure session management
- Smooth form validation animations

#### 9. Patient List (`pages/admin/PatientList.tsx`) - ADMIN DESIGN
- **Overview of all patients in the system**
- Searchable, sortable table/grid view
- Key information per patient:
  - Name, ID, enrollment date
  - Total sessions completed
  - Last session date
  - Recent activity indicator
- Quick actions: View Profile, View Sessions
- Add New Patient button
- Filters: Active/Inactive, Date range
- Card or table view toggle
- Smooth list animations with stagger effect

#### 10. Patient Profile (`pages/admin/PatientProfile.tsx`) - ADMIN DESIGN
- **Detailed individual patient view**
- Header: Patient name, photo, key demographics
- Tabs for different sections:
  - **Overview**: Basic info, enrollment date, caregiver contact
  - **Agent Cohort**: The 3 AI agents assigned to this patient
  - **Analytics**: Longitudinal trends and metrics
  - **Notes**: Clinical observations and notes
- Session history timeline
- Quick access to recent conversations
- Edit patient information
- Smooth tab transitions

#### 11. Recent Conversations (`pages/admin/ConversationView.tsx`) - ADMIN DESIGN
- **Detailed conversation analysis interface**
- **Full audio recording playback**:
  - Audio player with timestamp scrubbing
  - Waveform visualization
  - Play/pause, speed controls (0.5x, 1x, 1.5x, 2x)
  - Download audio option
- **Conversation transcript**:
  - Color-coded by speaker
  - Synchronized with audio playback (highlights current speaker)
  - Click on transcript to jump to that point in audio
- **Conversation graph/diagram**:
  - Visual network showing conversation flow
  - Nodes: speakers (patient + agents + moderator)
  - Edges: interactions/responses
  - Node size: amount spoken
  - Color-coded by topic/theme discussed
  - Interactive: hover to see details, click to highlight in transcript
- **Component analysis panel**:
  - Which conversation components were active:
    - Memory recall mentions
    - Storytelling instances
    - Question-answer exchanges
    - Emotional expressions
    - Topic coherence
  - Timeline view showing when each component was active
  - Bar chart of component distribution
- **Session metadata**:
  - Duration, topic, date
  - Participation metrics (turn count, avg turn length)
  - AI-generated summary
- Smooth animations for graph interactions
- Export options (PDF report, audio, transcript)

#### 12. Admin Dashboard (`pages/admin/Dashboard.tsx`) - ADMIN DESIGN
- **System-wide analytics and insights**
- Overview cards: Total patients, active sessions today, completion rates
- Aggregated trends across all patients
- Recent activity feed
- System health indicators
- Charts (Recharts): lexical diversity over time, turn count trends, turn length trends
- Repeated phrases/stories table with session links
- Topic recurrence heatmap
- Clean, data-dense but well-spaced (Linear-style)
- Smooth chart animations on load

### 7.5 Key Client Hooks

#### `hooks/useWebSocket.ts`
```typescript
function useWebSocket(sessionId: string) {
  // Manages WS connection lifecycle
  // Returns: { send, lastEvent, isConnected }
  // Reconnects automatically
}
```

#### `hooks/useConversation.ts`
```typescript
function useConversation(sessionId: string) {
  // Combines WS events into conversation state
  // Returns: {
  //   turns: Turn[],
  //   currentSpeaker: SpeakerInfo | null,
  //   isParticipantTurn: boolean,
  //   liveTranscript: string,
  //   sessionStatus: string
  // }
}
```

#### `hooks/useAudioPlayback.ts`
```typescript
function useAudioPlayback() {
  // Manages queuing and playing audio chunks
  // Signals playback complete back to server
  // Returns: { isPlaying, currentSpeaker, enqueueAudio }
}
```

#### `hooks/useMicrophone.ts`
```typescript
function useMicrophone() {
  // WebkitSpeechRecognition for real-time transcription
  // Returns: {
  //   isListening, startListening, stopListening,
  //   interimTranscript, finalTranscript
  // }
}
```

### 6.4 State Management (Zustand)

```typescript
interface ConversationStore {
  // Session
  sessionId: string | null;
  sessionStatus: 'idle' | 'active' | 'reinforcement' | 'complete';
  topic: string;

  // Agents
  agents: Agent[];

  // Conversation
  turns: Turn[];
  currentSpeaker: SpeakerInfo | null;
  isParticipantTurn: boolean;
  liveTranscript: { speaker: SpeakerInfo; text: string } | null;

  // Audio
  isPlaying: boolean;

  // Actions
  addTurn: (turn: Turn) => void;
  setCurrentSpeaker: (speaker: SpeakerInfo | null) => void;
  setLiveTranscript: (transcript: { speaker: SpeakerInfo; text: string } | null) => void;
  setParticipantTurn: (isTurn: boolean) => void;
}
```

---

