## 2. Database Schema (Prisma with PostgreSQL)

```prisma
// server/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Admin {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String    @map("password_hash")
  name           String
  role           String    @default("clinician") // clinician | administrator
  twoFactorEnabled Boolean @default(false) @map("two_factor_enabled")
  createdAt      DateTime  @default(now()) @map("created_at")
  lastLoginAt    DateTime? @map("last_login_at")

  @@map("admins")
}

model PatientUser {
  id             String    @id @default(cuid())
  email          String?   @unique
  passwordHash   String?   @map("password_hash")
  participantId  String    @unique @map("participant_id")
  lastLoginAt    DateTime? @map("last_login_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@map("patient_users")
}

model Participant {
  id        String   @id @default(cuid())
  name      String
  notes     String?
  photoUrl  String?  @map("photo_url")
  dateOfBirth DateTime? @map("date_of_birth")
  caregiver  Json?    // { name, email, phone, relationship }
  isActive   Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  patientUser         PatientUser?
  agents              Agent[]
  sessions            Session[]
  reinforcementItems  ReinforcementItem[]
  sessionAnalytics    SessionAnalytics[]

  @@map("participants")
}

model Agent {
  id            String   @id @default(cuid())
  participantId String   @map("participant_id")
  name          String
  age           Int?
  background    Json     // occupation, family, hometown, etc.
  personality   Json     // traits, speaking style, quirks
  avatarColor   String   @map("avatar_color")
  voiceId       String   @map("voice_id")
  createdAt     DateTime @default(now()) @map("created_at")

  participant Participant     @relation(fields: [participantId], references: [id], onDelete: Cascade)
  memories    AgentMemory[]

  @@index([participantId])
  @@map("agents")
}

model Session {
  id                String    @id @default(cuid())
  participantId     String    @map("participant_id")
  topic             String?
  status            String    @default("active") // active | completed | cancelled
  fullAudioUrl      String?   @map("full_audio_url") // Complete session audio recording
  conversationGraph Json?     @map("conversation_graph") // Graph data for visualization
  aiSummary         String?   @map("ai_summary") // AI-generated session summary
  startedAt         DateTime  @default(now()) @map("started_at")
  endedAt           DateTime? @map("ended_at")

  participant          Participant           @relation(fields: [participantId], references: [id], onDelete: Cascade)
  turns                Turn[]
  agentMemories        AgentMemory[]
  reinforcementItems   ReinforcementItem[]
  sessionAnalytics     SessionAnalytics[]

  @@map("sessions")
}

model Turn {
  id             Int      @id @default(autoincrement())
  sessionId      String   @map("session_id")
  speakerType    String   @map("speaker_type") // 'participant' | 'agent' | 'moderator'
  speakerId      String?  @map("speaker_id")   // agent.id or NULL for participant/moderator
  speakerName    String   @map("speaker_name")
  content        String
  audioUrl       String?  @map("audio_url")
  timestamp      DateTime @default(now())
  sequenceNumber Int      @map("sequence_number")

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@map("turns")
}

model AgentMemory {
  id         Int      @id @default(autoincrement())
  agentId    String   @map("agent_id")
  sessionId  String   @map("session_id")
  memoryType String   @map("memory_type") // 'shared_story' | 'opinion' | 'preference' | 'event'
  content    String
  keywords   Json?    // JSON array for retrieval
  createdAt  DateTime @default(now()) @map("created_at")

  agent   Agent   @relation(fields: [agentId], references: [id], onDelete: Cascade)
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([agentId])
  @@map("agent_memories")
}

model ReinforcementItem {
  id                Int       @id @default(autoincrement())
  sessionId         String    @map("session_id")
  participantId     String    @map("participant_id")
  promptType        String    @map("prompt_type") // 'attribution' | 'comparison' | 'recall'
  question          String
  correctAnswer     String    @map("correct_answer")
  options           Json?     // JSON array for recognition prompts
  hint              String?
  participantAnswer String?   @map("participant_answer")
  wasCorrect        Boolean?  @map("was_correct")
  answeredAt        DateTime? @map("answered_at")
  nextReviewAt      DateTime? @map("next_review_at")
  reviewCount       Int       @default(0) @map("review_count")
  easeFactor        Float     @default(2.5) @map("ease_factor") // SM-2 spaced repetition

  session     Session     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId])
  @@map("reinforcement_items")
}

model SessionAnalytics {
  id                    Int      @id @default(autoincrement())
  sessionId             String   @map("session_id")
  participantId         String   @map("participant_id")
  turnCount             Int?     @map("turn_count")
  participantTurnCount  Int?     @map("participant_turn_count")
  avgTurnLength         Float?   @map("avg_turn_length")
  lexicalDiversity      Float?   @map("lexical_diversity") // type-token ratio
  topicCoherenceScore   Float?   @map("topic_coherence_score")
  repeatedPhrases       Json?    @map("repeated_phrases") // JSON array
  repeatedStories       Json?    @map("repeated_stories") // JSON array
  computedAt            DateTime @default(now()) @map("computed_at")

  session     Session     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId])
  @@map("session_analytics")
}
```

### Prisma Client Setup

```typescript
// server/src/prisma/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Usage in services:
// import { prisma } from './prisma/client';
// const participants = await prisma.participant.findMany();
```

**Key Prisma Commands:**
- `npx prisma migrate dev --name init` — Create and apply initial migration
- `npx prisma generate` — Generate Prisma Client after schema changes
- `npx prisma studio` — Open Prisma Studio for database browsing
- `npx prisma db seed` — Seed database (optional)

---

