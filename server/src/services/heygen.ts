// HeyGen API integration service
import axios, { AxiosInstance } from 'axios';

export interface HeygenAvatarAppearance {
  gender: 'male' | 'female';
  ethnicity: string;
  age: number;
  clothing: string;
  background: string;
}

export interface HeygenAvatarConfig {
  avatarId: string;
  appearance: HeygenAvatarAppearance;
  createdAt: string;
  lastUsed: string;
}

export interface HeygenSessionToken {
  token: string;
  url: string;
  expiresAt: number;
}

/**
 * HeyGen API Service
 * Handles avatar creation, session management, and randomization
 */
export class HeygenService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.heygen.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HEYGEN_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[HeyGen] API key not configured. HeyGen features will be disabled.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Create a new avatar session for streaming
   * Returns session token and WebRTC connection URL
   */
  async createAvatarSession(avatarId: string): Promise<HeygenSessionToken> {
    try {
      const response = await this.client.post('/streaming.new', {
        avatar_id: avatarId,
        quality: 'medium', // low | medium | high
        voice: {
          provider: 'elevenlabs', // We'll use ElevenLabs for voice
          rate: 1.0,
        },
      });

      const { session_id, ice_servers, sdp } = response.data.data;

      return {
        token: session_id,
        url: sdp,
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
      };
    } catch (error) {
      console.error('[HeyGen] Failed to create avatar session:', error);
      throw new Error('Failed to create HeyGen avatar session');
    }
  }

  /**
   * Get or create an avatar with custom appearance
   * In production, this would call HeyGen's avatar creation API
   * For now, we'll use pre-configured avatar IDs
   */
  async getOrCreateAvatar(config: Partial<HeygenAvatarConfig>): Promise<string> {
    // NOTE: HeyGen's actual avatar creation API requires different endpoints
    // and may have specific appearance customization options.
    // For MVP, we'll use pre-configured HeyGen avatars and map them to appearance profiles

    const avatarId = this.selectAvatarIdByAppearance(config.appearance);

    return avatarId;
  }

  /**
   * Select a pre-configured HeyGen avatar ID based on appearance
   * This maps our randomized appearance to actual HeyGen avatar IDs
   *
   * NOTE: Using public HeyGen avatars. For production, consider:
   * 1. Creating custom avatars in your HeyGen account
   * 2. Mapping each to specific gender/ethnicity combinations
   * 3. Replacing these IDs with your custom avatar IDs
   */
  private selectAvatarIdByAppearance(appearance?: HeygenAvatarAppearance): string {
    if (!appearance) {
      // Return default avatar if no appearance specified
      return 'default';
    }

    // Map gender and ethnicity to public HeyGen avatar IDs
    // These are real, working avatar IDs from HeyGen's public library
    const avatarMap: Record<string, Record<string, string>> = {
      male: {
        Asian: 'josh_lite3_20230714',
        Caucasian: 'Wayne_20240711',
        African: 'josh_lite3_20230714',
        Hispanic: 'Wayne_20240711',
        'Middle Eastern': 'josh_lite3_20230714',
      },
      female: {
        Asian: 'Angela-inblackskirt-20220820',
        Caucasian: 'Angela-inblackskirt-20220820',
        African: 'Angela-inblackskirt-20220820',
        Hispanic: 'Angela-inblackskirt-20220820',
        'Middle Eastern': 'Angela-inblackskirt-20220820',
      },
    };

    const genderMap = avatarMap[appearance.gender];
    if (!genderMap) {
      return 'default';
    }

    return genderMap[appearance.ethnicity] || 'default';
  }

  /**
   * Generate randomized avatar appearance
   * Creates diverse, realistic appearance profiles
   */
  generateRandomAppearance(): HeygenAvatarAppearance {
    const genders: Array<'male' | 'female'> = ['male', 'female'];
    const ethnicities = [
      'Asian',
      'Caucasian',
      'African',
      'Hispanic',
      'Middle Eastern',
    ];
    const clothingOptions = [
      'casual sweater',
      'professional blazer',
      'comfortable cardigan',
      'polo shirt',
      'dress shirt',
      'casual button-up',
      'knit sweater',
      'casual jacket',
    ];
    const backgrounds = [
      'home office',
      'living room',
      'cozy den',
      'library',
      'sunlit room',
      'warm interior',
    ];

    // Random selections
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const ethnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];
    const age = Math.floor(Math.random() * (75 - 60 + 1)) + 60; // 60-75 years old
    const clothing = clothingOptions[Math.floor(Math.random() * clothingOptions.length)];
    const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];

    return {
      gender,
      ethnicity,
      age,
      clothing,
      background,
    };
  }

  /**
   * Check if HeyGen service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instance
let heygenServiceInstance: HeygenService | null = null;

/**
 * Get or create HeyGen service instance
 */
export function getHeygenService(): HeygenService {
  if (!heygenServiceInstance) {
    heygenServiceInstance = new HeygenService();
  }
  return heygenServiceInstance;
}

// Export default instance
export default getHeygenService();
