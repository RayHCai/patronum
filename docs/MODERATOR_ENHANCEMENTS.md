# Moderator Context & Speech Generation Enhancements

This document describes the comprehensive enhancements made to the AI moderator system for improved participant engagement and conversation quality.

## Overview

The moderator now dynamically adapts its behavior based on:
- Real-time participant engagement assessment
- Turn distribution balance
- Session memory and context
- Participant emotional state
- Conversation flow patterns

## 1. Active Turn Rebalancing (Adaptive Intervention)

**Purpose**: Prevent conversation dominance and ensure balanced participation.

### Implementation
- **Location**: `server/src/services/claude.ts` - `buildSpeakerTurnTracker()`
- **How it works**:
  - Tracks consecutive turns and total turns per speaker
  - Identifies "dominant speakers" (3+ consecutive turns OR 4+ of last 5 turns)
  - Moderator receives explicit rebalancing guidance when dominance detected

### Behavior
When one speaker dominates:
```typescript
// Example moderator prompt guidance:
"REBALANCING NEEDED: [Speaker] has dominated recent turns.
Redirect to quieter members: [names].
Example: 'Anna, I'd really love to hear what you think about that.'"
```

The redirection is:
- Socially natural
- Framed as curiosity, not control
- Names specific quieter members

---

## 2. Lightweight Engagement Scoring (Per Turn)

**Purpose**: Assess participant engagement to guide moderator response style.

### Implementation
- **Location**: `server/src/services/claude.ts` - `assessParticipantEngagement()`
- **How it works**:
  - Uses Claude AI to analyze each participant turn
  - Evaluates: emotional engagement, clarity, confusion signals, distress signals
  - Classifies as: `high` | `medium` | `low`

### Scoring Logic
```typescript
interface EngagementAssessment {
  level: 'high' | 'medium' | 'low';
  emotionalEngagement: number; // 0-1
  clarity: number; // 0-1
  length: number; // word count
  hasConfusion: boolean;
  hasDistress: boolean;
}
```

**Classification**:
- **Low**: Distress OR confusion OR clarity < 0.4
- **High**: Emotional engagement ≥ 0.7 AND clarity ≥ 0.7 AND length ≥ 10 words
- **Medium**: Everything else

### Usage
Score is **never spoken aloud** but guides:
- Prompt simplification
- Question depth
- Comfort pivots

---

## 3. Automatic Prompt Simplification When Confusion Appears

**Purpose**: Make prompts more accessible when participant shows confusion.

### Triggers
- Low engagement level
- Short answers (< 5 words)
- Confusion signals detected

### Behavior Changes
When confusion detected, moderator automatically:
- Uses shorter sentences (1-2 sentences max)
- Single-idea prompts
- Concrete, present-focused questions
- Warm, supportive tone

**Example**:
```
"That's okay, Maggie. What comes to mind when you think about your garden?"
```

---

## 4. Comfort-Topic Fast Pivot

**Purpose**: Emotional regulation through familiar positive topics.

### Implementation
- **Location**: `server/src/services/aiModerator.ts` - `extractComfortTopics()`
- **Sources**:
  - Caregiver notes (interests, hobbies)
  - Session memory hooks (personal stories, sensory details)

### Triggers
- Low engagement level + distress/agitation detected

### Behavior
Moderator automatically:
1. Briefly acknowledges the difficulty
2. Pivots to familiar comfort topic
3. References something specific and positive

**Example**:
```
"That sounds really hard. You know, last time you told us about your roses —
what colors are they right now?"
```

---

## 5. Micro-Affirmation After Participant Contributions

**Purpose**: Validate and encourage participant contributions.

### Implementation
- **Location**: `server/src/services/aiModerator.ts` - behavioral guidance
- **Triggers**: After participant turns (except opening)

### Guidelines
- One short sentence
- Reflects what was said specifically
- **No praise inflation** ("amazing", "incredible")
- **No therapy language**
- Genuine and warm

**Examples**:
- "I love how you described the smell of the kitchen."
- "That sounds like a really warm memory."
- "The way you talk about your daughter really shows how much you care."

---

## 6. Agent Bridging Upgrade (Stronger Group Feel)

**Purpose**: Create more natural, connected group dialogue.

### Implementation
- **Location**: `server/src/services/aiModerator.ts` - addressing hints
- **Technique**: Detail-anchored bridging

### Old Behavior
```
"What do you think, Ben?"
```

### New Behavior
```
"Ben, you mentioned baking with your daughter earlier —
Anna was just talking about making cakes for birthdays.
What do you think about that?"
```

### Features
- Explicitly names the connection between speakers
- References concrete details from earlier turns
- Creates narrative continuity

---

## 7. Session-Local Memory Hooks

**Purpose**: Track and reuse notable participant moments within the same session.

### Implementation
- **Location**: `server/src/services/claude.ts` - `extractSessionMemoryHooks()`
- **Storage**: In-memory per session (production should use Redis/DB)

### What Gets Tracked
```typescript
type HookType =
  | 'personal_story'
  | 'named_person'
  | 'sensory_detail'
  | 'strong_emotion';
```

### Extraction
Uses AI to identify:
- Personal stories or anecdotes
- Named people (family, friends)
- Sensory details (smells, sounds, textures, etc.)
- Strong emotions expressed

### Usage
- Moderator references these naturally 1-2 times later in session
- **Not framed as "remembering" or testing**
- Creates continuity and personalization

**Example**:
```
Participant earlier: "I remember baking bread with my mother on Sundays.
The kitchen smelled wonderful."

[Memory hook extracted: sensory_detail, keywords: ["baking", "mother", "Sunday"]]

Moderator later: "That reminds me of what you said about baking with your
mother on Sundays..."
```

