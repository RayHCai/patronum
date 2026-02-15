# HeyGen Avatar Display Fix

## Problem

HeyGen avatars were being generated on the backend but not displaying on the frontend. The console showed:
- `[AvatarVideoPlayer] Stream marked active for [name] but no valid HeyGen config - skipping initialization`
- Avatars stuck at 0/2 ready, infinite loading

## Root Cause

**Two issues identified:**

1. **Incomplete `heygenConfig` storage**: When creating agents in `orchestrator.ts` and `sessions.ts`, the `heygenConfig` was stored as:
   ```typescript
   heygenConfig: JSON.stringify({ appearance })
   ```
   This was **missing the critical `avatarId` field** that the frontend needs to initialize HeyGen avatars.

2. **Missing JSON parsing**: The `heygenConfig` is stored as a JSON string in the database, but wasn't being properly parsed before sending to the client.

## Solution

### 1. Fixed Agent Creation (orchestrator.ts & sessions.ts)

Updated agent creation to store **complete** `heygenConfig` with all required fields:
```typescript
heygenConfig: JSON.stringify({
  avatarId: heygenAvatarId,        // ✅ Now included!
  appearance,
  createdAt: new Date().toISOString(),  // ✅ Now included!
  lastUsed: new Date().toISOString(),   // ✅ Now included!
})
```

### 2. Added JSON Parsing & Fallback Logic

Added helper functions that:
- Parse `heygenConfig` from JSON string to object
- Handle legacy agents with incomplete configs by using the `heygenAvatarId` field as fallback
- Create minimal valid configs for existing agents

**Files Modified:**
- [orchestrator.ts:8-38](server/src/services/orchestrator.ts#L8-L38) - Added `parseHeygenConfig()` helper
- [sessions.ts:14-54](server/src/routes/sessions.ts#L14-L54) - Added `serializeAgentForClient()` helper

### 3. Applied to All Agent Creation Paths

Fixed in 3 locations where agents are created:
- ✅ `server/src/services/orchestrator.ts` (lines 127-139, 156-175)
- ✅ `server/src/routes/sessions.ts` (lines 290-310, 316-334)
- ✅ `server/src/services/agent.ts` (already correct - lines 157-162)

## Testing

To test the fix:

1. **Restart the server** to apply the changes:
   ```bash
   # Stop the server if running, then restart
   cd server
   npm run dev
   ```

2. **Option A - Test with new session:**
   - Create a new conversation session
   - Avatars should now initialize and display video

3. **Option B - Clear existing agents (if issues persist):**
   ```sql
   -- This will force regeneration of agents with correct config
   DELETE FROM Agent WHERE participantId = 'your-participant-id';
   ```

## Expected Behavior After Fix

✅ Backend generates HeyGen avatars with complete config including `avatarId`
✅ Frontend receives properly parsed `heygenConfig` object
✅ `AvatarVideoPlayer` sees valid config and initializes HeyGen stream
✅ Video avatars display and can speak
✅ Loading progress shows "2/2 avatars ready"

## Backward Compatibility

The fix includes fallback logic for existing agents in the database:
- If `heygenConfig` exists but missing `avatarId` → uses `heygenAvatarId` field
- If no `heygenConfig` but has `heygenAvatarId` → creates minimal valid config
- This ensures existing agents will work without database migration
