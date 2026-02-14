// Global manager for HeyGen avatar instances
// Allows conversation flow to trigger avatar speech without tight coupling

interface AvatarInstance {
  agentId: string;
  speak: (text: string, audioUrl?: string) => Promise<void>;
  stop: () => Promise<void>;
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
   * Make an avatar speak with lip-sync
   */
  async speak(agentId: string, text: string, audioUrl?: string): Promise<void> {
    const avatar = this.avatars.get(agentId);
    if (!avatar) {
      console.warn(`[Avatar Manager] Avatar ${agentId} not registered, skipping video speech`);
      return;
    }

    try {
      console.log(`[Avatar Manager] Triggering speech for avatar ${agentId}`);
      await avatar.speak(text, audioUrl);
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
