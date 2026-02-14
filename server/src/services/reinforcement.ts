// Reinforcement service - Generate quiz questions for memory retention
import { prisma } from '../prisma/client';
import { GenerateReinforcementDTO, ReinforcementPrompt } from '../types';

// Mock reinforcement generation (will use Claude API in production)
const generateReinforcementPrompts = async (
  conversationSummary: string,
  keyMoments: string[],
  count: number = 5
): Promise<ReinforcementPrompt[]> => {
  // In production, this would use Claude API to generate personalized questions
  // For now, return mock questions based on common CST patterns

  const prompts: ReinforcementPrompt[] = [
    {
      promptType: 'recall',
      question: 'What was the main topic we discussed today?',
      correctAnswer: conversationSummary.split(' ').slice(0, 10).join(' '),
      hint: 'Think about what everyone was talking about',
    },
    {
      promptType: 'attribution',
      question: 'Who shared a story about cooking?',
      correctAnswer: 'Mary',
      options: ['Mary', 'Robert', 'Susan', 'James'],
      hint: 'This person loves to share recipes',
    },
    {
      promptType: 'comparison',
      question: 'What did Robert and Susan have in common in their stories?',
      correctAnswer: 'They both mentioned family gatherings',
      options: [
        'They both mentioned family gatherings',
        'They both talked about travel',
        'They both discussed gardening',
        'They both shared music memories',
      ],
      hint: 'Think about what brought people together',
    },
    {
      promptType: 'recall',
      question: 'What did you share about yourself during the conversation?',
      correctAnswer: 'Personal reflection',
      hint: 'Think back to when you spoke',
    },
    {
      promptType: 'attribution',
      question: 'Which friend mentioned their hometown?',
      correctAnswer: 'Susan',
      options: ['Mary', 'Robert', 'Susan', 'James'],
      hint: 'This person is from Portland',
    },
  ];

  return prompts.slice(0, count);
};

export const generateReinforcement = async (data: GenerateReinforcementDTO) => {
  const { sessionId, participantId, conversationSummary, keyMoments, count = 5 } = data;

  // Verify session exists
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Generate prompts
  const prompts = await generateReinforcementPrompts(
    conversationSummary,
    keyMoments || [],
    count
  );

  // Save to database
  const items = await Promise.all(
    prompts.map((prompt) =>
      prisma.reinforcementItem.create({
        data: {
          sessionId,
          participantId,
          promptType: prompt.promptType,
          question: prompt.question,
          correctAnswer: prompt.correctAnswer,
          options: prompt.options || null,
          hint: prompt.hint,
          nextReviewAt: calculateNextReview(0), // First review
        },
      })
    )
  );

  return items;
};

export const answerReinforcementItem = async (
  itemId: number,
  participantAnswer: string
) => {
  const item = await prisma.reinforcementItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error('Reinforcement item not found');
  }

  // Check if answer is correct (case-insensitive, flexible matching)
  const wasCorrect =
    participantAnswer.toLowerCase().trim() === item.correctAnswer.toLowerCase().trim();

  // Update review count and ease factor (SM-2 algorithm)
  const newReviewCount = item.reviewCount + 1;
  let newEaseFactor = item.easeFactor;

  if (wasCorrect) {
    newEaseFactor = Math.min(2.5, item.easeFactor + 0.1);
  } else {
    newEaseFactor = Math.max(1.3, item.easeFactor - 0.2);
  }

  // Calculate next review date
  const nextReviewAt = calculateNextReview(newReviewCount, newEaseFactor);

  // Update item
  const updatedItem = await prisma.reinforcementItem.update({
    where: { id: itemId },
    data: {
      participantAnswer,
      wasCorrect,
      answeredAt: new Date(),
      reviewCount: newReviewCount,
      easeFactor: newEaseFactor,
      nextReviewAt,
    },
  });

  return updatedItem;
};

export const getReinforcementItems = async (participantId: string, limit: number = 20) => {
  const items = await prisma.reinforcementItem.findMany({
    where: { participantId },
    orderBy: { answeredAt: 'desc' },
    take: limit,
  });

  return items;
};

export const getDueReinforcementItems = async (participantId: string) => {
  const items = await prisma.reinforcementItem.findMany({
    where: {
      participantId,
      nextReviewAt: {
        lte: new Date(),
      },
    },
    orderBy: { nextReviewAt: 'asc' },
  });

  return items;
};

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(reviewCount: number, easeFactor: number = 2.5): Date {
  const now = new Date();
  let interval: number;

  if (reviewCount === 0) {
    interval = 1; // 1 day
  } else if (reviewCount === 1) {
    interval = 6; // 6 days
  } else {
    // interval(n) = interval(n-1) * easeFactor
    interval = Math.round(6 * Math.pow(easeFactor, reviewCount - 1));
  }

  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return nextReview;
}
