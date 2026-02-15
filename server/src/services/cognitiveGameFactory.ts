// Cognitive Game Factory
// Generates different types of cognitive games for dementia patients
import { anthropic, stripMarkdownCodeFences } from './claude';
import { prisma } from '../prisma/client';

// ========================================
// Types
// ========================================

export type GameType = 'memory_recall' | 'pattern_recognition' | 'image_matching';

export interface GameQuestion {
  id: string;
  type: GameType;
  question: string;
  options: string[] | ImageOption[] | PatternOption[];
  correctAnswer: string;
  hint?: string;
  audioUrl?: string;
}

export interface ImageOption {
  id: string;
  imageUrl: string;
  label: string;
}

export interface PatternOption {
  id: string;
  pattern: string[]; // Array of visual elements (emojis or icon names)
  label: string;
}

interface Agent {
  id: string;
  name: string;
  avatarColor: string;
}

interface Turn {
  speakerType: string;
  speakerId: string | null;
  speakerName: string;
  content: string;
}

interface SessionData {
  id: string;
  topic: string | null;
  turns: Turn[];
  agents: Agent[];
}

// ========================================
// Main Factory Function
// ========================================

export const generateCognitiveGame = async (
  sessionId: string,
  gameType: GameType,
  questionCount: number
): Promise<GameQuestion[]> => {
  console.log(`[Cognitive Game Factory] Starting game generation for session ${sessionId}`);
  console.log(`[Cognitive Game Factory] Game type: ${gameType}, Question count: ${questionCount}`);

  // Fetch session with turns and agents
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      turns: {
        orderBy: { sequenceNumber: 'asc' }
      },
      participant: {
        include: {
          agents: true
        }
      }
    }
  });

  if (!session) {
    console.error(`[Cognitive Game Factory] Session ${sessionId} not found`);
    throw new Error(`Session ${sessionId} not found`);
  }

  console.log(`[Cognitive Game Factory] Session found: ${session.id}`);
  console.log(`[Cognitive Game Factory] Turn count: ${session.turns.length}`);
  console.log(`[Cognitive Game Factory] Participant: ${session.participant.name}`);
  console.log(`[Cognitive Game Factory] Agent count: ${session.participant.agents.length}`);

  // Get agents from participant
  const agents = session.participant.agents;

  if (!agents || agents.length === 0) {
    console.error(`[Cognitive Game Factory] No agents found for participant ${session.participant.id}`);
    throw new Error('No agents available for game generation. Please ensure agents were created for this session.');
  }

  const sessionData: SessionData = {
    id: session.id,
    topic: session.topic,
    turns: session.turns,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      avatarColor: a.avatarColor
    }))
  };

  // Route to appropriate generator
  switch (gameType) {
    case 'memory_recall':
      return generateMemoryRecallQuestions(sessionData, questionCount);
    case 'pattern_recognition':
      return generatePatternRecognitionQuestions(sessionData, questionCount);
    case 'image_matching':
      return generateImageMatchingQuestions(sessionData, questionCount);
    default:
      throw new Error(`Unknown game type: ${gameType}`);
  }
};

// ========================================
// Game Type Generators
// ========================================

/**
 * Memory Recall Game: "Let's Remember Together"
 * Questions about who said what and what was discussed
 */
