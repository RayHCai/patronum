# HeyGen Avatar Integration Documentation

## Overview

This document describes the HeyGen avatar integration for AI agents and moderators in the group therapy conversation system. The implementation adds video avatars with lip-sync capabilities while maintaining the existing audio pipeline.

## Architecture

### Hybrid Approach

The system uses a **hybrid architecture**:
- **Audio**: ElevenLabs TTS (existing, cached)
- **Video**: HeyGen streaming avatars with lip-sync to ElevenLabs audio

**Benefits:**
- Preserves existing audio caching infrastructure
- Leverages HeyGen's superior lip-sync capabilities
- Lower bandwidth than full dual streams
- Graceful fallback to bubble visualization

### System Flow

```
Text Generation → ElevenLabs TTS → Audio (cached)
                                      ↓
Text + Audio URL → HeyGen SDK → Video with Lip-Sync
                                      ↓
                         Video Display + Audio Playback
```

## Key Components

### Backend

#### 1. Database Schema Extensions
**File:** `server/prisma/schema.prisma`

Added to Agent model:
```prisma
heygenAvatarId String? @map("heygen_avatar_id")
heygenConfig   Json?   @map("heygen_config")
```

#### 2. HeyGen Service
**File:** `server/src/services/heygen.ts`

**Responsibilities:**
- Avatar session creation
- Randomized appearance generation
- Avatar ID mapping

**Key Methods:**
- `createAvatarSession(avatarId)` - Creates streaming session
- `generateRandomAppearance()` - Generates diverse avatar features
- `getOrCreateAvatar(config)` - Maps appearance to HeyGen avatar ID

#### 3. Agent Service Extension
**File:** `server/src/services/agent.ts`

**Changes:**
- Auto-generates HeyGen avatars during agent creation
- Stores randomized appearance config in database
- Falls back gracefully if HeyGen unavailable

#### 4. API Endpoints
**File:** `server/src/routes/heygen.ts`

**Endpoints:**
- `POST /api/heygen/avatar/session` - Create avatar session token
- `GET /api/heygen/avatar/:agentId/config` - Get avatar configuration
- `POST /api/heygen/moderator/session` - Moderator avatar session
- `GET /api/heygen/status` - Check service availability

### Frontend

#### 1. Type Definitions
**File:** `client/src/types/index.ts`

**New Types:**
- `HeygenAvatarAppearance` - Avatar visual attributes
- `HeygenAvatarConfig` - Complete avatar configuration
- `HeygenSessionToken` - Session credentials
- `VideoStreamState` - Video stream status

#### 2. Custom Hooks

**useHeygenAvatar** (`client/src/hooks/useHeygenAvatar.ts`)
- Manages individual avatar lifecycle
- WebRTC stream connection
- Lip-sync triggering
- Error handling

**useVideoStreamManager** (`client/src/hooks/useVideoStreamManager.ts`)
- Multi-stream orchestration
- Recent-speaker pooling (max 3 active)
- Bandwidth optimization

#### 3. UI Components

**AvatarVideoPlayer** (`client/src/components/session/AvatarVideoPlayer.tsx`)
- Individual video player
- Fallback to AnimatedBubble
- Loading states
- Error indicators

**VideoAvatarGrid** (`client/src/components/session/VideoAvatarGrid.tsx`)
- Layout manager for 6+ avatars
- Circular arc positioning
- Active speaker highlighting

#### 4. Avatar Manager
**File:** `client/src/services/avatarManager.ts`

**Purpose:** Global registry for avatar instances

**Methods:**
- `register(agentId, instance)` - Register avatar
- `speak(agentId, text, audioUrl)` - Trigger lip-sync
- `stop(agentId)` - Stop speaking
- `stopAll()` - Emergency stop

#### 5. Conversation Flow Integration
**File:** `client/src/hooks/useConversationFlow.ts`

**Changes:**
- Pre-initializes video streams during audio playback
- Touches active streams to keep them alive
- Triggers HeyGen lip-sync with ElevenLabs audio
- Manages 3-stream pooling strategy

#### 6. State Management
**File:** `client/src/stores/conversationStore.ts`

**New State:**
- `activeVideoStreams: Set<string>` - Active agent IDs
- `videoLoadingStates: Map<string, boolean>` - Loading status
- `videoErrors: Map<string, Error>` - Error tracking

**New Actions:**
- `initializeAvatarVideo(agentId)`
- `destroyAvatarVideo(agentId)`
- `setVideoLoading(agentId, loading)`
- `setVideoError(agentId, error)`

## Configuration

### Environment Variables

**Required:**
```env
# HeyGen API Key
HEYGEN_API_KEY=your_heygen_api_key_here

# Optional: Moderator avatar ID
HEYGEN_MODERATOR_AVATAR_ID=default-moderator-avatar
```

### Avatar Mapping

**File:** `server/src/services/heygen.ts` (line 89)

Map your HeyGen avatar IDs to appearance profiles:

```typescript
const avatarMap: Record<string, Record<string, string>> = {
  male: {
    Asian: 'your-heygen-asian-male-id',
    Caucasian: 'your-heygen-caucasian-male-id',
    // ... more avatars
  },
  female: {
    Asian: 'your-heygen-asian-female-id',
    // ... more avatars
  },
};
```

## Performance Optimizations

### Lazy Stream Initialization
- Streams initialize only when agent is about to speak
- Reduces initial bandwidth usage
- Prevents unnecessary WebRTC connections

