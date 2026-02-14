# Cognitive Games Implementation - Setup Guide

## Overview

This document provides setup instructions and testing guidelines for the cognitive games feature that was implemented for the AI Group Conversational Stimulation Platform.

## What Was Implemented

### Backend
✅ **Database Schema** (`server/prisma/schema.prisma`)
- Added `CognitiveGameResult` table with relations to Session and Participant
- Tracks game type, score, answers, and duration

✅ **Game Generation Service** (`server/src/services/cognitiveGameFactory.ts`)
- Factory pattern supporting 4 game types:
  - **Memory Recall**: Attribution questions about conversation participants
  - **Pattern Recognition**: Visual emoji-based patterns related to conversation themes
  - **Word Association**: Word matching based on conversation keywords
  - **Image Matching**: Image selection based on conversation topics
- Uses Claude API for intelligent question generation
- Includes fallback questions if API fails

✅ **API Routes** (`server/src/routes/cognitive-game.ts`)
- `POST /api/cognitive-game/start` - Random game selection + adaptive question count
- `POST /api/cognitive-game/submit` - Save game results
- `GET /api/cognitive-game/participant/:id` - Fetch participant's game history
- `GET /api/cognitive-game/session/:id` - Fetch game result for session

### Frontend
✅ **Type Definitions** (`client/src/types/cognitiveGame.ts`)
- GameType, GameQuestion, GameAnswer, ImageOption, PatternOption interfaces

✅ **Store Integration** (`client/src/stores/conversationStore.ts`)
- Added cognitive game state management
- Actions for game flow control

✅ **Components**
- `GameChoiceScreen.tsx` - Optional yes/no choice after conversation
- `CognitiveGame.tsx` - Universal game player for all 4 types
- `MemoryRecallOptions.tsx` - Agent avatar selection cards
- `PatternRecognitionOptions.tsx` - Visual pattern cards
- `WordAssociationOptions.tsx` - Large word cards
- `ImageMatchingOptions.tsx` - Image selection cards

✅ **Integration**
- Modified `useConversationFlow.ts` to trigger game after moderator's closing remarks
- Integrated game components into `Session.tsx`

## Setup Steps

### 1. Run Database Migration

The Prisma schema has been updated. You need to run the migration:

```bash
cd server
yarn prisma migrate dev --name add_cognitive_games
```

This will:
- Create the `cognitive_game_results` table
- Add relations to existing tables
- Generate updated Prisma client types

### 2. Set Up Image Library (for Image Matching Game)

The Image Matching game requires a pre-curated library of dementia-friendly images. Create the following directory structure:

```
client/public/game-images/
├── food/
│   ├── kitchen.jpg
│   ├── baking.jpg
│   ├── dinner-table.jpg
│   └── recipe-book.jpg
├── family/
│   ├── family-gathering.jpg
│   ├── playing-games.jpg
│   └── photo-album.jpg
├── nature/
│   ├── garden.jpg
│   ├── park.jpg
│   ├── flowers.jpg
│   └── trees.jpg
├── hobbies/
│   ├── knitting.jpg
│   ├── painting.jpg
│   ├── reading.jpg
│   └── puzzles.jpg
└── travel/
    ├── beach.jpg
    ├── mountains.jpg
    ├── city.jpg
    └── countryside.jpg
```

**Image Requirements:**
- **Resolution**: 800×600px minimum (will be displayed responsively)
- **Format**: JPG or PNG (optimized for web)
- **Content**: High-contrast, simple compositions
- **Accessibility**: Clear subject, minimal background clutter
- **Licensing**: Use royalty-free sources like Unsplash, Pexels, or Pixabay

**Recommended Approach:**
1. Use AI image generation (DALL-E, Midjourney) with prompts like:
   - "High-contrast photo of a kitchen with simple composition, dementia-friendly, clear and warm"
   - "Simple family gathering photo, warm lighting, easy to understand, accessible"
2. Or download from royalty-free stock photo sites
3. Optimize images using tools like TinyPNG or ImageOptim

### 3. Verify Environment Variables

Ensure your `.env` files have the necessary configuration:

**Server** (`server/.env`):
```env
DATABASE_URL="postgresql://..."
ANTHROPIC_API_KEY="sk-ant-..."
```

**Client** (`client/.env`):
```env
VITE_API_URL="http://localhost:5000"
```

## How It Works

### Conversation Flow

1. **Normal Conversation**: Participant engages in conversation with AI moderator and agents
2. **Closing Phase**: When moderator delivers closing remarks (phase = 'closing')
3. **Game Choice Screen**: After closing audio completes, patient sees "Would you like to play a quick memory game?"
   - **If YES**: Random game type selected, questions generated
   - **If NO**: Skip to Thank You page
4. **Game Play**: Patient answers 3-5 questions (adaptive based on conversation length)
5. **Feedback**: Warm, encouraging feedback after each answer
6. **Completion**: Results saved to database, navigate to Thank You page

### Adaptive Logic

- **Short conversations** (<15 turns): 3 questions
- **Long conversations** (15+ turns): 5 questions

### Random Game Selection

Each session randomly selects one of 4 game types:
- 25% chance: Memory Recall
- 25% chance: Pattern Recognition
- 25% chance: Word Association
- 25% chance: Image Matching