---

## 8. End-of-Session Personalized Highlight Selection

**Purpose**: Close with meaningful, personalized reflection.

### Implementation
- **Location**: `server/src/services/aiModerator.ts` - `generateModeratorClosing()`
- **Requirement**: MUST include at least one specific detail participant shared

### Selection Preference
1. Personal stories
2. Sensory details
3. Named people
4. Strong emotions

### Behavior
```typescript
// Example closing:
"Maggie, I really loved hearing about baking bread with your mother
and how the kitchen smelled on Sundays. Thank you all for sharing
such beautiful memories today."
```

---

## 9. Adaptive Question Depth

**Purpose**: Match question complexity to participant engagement level.

### Implementation
- **Location**: `server/src/services/aiModerator.ts` - question depth guidance

### Strategy Matrix

| Engagement Level | Question Type | Example |
|-----------------|---------------|---------|
| **Low** | Concrete, present-focused | "What do you usually plant first in your garden?" |
| **Medium** | Open but grounded | "What's your favorite thing about gardening?" |
| **High** | Reflective, deeper | "What do you enjoy most about being in the garden?" |

---

## 10. Reasoning Field Enrichment (Internal Only)

**Purpose**: Provide transparency into moderator decision-making (for debugging/logging).

### Implementation
- **Location**: `server/src/services/claude.ts` - `decideNextSpeaker()` return value

### Structure
```typescript
interface NextSpeakerDecision {
  type: 'agent' | 'moderator' | 'participant';
  agentId?: string;
  reasoning: {
    engagementLevel: EngagementLevel;
    strategyApplied?: string;
    rebalancingApplied: boolean;
    participantTurnsSinceLastSpeak: number;
  };
}
```

### Information Included
- Current participant engagement level
- Whether rebalancing strategy was applied
- Strategy name (e.g., "active_turn_rebalancing", "comfort_pivot")
- Participant turn tracking

**IMPORTANT**: This is **strictly internal** and **never spoken aloud**.

---

## API Changes

### Updated Endpoints

#### POST `/api/ai-moderator/generate-response`

**Request Body** (new optional fields):
```typescript
{
  sessionId: string;
  conversationHistory: TurnData[];
  currentPhase: ConversationPhase;
  needsRebalancing?: boolean;      // NEW
  targetQuieterAgent?: string;     // NEW
}
```

**Response** (new fields):
```typescript
{
  data: {
    content: string;
    voiceId: string;
    engagementLevel: EngagementLevel;  // NEW
    memoryHooksCount: number;          // NEW
  }
}
```

#### POST `/api/ai-moderator/closing`

**Updated**: Now requires participant name and uses session memory hooks for personalized highlights.

---

## Session State Management

### In-Memory State (per session)
```typescript
{
  memoryHooks: SessionMemoryHook[];
  lastParticipantEngagement?: EngagementLevel;
  lastParticipantTurnNumber?: number;
}
```

**Note**: For production, migrate to Redis or database for persistence across server restarts.

---

## Updated System Prompt

The moderator system prompt now includes:

1. Dynamic participation balancing
2. Micro-affirmation guidelines
3. Comfort pivot instructions
4. Prompt simplification guidance
5. Adaptive question depth
6. Session memory integration
7. Detail-anchored bridging technique

See [server/src/services/aiModerator.ts](../server/src/services/aiModerator.ts) for full prompt.

---

## Testing Recommendations

### Test Scenarios

1. **Turn Rebalancing**
   - Have one agent speak 4+ consecutive times
   - Verify moderator redirects to quieter members

2. **Engagement Scoring**
   - Short participant responses (< 3 words)
   - Confused responses ("I don't know", "What?")
   - Engaged responses (10+ words, emotionally rich)

3. **Comfort Pivot**
   - Participant shows distress
   - Verify moderator pivots to comfort topic from notes

4. **Memory Hooks**
   - Participant shares sensory detail ("the roses smelled sweet")
   - Verify moderator references it later naturally

5. **Personalized Closing**
   - Run full session with participant contributions
   - Verify closing includes specific detail from session

---

## Files Modified

### Core Services
- `server/src/services/claude.ts` - Engagement scoring, memory hooks, turn routing
- `server/src/services/aiModerator.ts` - Moderator response generation with all enhancements

### Types
- `server/src/types/index.ts` - New types for engagement, memory hooks, reasoning

### Routes
- `server/src/routes/aiModerator.ts` - Session state management, enhanced endpoints
- `server/src/routes/conversation.ts` - Backward compatibility update

---

## Future Enhancements

### Recommended Additions

1. **Persistent Session State**
   - Move from in-memory to Redis/PostgreSQL
   - Preserve state across server restarts

2. **Analytics Dashboard**
   - Track engagement levels over time
   - Identify patterns in confusion/distress triggers

3. **Caregiver Feedback Loop**
   - Allow caregivers to update comfort topics
   - Refine based on what works

4. **Multi-Session Memory**
   - Reference highlights from past sessions
   - "Last time we talked about..."

5. **Proactive Comfort Topic Suggestions**
   - AI-suggested comfort topics from broader context
   - Learn what topics resonate most

---

## Summary

These enhancements transform the moderator from a simple turn-taker to an adaptive, emotionally intelligent conversation facilitator that:

✅ Dynamically balances participation
✅ Adapts to participant engagement in real-time
✅ Remembers and references session moments
✅ Provides emotional support through comfort pivots
✅ Creates natural, connected group dialogue
✅ Personalizes closing reflections

The result is a more engaging, supportive, and natural conversation experience for participants with cognitive impairment.
