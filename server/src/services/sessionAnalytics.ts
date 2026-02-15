// Session Analytics Service
// Performs sentiment analysis and conversation summarization for completed sessions
import { anthropic, stripMarkdownCodeFences } from './claude';
import { TurnData } from '../types';
import { prisma } from '../prisma/client';
import { NotFoundError } from '../types';
import { analyzeSessionSpeechGraph } from './speechGraphAnalysis';

// ========================================
// Dementia-Focused Sentiment Analysis
// ========================================

export interface DementiaSentimentAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  emotionalTone: {
    happiness: number;        // 0-1 scale
    anxiety: number;          // 0-1 scale
    frustration: number;      // 0-1 scale
    confusion: number;        // 0-1 scale
    engagement: number;       // 0-1 scale
  };
  cognitiveIndicators: {
    clarity: number;                    // 0-1 scale
    coherence: number;                  // 0-1 scale
    memoryRecall: 'strong' | 'moderate' | 'weak' | 'unclear';
    repetitionDetected: boolean;
    wordFindingDifficulty: boolean;
  };
  communicationPatterns: {
    avgResponseLength: number;          // words
    responseVariability: number;        // 0-1 scale
    questionAsking: number;             // count
    selfCorrections: number;            // count
  };
  socialEngagement: {
    initiatedTopics: number;
    respondedToOthers: boolean;
    expressedPersonalStories: boolean;
  };
  concernFlags: string[];               // List of any concerning patterns
  positiveIndicators: string[];         // List of positive engagement signs
  summary: string;                      // Brief narrative summary
}

/**
 * Analyze sentiment of participant's contributions with dementia-specific focus
 * Analyzes ONLY the participant's turns (not agents or moderator)
 */