async function generateMemoryRecallQuestions(
  session: SessionData,
  count: number
): Promise<GameQuestion[]> {
  // Use last 10 turns for context
  const recentTurns = session.turns.slice(-10);

  // Build conversation summary
  const conversationSummary = recentTurns
    .map(t => `${t.speakerName}: ${t.content}`)
    .join('\n');

  // Get agent names for options
  const agentNames = session.agents.map(a => a.name);

  const prompt = `You are generating ${count} simple memory questions for a dementia patient who just finished a group conversation.

CONVERSATION CONTEXT:
Topic: ${session.topic || 'General conversation'}
Participants: ${agentNames.join(', ')}

RECENT CONVERSATION (last 10 turns):
${conversationSummary}

TASK:
Generate exactly ${count} questions for a memory game. Use these types:
- Attribution questions (${Math.ceil(count * 0.67)} questions): "Who talked about [specific memorable thing from conversation]?"
- Content recall questions (${Math.floor(count * 0.33)} questions): "What did we talk about today?"

REQUIREMENTS:
1. Use simple, warm language ("Who talked about..." not "Which participant...")
2. Questions MUST reference ACTUAL content from the conversation above
3. For attribution questions:
   - Provide 3 answer options: the correct agent name + 2 other agent names from the list
   - Make sure the correct answer actually said something related to the question
4. For content recall questions:
   - Provide 3-4 options including the actual topic discussed
5. Make questions feel celebratory, not like a test
6. Include a gentle hint for each question

RESPONSE FORMAT (JSON only, no markdown):
{
  "questions": [
    {
      "questionType": "attribution",
      "question": "Who shared a story about their favorite recipe?",
      "correctAnswer": "Margaret",
      "options": ["Margaret", "Robert", "Susan"],
      "hint": "This person loves baking pies"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    // Parse JSON response
    const cleanedText = stripMarkdownCodeFences(content.text);
    const data = JSON.parse(cleanedText);

    // Transform to GameQuestion format
    const questions: GameQuestion[] = data.questions.map((q: any, idx: number) => ({
      id: `memory_recall_${idx + 1}`,
      type: 'memory_recall' as GameType,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      hint: q.hint
    }));

    return questions.slice(0, count); // Ensure we return exactly the requested count
  } catch (error) {
    console.error('[Cognitive Game] Failed to generate memory recall questions:', error);

    // Fallback: Return generic questions
    return generateFallbackMemoryQuestions(session, count);
  }
}

/**
 * Pattern Recognition Game: "Find the Pattern"
 * Visual patterns based on conversation themes
 */
async function generatePatternRecognitionQuestions(
  session: SessionData,
  count: number
): Promise<GameQuestion[]> {
  // Extract conversation themes
  const conversationText = session.turns.slice(-10)
    .map(t => t.content)
    .join(' ');

  const prompt = `Based on this conversation about "${session.topic}", create ${count} simple visual pattern recognition questions suitable for dementia patients.

CONVERSATION SNIPPET:
${conversationText.substring(0, 500)}...

Create patterns using emojis related to the conversation theme. Each pattern should have 3-4 elements with one missing.

RESPONSE FORMAT (JSON only):
{
  "questions": [
    {
      "question": "Which emoji completes this pattern?",
      "pattern": ["🌻", "🌻", "🌷", "?"],
      "options": [
        {"label": "Sunflower", "pattern": ["🌻"]},
        {"label": "Rose", "pattern": ["🌹"]},
        {"label": "Tulip", "pattern": ["🌷"]}
      ],
      "correctAnswer": "Sunflower",
      "hint": "Look at what comes before the tulip"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const cleanedText = stripMarkdownCodeFences(content.text);
    const data = JSON.parse(cleanedText);

    const questions: GameQuestion[] = data.questions.map((q: any, idx: number) => ({
      id: `pattern_${idx + 1}`,
      type: 'pattern_recognition' as GameType,
      question: q.question,
      options: q.options.map((opt: any, optIdx: number) => ({
        id: `opt_${optIdx}`,
        pattern: opt.pattern,
        label: opt.label
      })),
      correctAnswer: q.correctAnswer,
      hint: q.hint
    }));

    return questions.slice(0, count);
  } catch (error) {
    console.error('[Cognitive Game] Failed to generate pattern questions:', error);
    return generateFallbackPatternQuestions(count);
  }
}

/**
 * Word Association Game: "Connect the Words"
 * Match words to conversation topics
 */
async function generateWordAssociationQuestions(
  session: SessionData,
  count: number
): Promise<GameQuestion[]> {
  const conversationText = session.turns.slice(-10)
    .map(t => `${t.speakerName}: ${t.content}`)
    .join('\n');

  const prompt = `Generate ${count} simple word association questions for a dementia patient based on this conversation.

CONVERSATION:
${conversationText}

TOPIC: ${session.topic || 'General conversation'}

Create questions that ask which word relates to something discussed. Use simple, common words (5-7 letters max).

RESPONSE FORMAT (JSON only):
{
  "questions": [
    {
      "question": "Which word goes with what Robert talked about?",
      "options": ["GARDEN", "OCEAN", "CITY"],
      "correctAnswer": "GARDEN",
      "hint": "Robert mentioned growing tomatoes"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const cleanedText = stripMarkdownCodeFences(content.text);
    const data = JSON.parse(cleanedText);

    const questions: GameQuestion[] = data.questions.map((q: any, idx: number) => ({
      id: `word_${idx + 1}`,
      type: 'word_association' as GameType,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      hint: q.hint
    }));

    return questions.slice(0, count);
  } catch (error) {
    console.error('[Cognitive Game] Failed to generate word association questions:', error);
    return generateFallbackWordQuestions(session, count);
  }
}

/**
 * Image Matching Game: "Picture This"
 * Match images to conversation topics
 * Using Unsplash placeholder images for now
 */
async function generateImageMatchingQuestions(
  session: SessionData,
  count: number
): Promise<GameQuestion[]> {
  // Map conversation topic to image category
  const topic = session.topic?.toLowerCase() || '';
  let category = 'family'; // default

  if (topic.includes('food') || topic.includes('cooking') || topic.includes('recipe')) {
    category = 'food';
  } else if (topic.includes('garden') || topic.includes('nature') || topic.includes('plant')) {
    category = 'nature';
  } else if (topic.includes('hobby') || topic.includes('craft') || topic.includes('knit')) {
    category = 'hobbies';
  } else if (topic.includes('travel') || topic.includes('place') || topic.includes('vacation')) {
    category = 'travel';
  }

  // Define image library with Unsplash search terms
  const imageLibrary: Record<string, Array<{ term: string; label: string }>> = {
    food: [
      { term: 'kitchen-cooking', label: 'Kitchen' },
      { term: 'baking-cookies', label: 'Baking' },
      { term: 'family-dinner', label: 'Dinner Table' },
      { term: 'recipe-book', label: 'Recipe Book' }
    ],
    family: [
      { term: 'family-gathering', label: 'Family Gathering' },
      { term: 'board-games', label: 'Playing Games' },
      { term: 'photo-album', label: 'Photo Album' }
    ],
    nature: [
      { term: 'garden-flowers', label: 'Garden' },
      { term: 'park-bench', label: 'Park' },
      { term: 'colorful-flowers', label: 'Flowers' },
      { term: 'green-trees', label: 'Trees' }
    ],
    hobbies: [
      { term: 'knitting-yarn', label: 'Knitting' },
      { term: 'painting-art', label: 'Painting' },
      { term: 'reading-book', label: 'Reading' },
      { term: 'jigsaw-puzzle', label: 'Puzzles' }
    ],
    travel: [
      { term: 'beach-ocean', label: 'Beach' },
      { term: 'mountains-landscape', label: 'Mountains' },
      { term: 'city-skyline', label: 'City' },
      { term: 'countryside-farm', label: 'Countryside' }
    ]
  };

  const availableImages = imageLibrary[category] || imageLibrary['family'];

  // Generate questions
  const questions: GameQuestion[] = [];
  for (let i = 0; i < count; i++) {
    // Pick a correct image
    const correctImage = availableImages[i % availableImages.length];

    // Pick 2 distractor images from other categories
    const otherCategories = Object.keys(imageLibrary).filter(c => c !== category);
    const distractorCategory1 = otherCategories[Math.floor(Math.random() * otherCategories.length)];
    const distractorCategory2 = otherCategories.filter(c => c !== distractorCategory1)[0] || distractorCategory1;

    const distractor1 = imageLibrary[distractorCategory1][0];
    const distractor2 = imageLibrary[distractorCategory2][0];

    // Shuffle options - using Picsum Photos for reliable placeholder images
    // Each image gets a unique seed based on the term to ensure consistency
    const getImageSeed = (term: string) => {
      let hash = 0;
      for (let i = 0; i < term.length; i++) {
        hash = ((hash << 5) - hash) + term.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const options = [
      {
        id: 'opt_1',
        imageUrl: `https://picsum.photos/seed/${getImageSeed(correctImage.term)}/400/300`,
        label: correctImage.label
      },
      {
        id: 'opt_2',
        imageUrl: `https://picsum.photos/seed/${getImageSeed(distractor1.term)}/400/300`,
        label: distractor1.label
      },
      {
        id: 'opt_3',
        imageUrl: `https://picsum.photos/seed/${getImageSeed(distractor2.term)}/400/300`,
        label: distractor2.label
      }
    ].sort(() => Math.random() - 0.5); // Randomize order

    questions.push({
      id: `image_${i + 1}`,
      type: 'image_matching',
      question: `We talked about ${session.topic || 'something special'} today. Which image matches what we discussed?`,
      options,
      correctAnswer: correctImage.label,
      hint: `Think about the main topic we discussed`
    });
  }

  return questions;
}

