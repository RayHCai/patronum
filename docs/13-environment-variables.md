## 13. Environment Variables

```env
# .env
PORT=3001
CLIENT_PORT=5173
NODE_ENV=development

# Database - PostgreSQL via Prisma
DATABASE_URL="postgresql://username:password@localhost:5432/cst_dementia?schema=public"

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_change_this
JWT_REFRESH_EXPIRES_IN=30d

# Two-Factor Authentication (optional)
TOTP_SECRET=your_totp_secret_for_2fa

# Claude API
ANTHROPIC_API_KEY=

# 11Labs
ELEVENLABS_API_KEY=

# Voice IDs (pre-selected distinct voices from 11Labs)
VOICE_MODERATOR=21m00Tcm4TlvDq8ikWAM      # Rachel (warm, clear)
VOICE_AGENT_1=EXAVITQu4vr4xnSDxMaL         # Bella (older female)
VOICE_AGENT_2=ErXwobaYiN019PkySvjV          # Antoni (older male)
VOICE_AGENT_3=MF3mGyEYCl7XYWbV9V6O          # Elli (female, different)
VOICE_AGENT_4=TxGEqnHWrfWFTfGW9XjX          # Josh (male, different)
VOICE_AGENT_5=VR6AewLTigWG4xSOukaG          # Arnold (male, distinct)

# File Storage - Choose one
STORAGE_TYPE=local  # 'local' or 's3'

# Local Storage
LOCAL_STORAGE_PATH=./uploads

# AWS S3 (if using S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=cst-dementia-audio

# Optional: OpenAI for Whisper fallback
OPENAI_API_KEY=

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