### Recent-Speaker Pooling
- Keeps max 3 most recent speakers' streams alive
- Destroys oldest stream when 4th speaker talks
- Balances performance with UX (no re-init delay for frequent speakers)

**Bandwidth Estimate:**
- HeyGen video: ~500-800 Kbps per stream
- 3 active streams: ~1.5-2.4 Mbps total
- ElevenLabs audio: ~128 Kbps
- **Total: ~2-3 Mbps** (acceptable for modern connections)

### Pre-computation Strategy
- Text generation: During previous speaker's audio
- Audio fetching: After text is cached (1s delay)
- Video initialization: Immediately after audio prefetch
- Result: Near-zero perceived latency between speakers

## Fallback Behavior

### Graceful Degradation

The system falls back to bubble visualization when:
1. HeyGen API key not configured
2. Avatar fails to initialize
3. WebRTC connection fails
4. Network issues
5. Device capabilities insufficient

**Fallback Components:**
- `AnimatedBubble` - Colored circular avatar with name
- Loading indicators show during initialization
- Error indicators (red badge) show on failure

## Testing

### Unit Tests
Test these components:
- `HeygenService.generateRandomAppearance()` - Validates randomization
- `useVideoStreamManager` - Pooling logic
- `avatarManager` - Registration and triggering

### Integration Tests
- Avatar initialization flow
- Lip-sync accuracy with ElevenLabs audio
- Stream lifecycle (init, speak, destroy)
- Fallback behavior on errors

### Manual Testing Checklist

1. **Avatar Persistence**
   - [ ] Create participant with 5 agents
   - [ ] Verify each agent has unique randomized appearance
   - [ ] Start new session, verify same avatars appear
   - [ ] Check database: `heygenAvatarId` and `heygenConfig` populated

2. **Video Streaming**
   - [ ] Start conversation session
   - [ ] Verify moderator video initializes
   - [ ] Verify agent videos lazy-load when they speak
   - [ ] Check max 3 concurrent streams
   - [ ] Verify oldest stream destroyed when 4th agent speaks

3. **Lip-Sync Quality**
   - [ ] Agent speaks
   - [ ] Verify lips move in sync with audio
   - [ ] Check no audio-video lag
   - [ ] Test with different speech speeds

4. **Fallback Behavior**
   - [ ] Remove HeyGen API key
   - [ ] Verify bubbles display instead of video
   - [ ] Simulate WebRTC failure
   - [ ] Verify error indicator appears

5. **Performance**
   - [ ] Monitor network usage (should be 2-3 Mbps)
   - [ ] Check CPU usage (video decoding)
   - [ ] Test on low-bandwidth connection
   - [ ] Verify no memory leaks (long session)

## Troubleshooting

### Video Not Showing

**Check:**
1. `HEYGEN_API_KEY` set in `.env`
2. Avatar IDs correctly mapped in `heygen.ts`
3. Browser console for errors
4. Network tab for failed API calls

**Common Issues:**
- Invalid HeyGen API key
- Avatar ID not found
- WebRTC connection blocked by firewall
- Browser doesn't support WebRTC

### Lip-Sync Issues

**Check:**
1. Audio URL passed to `avatarManager.speak()`
2. HeyGen receiving correct audio format
3. Audio playback timing

**Solutions:**
- Ensure audio URL accessible from HeyGen
- Check CORS headers on audio endpoint
- Verify audio format (should be MP3)

### Performance Issues

**Check:**
1. Number of active streams (max should be 3)
2. Video quality setting (`AvatarQuality.Medium`)
3. Network bandwidth

**Solutions:**
- Reduce quality to `AvatarQuality.Low`
- Decrease `MAX_ACTIVE_STREAMS` to 2
- Enable "Low Bandwidth Mode" toggle

### Stream Not Destroying

**Check:**
1. `destroyAvatarVideo()` called in store
2. `avatarManager.unregister()` on unmount
3. WebRTC stream properly closed

**Solutions:**
- Check `useVideoStreamManager` pooling logic
- Verify cleanup in `useHeygenAvatar` hook
- Force cleanup with `avatarManager.stopAll()`

## Future Enhancements

### Planned Improvements

1. **Device Capability Detection**
   - Auto-disable video on low-end devices
   - Adaptive quality based on CPU/GPU

2. **Bandwidth Monitoring**
   - Auto-adjust quality on poor connections
   - "Low Bandwidth Mode" toggle

3. **Avatar Customization UI**
   - Allow admin to customize avatar appearances
   - Preview avatars before assignment

4. **Advanced Lip-Sync**
   - Fine-tune sync accuracy
   - Handle audio speed variations
   - Support HeyGen's built-in TTS as fallback

5. **Cost Optimization**
   - Stream timeout (auto-disconnect after idle)
   - Tiered avatar quality (premium vs standard)
   - Usage analytics and monitoring

## Resources

- [HeyGen Streaming API Docs](https://docs.heygen.com/docs/streaming-api)
- [HeyGen Streaming Avatar SDK](https://docs.heygen.com/docs/streaming-avatar-sdk)
- [ElevenLabs Integration with HeyGen](https://help.heygen.com/en/articles/8310663-how-to-integrate-elevenlabs-other-third-party-voices)
- [WebRTC MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## Support

For issues or questions:
1. Check this documentation
2. Review browser console errors
3. Check HeyGen service status
4. Verify network connectivity
5. Test with fallback (bubbles) working
