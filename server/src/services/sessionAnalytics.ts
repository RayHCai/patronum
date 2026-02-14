// Session Analytics Service
// Performs sentiment analysis and conversation summarization for completed sessions
import { anthropic, stripMarkdownCodeFences } from './claude';
import { TurnData } from '../types';

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

Provide a warm, professional summary (3-4 sentences) that includes:
1. The main topics discussed
2. Key moments of engagement or connection
3. Notable stories or memories shared by ${participantName}
4. Overall tone and quality of the interaction

Keep the summary positive and person-centered, focusing on what ${participantName} contributed and experienced.`;

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