export const analyzeParticipantSentiment = async (
  participantTurns: TurnData[],
  participantName: string
): Promise<DementiaSentimentAnalysis> => {
  if (participantTurns.length === 0) {
    // Return neutral analysis if no participant turns
    return {
      overallSentiment: 'neutral',
      emotionalTone: {
        happiness: 0.5,
        anxiety: 0,
        frustration: 0,
        confusion: 0,
        engagement: 0,
      },
      cognitiveIndicators: {
        clarity: 0.5,
        coherence: 0.5,
        memoryRecall: 'unclear',
        repetitionDetected: false,
        wordFindingDifficulty: false,
      },
      communicationPatterns: {
        avgResponseLength: 0,
        responseVariability: 0,
        questionAsking: 0,
        selfCorrections: 0,
      },
      socialEngagement: {
        initiatedTopics: 0,
        respondedToOthers: false,
        expressedPersonalStories: false,
      },
      concernFlags: ['No participant contributions recorded'],
      positiveIndicators: [],
      summary: 'No participant contributions were recorded in this session.',
    };
  }

  // Compile all participant turns
  const participantText = participantTurns
    .map((turn, idx) => `[Turn ${idx + 1}] ${turn.content}`)
    .join('\n\n');

  const prompt = `You are a clinical specialist analyzing conversation patterns for a person with dementia. Analyze the following contributions from ${participantName} in a group conversation setting.

PARTICIPANT'S CONTRIBUTIONS:
${participantText}

Provide a comprehensive dementia-focused sentiment and cognitive analysis. Consider:

1. EMOTIONAL TONE: Identify emotional states (happiness, anxiety, frustration, confusion, engagement level)
2. COGNITIVE INDICATORS:
   - Clarity and coherence of thoughts
   - Evidence of memory recall (strong/moderate/weak)
   - Repetition of phrases or ideas
   - Word-finding difficulties (pauses, substitutions, circumlocution)
3. COMMUNICATION PATTERNS:
   - Length and variability of responses
   - Number of questions asked
   - Self-corrections or revisions
4. SOCIAL ENGAGEMENT:
   - Did they initiate topics or only respond?
   - Did they share personal stories or memories?
   - Level of engagement with others
5. CONCERN FLAGS: Any concerning patterns (agitation, severe confusion, withdrawal, inappropriate responses)
6. POSITIVE INDICATORS: Signs of good engagement (storytelling, humor, curiosity, social connection)

Respond with ONLY a JSON object in this exact format:
{
  "overallSentiment": "positive" | "neutral" | "negative" | "mixed",
  "emotionalTone": {
    "happiness": 0.0-1.0,
    "anxiety": 0.0-1.0,
    "frustration": 0.0-1.0,
    "confusion": 0.0-1.0,
    "engagement": 0.0-1.0
  },
  "cognitiveIndicators": {
    "clarity": 0.0-1.0,
    "coherence": 0.0-1.0,
    "memoryRecall": "strong" | "moderate" | "weak" | "unclear",
    "repetitionDetected": true/false,
    "wordFindingDifficulty": true/false
  },
  "communicationPatterns": {
    "avgResponseLength": number,
    "responseVariability": 0.0-1.0,
    "questionAsking": number,
    "selfCorrections": number
  },
  "socialEngagement": {
    "initiatedTopics": number,
    "respondedToOthers": true/false,
    "expressedPersonalStories": true/false
  },
  "concernFlags": ["concern1", "concern2"],
  "positiveIndicators": ["indicator1", "indicator2"],
  "summary": "2-3 sentence narrative summary of the participant's engagement and cognitive presentation"
}`;

  try {
    console.log(`[Session Analytics] Analyzing sentiment for ${participantTurns.length} participant turns`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleanedText = stripMarkdownCodeFences(responseText);
    const analysis = JSON.parse(cleanedText);

    console.log(`[Session Analytics] Sentiment analysis completed - Overall: ${analysis.overallSentiment}`);

    return analysis;
  } catch (error) {
    console.error('[Session Analytics] Error analyzing sentiment:', error);

    // Fallback: basic analysis
    const avgLength = participantTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0) / participantTurns.length;
    const questionCount = participantTurns.filter(t => t.content.includes('?')).length;

    return {
      overallSentiment: 'neutral',
      emotionalTone: {
        happiness: 0.5,
        anxiety: 0,
        frustration: 0,
        confusion: 0,
        engagement: 0.5,
      },
      cognitiveIndicators: {
        clarity: 0.6,
        coherence: 0.6,
        memoryRecall: 'unclear',
        repetitionDetected: false,
        wordFindingDifficulty: false,
      },
      communicationPatterns: {
        avgResponseLength: Math.round(avgLength),
        responseVariability: 0.5,
        questionAsking: questionCount,
        selfCorrections: 0,
      },
      socialEngagement: {
        initiatedTopics: 0,
        respondedToOthers: participantTurns.length > 0,
        expressedPersonalStories: false,
      },
      concernFlags: ['Analysis failed - using fallback metrics'],
      positiveIndicators: participantTurns.length > 0 ? ['Participated in conversation'] : [],
      summary: `${participantName} contributed ${participantTurns.length} times with an average of ${Math.round(avgLength)} words per response. Detailed analysis unavailable.`,
    };
  }
};

// ========================================
// Conversation Summarization
// ========================================

/**
 * Generate a comprehensive summary of the entire conversation
 * Includes all participants (user, agents, moderator)
 */