// ========================================
// Helper Functions
// ========================================

function formatImageLabel(imageName: string): string {
  return imageName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Fallback questions for Memory Recall if Claude API fails
 */
function generateFallbackMemoryQuestions(session: SessionData, count: number): GameQuestion[] {
  const questions: GameQuestion[] = [];

  if (session.agents.length >= 3) {
    questions.push({
      id: 'memory_fallback_1',
      type: 'memory_recall',
      question: `What did we talk about today?`,
      options: [session.topic || 'Conversation', 'Weather', 'Sports'],
      correctAnswer: session.topic || 'Conversation',
      hint: 'Think about our main topic'
    });
  }

  // Pad with generic questions if needed
  while (questions.length < count) {
    questions.push({
      id: `memory_fallback_${questions.length + 1}`,
      type: 'memory_recall',
      question: 'Who participated in our conversation today?',
      options: session.agents.map(a => a.name).slice(0, 3),
      correctAnswer: session.agents[0]?.name || 'Everyone',
      hint: 'Think about the people we talked with'
    });
  }

  return questions.slice(0, count);
}

/**
 * Fallback questions for Pattern Recognition
 */
function generateFallbackPatternQuestions(count: number): GameQuestion[] {
  const questions: GameQuestion[] = [
    {
      id: 'pattern_fallback_1',
      type: 'pattern_recognition',
      question: 'Which shape completes this pattern?',
      options: [
        { id: 'opt_1', pattern: ['⭐'], label: 'Star' },
        { id: 'opt_2', pattern: ['❤️'], label: 'Heart' },
        { id: 'opt_3', pattern: ['⭐'], label: 'Star' }
      ],
      correctAnswer: 'Star',
      hint: 'Look at what comes before'
    }
  ];

  return questions.slice(0, count);
}

/**
 * Fallback questions for Word Association
 */
function generateFallbackWordQuestions(session: SessionData, count: number): GameQuestion[] {
  const questions: GameQuestion[] = [
    {
      id: 'word_fallback_1',
      type: 'word_association',
      question: `Which word relates to our conversation about ${session.topic || 'today'}?`,
      options: ['FRIENDS', 'TALKING', 'SHARING'],
      correctAnswer: 'TALKING',
      hint: 'We were having a conversation'
    }
  ];

  return questions.slice(0, count);
}
