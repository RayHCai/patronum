// Speech Graph Analysis Service
// Integrates with Python microservice for graph computation

import axios from 'axios';
import { prisma } from '../prisma/client';

const PYTHON_SERVICE_URL = process.env.SPEECH_GRAPH_SERVICE_URL || 'http://localhost:8001';

export interface SpeechGraphMetrics {
  full_metrics: {
    nodes: number;
    edges: number;
    lsc: number;              // Largest Strongly Connected Component
    lcc: number;              // Largest Connected Component
    loops: {
      L1: number;
      L2: number;
      L3: number;
    };
    parallel_edges: number;
    density: number;
    avg_degree: number;
  };
  aggregated_metrics: {
    avg_lsc: number;
    min_lsc: number;
    max_lsc: number;
    avg_lcc: number;
    avg_density: number;
  };
  visualization: {
    nodes: Array<{
      id: number;
      word: string;
      degree: number;
      in_degree: number;
      out_degree: number;
    }>;
    links: Array<{
      source: number;
      target: number;
      weight: number;
    }>;
  };
  word_count: number;
  unique_words: number;
  lexical_diversity: number;
}

/**
 * Check if Python service is available
 */
export const checkPythonServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 3000,
    });
    return response.status === 200;
  } catch (error: any) {
    console.warn('[Speech Graph] Python service not available at', PYTHON_SERVICE_URL);
    console.warn('[Speech Graph] To start the service: cd speech-graph-service && python -m uvicorn app.main:app --reload --port 8001');
    return false;
  }
};

/**
 * Analyze participant speech using Speech Graph Analysis
 */
export const analyzeSpeechGraph = async (
  text: string,
  sessionId?: string,
  participantId?: string
): Promise<SpeechGraphMetrics | null> => {
  try {
    console.log(`[Speech Graph] Analyzing ${text.length} characters of text...`);

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
      text,
      session_id: sessionId,
      participant_id: participantId,
    }, {
      timeout: 30000, // 30 second timeout
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Analysis failed');
    }

    console.log(`[Speech Graph] Analysis complete. LSC: ${response.data.data.full_metrics.lsc}, LCC: ${response.data.data.full_metrics.lcc}`);

    return response.data.data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('[Speech Graph] Python service not running. Start with: cd server/python-services/speech-graph && python -m app.main');
    } else {
      console.error('[Speech Graph] Error calling Python service:', error.message);
    }

    // Return null instead of throwing - allow session completion to continue
    return null;
  }
};

/**
 * Analyze speech graph for a completed session
 * Throws errors for proper status tracking by caller
 */
export const analyzeSessionSpeechGraph = async (sessionId: string): Promise<void> => {
  console.log(`[Speech Graph] Starting analysis for session ${sessionId}`);

  // Check if Python service is available
  const serviceAvailable = await checkPythonServiceHealth();
  if (!serviceAvailable) {
    const errorMsg = 'Python service not available - ensure speech-graph-service is running on port 8001';
    console.warn(`[Speech Graph] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Fetch session with turns
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      turns: {
        where: { speakerType: 'participant' },
        orderBy: { sequenceNumber: 'asc' },
      },
    },
  });

  if (!session || session.turns.length === 0) {
    const errorMsg = `No participant turns found for session ${sessionId}`;
    console.log(`[Speech Graph] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Concatenate all participant speech
  const participantText = session.turns
    .map(turn => turn.content)
    .join(' ');

  if (participantText.trim().length < 20) {
    const errorMsg = `Text too short for meaningful analysis (${participantText.length} chars, minimum 20 required)`;
    console.log(`[Speech Graph] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Call Python service
  const metrics = await analyzeSpeechGraph(
    participantText,
    sessionId,
    session.participantId
  );

  if (!metrics) {
    const errorMsg = 'Python service returned null - analysis failed';
    console.warn(`[Speech Graph] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Store results in database
  const analytics = await prisma.sessionAnalytics.findFirst({
    where: { sessionId },
  });

  if (analytics) {
    await prisma.sessionAnalytics.update({
      where: { id: analytics.id },
      data: {
        speechGraphMetrics: metrics as any,
        graphStructure: metrics.visualization as any,
        graphComputedAt: new Date(),
      },
    });
  } else {
    console.warn('[Speech Graph] No analytics record found for session', sessionId);
  }

  // Also store graph structure in Session for easy retrieval
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      conversationGraph: metrics.visualization as any,
    },
  });

  console.log(`[Speech Graph] Analysis stored for session ${sessionId}`);
};

/**
 * Real-time analysis for live sessions (lightweight)
 */
export const analyzeRealtimeSpeechGraph = async (
  text: string
): Promise<any> => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/realtime`, {
      text,
    }, {
      timeout: 5000, // 5 second timeout for real-time
    });

    return response.data.data;
  } catch (error: any) {
    console.error('[Speech Graph] Real-time analysis error:', error.message);
    return null;
  }
};
