// Global manager for HeyGen avatar instances
// Allows conversation flow to trigger avatar speech without tight coupling
// HYBRID APPROACH: Uses 11Labs TTS + HeyGen lip-sync for best quality

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AvatarInstance {
  agentId: string;
  speak: (text: string, audioUrl?: string) => Promise<void>;
  stop: () => Promise<void>;
  voiceId?: string; // ElevenLabs voice ID for this avatar
}

class AvatarManager {
  private avatars: Map<string, AvatarInstance> = new Map();

  /**
   * Register an avatar instance
   */
  register(agentId: string, instance: AvatarInstance) {
    console.log(`[Avatar Manager] Registered avatar ${agentId}`);
    this.avatars.set(agentId, instance);
  }

  /**
   * Unregister an avatar instance
   */
  unregister(agentId: string) {
    console.log(`[Avatar Manager] Unregistered avatar ${agentId}`);
    this.avatars.delete(agentId);
  }

  /**
   * Make an avatar speak with HYBRID approach (11Labs voice + HeyGen lip-sync)
   * If voiceId is provided, generates 11Labs audio first
   * Otherwise falls back to HeyGen's built-in TTS
   */
  async speak(agentId: string, text: string, voiceId?: string, audioUrl?: string): Promise<void> {
    const avatar = this.avatars.get(agentId);
    if (!avatar) {
      console.warn(`[Avatar Manager] Avatar ${agentId} not registered, skipping video speech`);
      return;
    }

    try {
      // If audioUrl is already provided, use it directly
      if (audioUrl) {
        console.log(`[Avatar Manager] Using provided audio URL for ${agentId}`);
        await avatar.speak(text, audioUrl);
        return;
      }

      // If voiceId is provided, generate 11Labs audio (HYBRID APPROACH)
      const effectiveVoiceId = voiceId || avatar.voiceId;

      if (effectiveVoiceId) {
        console.log(`[Avatar Manager] 🎙️ Generating 11Labs audio for ${agentId} (voiceId: ${effectiveVoiceId})`);

        try {
          const response = await fetch(`${API_URL}/api/audio/generate-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              voiceId: effectiveVoiceId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const generatedAudioUrl = data.data.audioUrl;
            console.log(`[Avatar Manager] ✅ 11Labs audio generated, syncing with HeyGen`);
            await avatar.speak(text, generatedAudioUrl);
            return;
          } else {
            console.warn(`[Avatar Manager] Failed to generate 11Labs audio, falling back to HeyGen TTS`);
          }
        } catch (audioError) {
          console.warn(`[Avatar Manager] Error generating 11Labs audio, falling back to HeyGen TTS:`, audioError);
        }
      }

      // Fallback: Use HeyGen's built-in TTS
      console.log(`[Avatar Manager] Using HeyGen built-in TTS for ${agentId}`);
      await avatar.speak(text);

    } catch (error) {
      console.error(`[Avatar Manager] Failed to trigger speech for ${agentId}:`, error);
    }
  }

  /**
   * Stop an avatar from speaking
   */
  async stop(agentId: string): Promise<void> {
    const avatar = this.avatars.get(agentId);
    if (!avatar) {
      return;
    }

    try {
      await avatar.stop();
    } catch (error) {
      console.error(`[Avatar Manager] Failed to stop avatar ${agentId}:`, error);
    }
  }

  /**
   * Stop all avatars
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.avatars.values()).map((avatar) =>
      avatar.stop().catch(console.error)
    );
    await Promise.all(stopPromises);
  }

  /**
   * Check if avatar is registered
   */
  has(agentId: string): boolean {
    return this.avatars.has(agentId);
  }

  /**
   * Get number of registered avatars
   */
  get count(): number {
    return this.avatars.size;
  }
}

// Singleton instance
export const avatarManager = new AvatarManager();
