// Script to list available HeyGen avatars from your account
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE_URL = 'https://api.heygen.com/v1';

async function listHeygenAvatars() {
  if (!HEYGEN_API_KEY) {
    console.error('❌ HEYGEN_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('🔍 Fetching available HeyGen avatars...');
  console.log(`🔑 API Key present: ${HEYGEN_API_KEY.substring(0, 10)}...${HEYGEN_API_KEY.substring(HEYGEN_API_KEY.length - 4)}`);
  console.log(`📂 .env file loaded from: ${path.join(__dirname, '../../.env')}\n`);

  try {
    // Try multiple possible endpoints
    let response: any;
    let avatars: any[] = [];
    let successfulEndpoint = '';

    try {
      // Try v2/avatars.list endpoint
      const endpoint = 'https://api.heygen.com/v2/avatars.list';
      console.log(`🌐 Attempting endpoint 1: ${endpoint}`);

      response = await axios.get(endpoint, {
        headers: {
          'x-api-key': HEYGEN_API_KEY,
        },
      });

      console.log(`✅ Endpoint 1 SUCCESS - Status: ${response.status}`);
      console.log(`📦 Raw response data:`, JSON.stringify(response.data, null, 2));

      avatars = response.data.data?.avatars || response.data.avatars || [];
      successfulEndpoint = endpoint;
      console.log(`📊 Parsed ${avatars.length} avatars from response\n`);

    } catch (err: any) {
      console.log(`❌ Endpoint 1 FAILED - Status: ${err.response?.status || 'N/A'}`);
      console.log(`   Error: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      console.log('');

      // Try v1/avatar.list
      try {
        const endpoint = `${HEYGEN_BASE_URL}/avatar.list`;
        console.log(`🌐 Attempting endpoint 2: ${endpoint}`);

        response = await axios.get(endpoint, {
          headers: {
            'x-api-key': HEYGEN_API_KEY,
          },
        });

        console.log(`✅ Endpoint 2 SUCCESS - Status: ${response.status}`);
        console.log(`📦 Raw response data:`, JSON.stringify(response.data, null, 2));

        avatars = response.data.data?.avatars || response.data.avatars || [];
        successfulEndpoint = endpoint;
        console.log(`📊 Parsed ${avatars.length} avatars from response\n`);

      } catch (err2: any) {
        console.log(`❌ Endpoint 2 FAILED - Status: ${err2.response?.status || 'N/A'}`);
        console.log(`   Error: ${err2.response?.data ? JSON.stringify(err2.response.data) : err2.message}`);
        console.log('');

        // Try streaming avatars endpoint
        const endpoint = `${HEYGEN_BASE_URL}/streaming.list`;
        console.log(`🌐 Attempting endpoint 3: ${endpoint}`);

        response = await axios.get(endpoint, {
          headers: {
            'x-api-key': HEYGEN_API_KEY,
          },
        });

        console.log(`✅ Endpoint 3 SUCCESS - Status: ${response.status}`);
        console.log(`📦 Raw response data:`, JSON.stringify(response.data, null, 2));

        avatars = response.data.data?.avatars || response.data.avatars || [];
        successfulEndpoint = endpoint;
        console.log(`📊 Parsed ${avatars.length} avatars from response\n`);
      }
    }

    if (successfulEndpoint) {
      console.log(`🎯 Successful endpoint: ${successfulEndpoint}\n`);
    }

    if (avatars.length === 0) {
      console.log('⚠️  No avatars found in your HeyGen account');
      console.log('\nPlease:');
      console.log('1. Log in to https://app.heygen.com/');
      console.log('2. Navigate to "Avatars" section');
      console.log('3. Create or purchase avatars');
      console.log('4. Run this script again\n');
      return;
    }

    console.log(`✅ Found ${avatars.length} avatar(s):\n`);
    console.log('─'.repeat(80));

    avatars.forEach((avatar: any, index: number) => {
      console.log(`\n${index + 1}. Avatar ID: ${avatar.avatar_id || avatar.id}`);
      console.log(`   Name: ${avatar.avatar_name || avatar.name || 'N/A'}`);
      console.log(`   Gender: ${avatar.gender || 'N/A'}`);
      console.log(`   Preview: ${avatar.preview_image_url || avatar.preview_url || 'N/A'}`);

      if (avatar.tags && avatar.tags.length > 0) {
        console.log(`   Tags: ${avatar.tags.join(', ')}`);
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n📝 Next steps:');
    console.log('1. Copy the avatar IDs you want to use');
    console.log('2. Update the avatarMap in server/src/services/heygen.ts');
    console.log('3. Map each avatar ID to the appropriate gender/ethnicity combination\n');

    // Generate template mapping
    console.log('💡 Example mapping template:');
    console.log('\nconst avatarMap: Record<string, Record<string, string>> = {');
    console.log('  male: {');
    console.log(`    Asian: '${avatars[0]?.avatar_id || avatars[0]?.id || 'your-avatar-id-here'}',`);
    console.log(`    Caucasian: 'your-avatar-id-here',`);
    console.log('    // ... add more');
    console.log('  },');
    console.log('  female: {');
    console.log(`    Asian: 'your-avatar-id-here',`);
    console.log('    // ... add more');
    console.log('  },');
    console.log('};\n');

  } catch (error: any) {
    console.error('❌ Error fetching avatars:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Please check:');
      console.log('1. Your HEYGEN_API_KEY in .env is correct');
      console.log('2. The API key has not expired');
      console.log('3. You have access to the HeyGen API\n');
    }
  }
}

listHeygenAvatars();