export const generateConversationSummary = async (
  allTurns: TurnData[],
  participantName: string
): Promise<string> => {
  if (allTurns.length === 0) {
    return 'No conversation recorded.';
  }

  // Format conversation history
  const conversationText = allTurns
    .map(turn => `${turn.speakerName}: ${turn.content}`)
    .join('\n');

  const prompt = `Summarize this group conversation session for a dementia care context. The main participant is ${participantName}.

CONVERSATION:
${conversationText}

Write a single paragraph summary (3-4 sentences) that captures what happened in the conversation. Include the main topics discussed, key moments of engagement or connection, notable stories or memories shared by ${participantName}, and the overall tone and quality of the interaction. Keep the summary positive and person-centered, focusing on what ${participantName} contributed and experienced.

IMPORTANT: Return ONLY plain text in paragraph form. Do NOT use markdown formatting, bullet points, numbered lists, headings, or any special formatting. Just write a natural, flowing paragraph.`;

  try {
    console.log(`[Session Analytics] Generating conversation summary for ${allTurns.length} turns`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : '';

    console.log(`[Session Analytics] Summary generated: "${summary.substring(0, 100)}..."`);

    return summary;
  } catch (error) {
    console.error('[Session Analytics] Error generating summary:', error);

    // Fallback summary
    const participantTurns = allTurns.filter(t => t.speakerType === 'participant');
    return `${participantName} participated in a group conversation with ${allTurns.length} total exchanges. They contributed ${participantTurns.length} times. Summary generation unavailable.`;
  }
};

// ========================================
// Basic Analytics Calculations
// ========================================

/**
 * Calculate basic conversation metrics
 */
export const calculateBasicAnalytics = (
  allTurns: TurnData[],
  participantTurns: TurnData[]
) => {
  const totalTurns = allTurns.length;
  const participantTurnCount = participantTurns.length;
  const avgTurnLength = participantTurns.length > 0
    ? participantTurns.reduce((sum, turn) => sum + turn.content.split(/\s+/).length, 0) / participantTurns.length
    : 0;

  return {
    totalTurns,
    participantTurnCount,
    avgTurnLength: Math.round(avgTurnLength * 10) / 10,
  };
};

/**
 * Analyze conversation for coherence indicators
 */
export const analyzeCoherence = (participantTurns: TurnData[]): {
  coherenceScore: number;
  topicShifts: number;
  contextualContinuity: number;
} => {
  if (participantTurns.length === 0) {
    return {
      coherenceScore: 0,
      topicShifts: 0,
      contextualContinuity: 0,
    };
  }

  // Simple heuristics for now - can be enhanced with AI analysis
  const avgLength = participantTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0) / participantTurns.length;
  const variability = Math.abs(avgLength - 10) / 10; // Normalize around 10 words

  return {
    coherenceScore: Math.max(0, Math.min(1, 1 - variability)),
    topicShifts: 0, // Placeholder for future implementation
    contextualContinuity: participantTurns.length > 1 ? 0.7 : 0.5, // Placeholder
  };
};

/**
 * Detect repetition patterns in participant speech
 */