## Testing

### Manual Testing Checklist

**1. Database Migration**
```bash
cd server
yarn prisma migrate dev
yarn prisma generate
```
Verify: No errors, `cognitive_game_results` table exists

**2. Start Development Servers**
```bash
# Terminal 1 - Server
cd server
yarn dev

# Terminal 2 - Client
cd client
yarn dev
```

**3. Test Full Flow**
1. Login as a patient
2. Start a conversation session
3. Progress through conversation phases (can skip turns to speed up)
4. Wait for moderator's closing remarks
5. **Verify**: Game Choice Screen appears with Yes/No buttons
6. Click "Yes, let's play!"
7. **Verify**: Random game type loads with questions
8. Answer 3-5 questions
9. **Verify**: Feedback shows after each answer (green for correct, orange for incorrect)
10. **Verify**: Auto-advances to Thank You page after completion

**4. Test Skip Functionality**
1. Follow steps 1-6 above
2. Click "Skip game" button (bottom right)
3. **Verify**: Immediately navigates to Thank You page
4. **Verify**: No game result saved in database

**5. Test Database Tracking**
Check database after completing a game:
```sql
SELECT * FROM cognitive_game_results ORDER BY completed_at DESC LIMIT 1;
```

Verify:
- `game_type` is one of: memory_recall, pattern_recognition, word_association, image_matching
- `score` matches actual performance
- `answers` JSON contains all responses
- `duration_seconds` is reasonable

**6. Test All 4 Game Types**
Since selection is random, you may need to play multiple sessions:
- Memory Recall: Shows agent names as options
- Pattern Recognition: Shows emoji patterns
- Word Association: Shows words in large cards
- Image Matching: Shows 3 images

### API Testing (Optional)

Test endpoints using curl or Postman:

```bash
# Start a game
curl -X POST http://localhost:5000/api/cognitive-game/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId": "SESSION_ID"}'

# Submit results
curl -X POST http://localhost:5000/api/cognitive-game/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "participantId": "PARTICIPANT_ID",
    "gameType": "memory_recall",
    "score": 2,
    "totalQuestions": 3,
    "answers": [...],
    "durationSeconds": 120
  }'
```

## Troubleshooting

### Game Doesn't Appear After Closing

**Symptoms**: Conversation ends without showing game choice screen

**Possible Causes**:
1. Conversation didn't reach 'closing' phase
2. Moderator didn't finish closing audio
3. Store state not updating

**Debug**:
```javascript
// Check conversation phase
console.log(useConversationStore.getState().currentPhase);

// Check if game choice should show
console.log(useConversationStore.getState().showGameChoice);
```

**Fix**: Verify that `useConversationFlow.ts` modifications are correct (lines 269-282)

### Image Matching Game Shows Broken Images

**Symptoms**: Image placeholders instead of actual images

**Cause**: Images not in `/public/game-images/` directory

**Fix**:
1. Create directory structure as outlined above
2. Add images with correct filenames
3. Restart development server

### Question Generation Fails

**Symptoms**: Fallback generic questions appear

**Possible Causes**:
1. Claude API key missing or invalid
2. API rate limit exceeded
3. Conversation content too short

**Debug**: Check server logs for errors from `cognitiveGameFactory.ts`

**Fix**:
- Verify `ANTHROPIC_API_KEY` in `.env`
- Check Claude API quota
- Use longer conversations for better question generation

### Game Results Not Saving

**Symptoms**: Game completes but no record in database

**Possible Causes**:
1. Database migration not run
2. API authentication failing
3. Network error

**Debug**: Check browser console and server logs for API errors

**Fix**:
- Run migration: `yarn prisma migrate dev`
- Verify JWT token is being sent
- Check network tab for API response

## Architecture Notes

### Why Client-Side Turn Management?

The conversation flow is managed entirely client-side for seamless UX. The game trigger is integrated into this flow, checking for the closing phase after each turn's audio completes.

### Why Random Game Selection?

Variety keeps the experience fresh across multiple sessions. Analytics can track which game types patients engage with most, informing future improvements.

### Why Adaptive Question Count?

Prevents fatigue: shorter conversations get fewer questions (3), longer conversations get more (5). This respects the patient's cognitive load.

### Why Optional?

Patient autonomy is critical in dementia care. The choice to skip ensures they're never forced into an activity they don't want to do.

## Future Enhancements

### Phase 2 Ideas
- **Voice-Answer Mode**: Patients speak answers instead of clicking
- **Difficulty Adaptation**: Adjust complexity based on dementia stage
- **Personalized Selection**: Track preferences and show favorite game types more often
- **Multiplayer**: Caregiver can join and collaborate on answers
- **Longitudinal Tracking**: Analytics dashboard showing memory performance over time

## Support

For issues or questions:
1. Check server logs: `server/logs/`
2. Check browser console for client-side errors
3. Review this documentation
4. Examine the implementation plan: `~/.claude/plans/whimsical-kindling-fairy.md`

## Summary

The cognitive games feature is **fully implemented** and ready for testing. Complete the setup steps above, particularly:
1. Run database migration
2. Create image library for Image Matching game

Then follow the manual testing checklist to verify everything works end-to-end.
