// Script to list public/streaming avatars available in HeyGen
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

async function listPublicAvatars() {
  if (!HEYGEN_API_KEY) {
    console.error('❌ HEYGEN_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('🔍 Fetching public/streaming HeyGen avatars...\n');

  try {
    // Try to get streaming avatars list
    const response = await axios.get('https://api.heygen.com/v1/streaming.list', {
      headers: {
        'x-api-key': HEYGEN_API_KEY,
      },
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));

    const avatars = response.data.data?.avatars || [];

    if (avatars.length === 0) {
      console.log('\n📝 No streaming avatars found. Trying to create a test session...\n');

      // Try creating a session with a known public avatar ID
      const testAvatarIds = [
        'Kristin_public_3_20240108',
        'josh_lite3_20230714',
        'default',
        'Wayne_20240711',
        'Angela-inblackskirt-20220820'
      ];

      for (const avatarId of testAvatarIds) {
        try {
          console.log(`Testing avatar ID: ${avatarId}...`);
          const sessionResponse = await axios.post(
            'https://api.heygen.com/v1/streaming.new',
            {
              avatar_id: avatarId,
              quality: 'low',
            },
            {
              headers: {
                'x-api-key': HEYGEN_API_KEY,
                'Content-Type': 'application/json',
              },
            }
          );

          if (sessionResponse.data.data) {
            console.log(`✅ Avatar ID "${avatarId}" works!`);
          }
        } catch (err: any) {
          console.log(`❌ Avatar ID "${avatarId}" failed: ${err.response?.data?.message || err.message}`);
        }
      }
    } else {
      console.log(`✅ Found ${avatars.length} streaming avatar(s):\n`);
      avatars.forEach((avatar: any, index: number) => {
        console.log(`${index + 1}. ${avatar.avatar_id || avatar.id} - ${avatar.name || 'N/A'}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);

    console.log('\n💡 Alternative approach:');
    console.log('Visit HeyGen documentation to find public avatar IDs:');
    console.log('https://docs.heygen.com/reference/list-avatars-v2\n');
  }
}

listPublicAvatars();