export const analyzeRepetition = (participantTurns: TurnData[]): {
  repetitionScore: number;
  repeatedPhrases: string[];
  repeatedWords: string[];
} => {
  if (participantTurns.length === 0) {
    return {
      repetitionScore: 0,
      repeatedPhrases: [],
      repeatedWords: [],
    };
  }

  const allWords = participantTurns
    .flatMap(turn => turn.content.toLowerCase().split(/\s+/))
    .filter(word => word.length > 3); // Ignore short words

  const wordCounts = new Map<string, number>();
  allWords.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  const repeatedWords = Array.from(wordCounts.entries())
    .filter(([_, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  const repetitionScore = repeatedWords.length > 0
    ? Math.min(1, repeatedWords.length / 10)
    : 0;

  return {
    repetitionScore,
    repeatedPhrases: [], // Placeholder for phrase detection
    repeatedWords,
  };
};

// ========================================
// Complete Session Analysis Orchestration
// ========================================

export interface SessionAnalysisResult {
  summary: string;
  sentimentAnalysis: DementiaSentimentAnalysis;
  analytics: {
    totalTurns: number;
    participantTurnCount: number;
    avgTurnLength: number;
  };
  coherenceMetrics: {
    coherenceScore: number;
    topicShifts: number;
    contextualContinuity: number;
  };
  repetitionMetrics: {
    repetitionScore: number;
    repeatedPhrases: string[];
    repeatedWords: string[];
  };
  speechGraphStatus: 'completed' | 'failed' | 'skipped';
  speechGraphError?: string;
}

/**
 * Complete analysis orchestration for session completion
 * Handles all analysis logic: sentiment, summary, coherence, repetition, basic metrics
 */
export const completeSessionAnalysis = async (
  sessionId: string
): Promise<SessionAnalysisResult> => {
  console.log(`[Session Analysis] Starting complete analysis for session ${sessionId}`);

  // 1. Fetch session with all required data
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      participant: true,
      turns: {
        orderBy: { sequenceNumber: 'asc' },
      },
    },
  });

  if (!session) {
    throw new NotFoundError('Session');
  }

  console.log(`[Session Analysis] Processing session with ${session.turns.length} turns`);

  // 2. Prepare turn data
  const allTurns = session.turns.map(turn => ({
    speakerName: turn.speakerName,
    speakerType: turn.speakerType,
    speakerId: turn.speakerId || undefined,
    content: turn.content,
    audioUrl: turn.audioUrl || undefined,
  }));

  const participantTurns = allTurns.filter(turn => turn.speakerType === 'participant');
  console.log(`[Session Analysis] Found ${participantTurns.length} participant turns for analysis`);

  // 3. Perform all analyses in parallel where possible
  const [sentimentAnalysis, conversationSummary, coherenceMetrics, repetitionMetrics] = await Promise.all([
    analyzeParticipantSentiment(participantTurns, session.participant.name),
    generateConversationSummary(allTurns, session.participant.name),
    Promise.resolve(analyzeCoherence(participantTurns)),
    Promise.resolve(analyzeRepetition(participantTurns)),
  ]);

  console.log(`[Session Analysis] Sentiment: ${sentimentAnalysis.overallSentiment}, Coherence: ${coherenceMetrics.coherenceScore.toFixed(2)}`);

  // 4. Calculate basic analytics
  const analytics = calculateBasicAnalytics(allTurns, participantTurns);

  // 5. Update session record
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      endedAt: new Date(),
      aiSummary: conversationSummary,
    },
  });

  // 6. Create session analytics record
  try {
    const analyticsRecord = await prisma.sessionAnalytics.create({
      data: {
        sessionId,
        participantId: session.participantId,
        turnCount: analytics.totalTurns,
        participantTurnCount: analytics.participantTurnCount,
        avgTurnLength: analytics.avgTurnLength,
        sentimentAnalysis: sentimentAnalysis as any,
        computedAt: new Date(),
      },
    });
    console.log(`[Session Analysis] Created SessionAnalytics record with ID: ${analyticsRecord.id}`);
  } catch (error) {
    console.error(`[Session Analysis] CRITICAL ERROR creating SessionAnalytics:`, error);
    throw error; // Re-throw to ensure we know about this failure
  }

  console.log(`[Session Analysis] Session ${sessionId} marked as complete with full analytics`);

  // 7. Analyze speech graph (now part of main flow with status tracking)
  console.log(`[Session Analysis] Starting speech graph analysis for session ${sessionId}...`);
  let speechGraphStatus: 'completed' | 'failed' | 'skipped' = 'skipped';
  let speechGraphError: string | undefined;

  try {
    await analyzeSessionSpeechGraph(sessionId);
    speechGraphStatus = 'completed';
    console.log(`[Session Analysis] Speech graph analysis completed successfully`);
  } catch (error: any) {
    speechGraphStatus = 'failed';
    speechGraphError = error.message || 'Unknown error';
    console.error(`[Session Analysis] Speech graph analysis failed:`, error.message);
    // Don't throw - session completion should succeed even if speech graph fails
  }

  return {
    summary: conversationSummary,
    sentimentAnalysis,
    analytics,
    coherenceMetrics,
    repetitionMetrics,
    speechGraphStatus,
    speechGraphError,
  };
};
