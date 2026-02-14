// Redesigned patient profile page with conversation analytics
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Participant, Session, Turn, SessionAnalytics } from '../../types';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

interface SessionWithDetails extends Session {
  turns?: Turn[];
  participant?: Participant;
  agents?: any[];
  analytics?: SessionAnalytics;
}

interface WeeklyMetrics {
  totalConversations: number;
  avgDuration: number; // in minutes
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    monitor: number;
  };
}

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Participant | null>(null);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({
    totalConversations: 0,
    avgDuration: 0,
    sentimentBreakdown: { positive: 33, neutral: 33, monitor: 34 }
  });

  // Fetch patient data and sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch patient details
        const patientRes = await axios.get(`/api/participants/${id}`);
        setPatient(patientRes.data.data);

        // Fetch sessions for this patient
        const sessionsRes = await axios.get(`/api/participants/${id}/sessions`);
        const sessionsData = sessionsRes.data.data || [];
        setSessions(sessionsData);

        // Select the most recent session by default
        if (sessionsData.length > 0) {
          const mostRecent = sessionsData[0];
          setSelectedSession(mostRecent);

          // Fetch full session details with turns
          const sessionDetailRes = await axios.get(`/api/sessions/${mostRecent.id}`);
          const sessionDetail = sessionDetailRes.data.data;
          setSelectedSession(sessionDetail);

          // Generate conversation flow
          if (sessionDetail.turns && sessionDetail.turns.length > 0) {
            generateConversationFlow(sessionDetail.turns);
          }
        }

        // Calculate weekly metrics
        calculateWeeklyMetrics(sessionsData);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        // Use mock data as fallback
        loadMockData();
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const loadMockData = () => {
    const mockPatient: Participant = {
      id: id!,
      name: 'Margaret',
      notes: 'Enjoys talking about family and memories',
      dateOfBirth: '1950-05-15',
      isActive: true,
      createdAt: '2024-01-15',
      caregiver: {
        name: 'Sarah (Caretaker)',
        relationship: 'Caregiver',
      },
      agents: [{
        id: '1',
        participantId: id!,
        name: 'Care Agent',
        avatarColor: '#F4A7A7',
        voiceId: 'voice1',
        age: 68,
        background: {},
        personality: {},
        createdAt: '2024-01-15',
      }],
    };

    const mockSessions: SessionWithDetails[] = [
      {
        id: '1',
        participantId: id!,
        topic: 'Morning check-in',
        status: 'completed',
        startedAt: '2026-02-14T10:30:00Z',
        endedAt: '2026-02-14T10:42:00Z',
        aiSummary: 'Morning check-in. Margaret discussed her breakfast routine and shared memories about her grandchildren. Positive engagement throughout.',
        analytics: {
          id: 1,
          sessionId: '1',
          participantId: id!,
          turnCount: 4,
          participantTurnCount: 2,
          avgTurnLength: 12,
          sentimentAnalysis: {
            overallSentiment: 'positive',
            summary: 'Engaged and positive conversation'
          },
          computedAt: '2026-02-14T10:42:00Z'
        },
        turns: [
          {
            id: 1,
            sessionId: '1',
            speakerType: 'agent',
            speakerName: 'Care Agent',
            content: 'Good morning, Margaret! How are you feeling today?',
            timestamp: '2026-02-14T10:30:00Z',
            sequenceNumber: 1
          },
          {
            id: 2,
            sessionId: '1',
            speakerType: 'participant',
            speakerName: 'Margaret',
            content: "I'm doing well, thank you. I had oatmeal for breakfast.",
            timestamp: '2026-02-14T10:30:15Z',
            sequenceNumber: 2
          },
          {
            id: 3,
            sessionId: '1',
            speakerType: 'agent',
            speakerName: 'Care Agent',
            content: 'That sounds wonderful. Did you add anything special to it?',
            timestamp: '2026-02-14T10:31:00Z',
            sequenceNumber: 3
          },
          {
            id: 4,
            sessionId: '1',
            speakerType: 'participant',
            speakerName: 'Margaret',
            content: 'Yes, some blueberries. My granddaughter loves blueberries too.',
            timestamp: '2026-02-14T10:32:00Z',
            sequenceNumber: 4
          },
        ]
      },
      {
        id: '2',
        participantId: id!,
        topic: 'Afternoon wellness check',
        status: 'completed',
        startedAt: '2026-02-13T15:30:00Z',
        endedAt: '2026-02-13T15:38:00Z',
        aiSummary: 'Afternoon wellness check. Brief discussion about medication schedule. Sarah joined the conversation.',
        analytics: {
          id: 2,
          sessionId: '2',
          participantId: id!,
          turnCount: 6,
          participantTurnCount: 3,
          avgTurnLength: 8,
          sentimentAnalysis: {
            overallSentiment: 'neutral',
            summary: 'Brief but focused conversation'
          },
          computedAt: '2026-02-13T15:38:00Z'
        },
      },
      {
        id: '3',
        participantId: id!,
        topic: 'Extended conversation about family history',
        status: 'completed',
        startedAt: '2026-02-12T14:00:00Z',
        endedAt: '2026-02-12T14:16:00Z',
        aiSummary: 'Extended conversation about family history. Margaret showed some difficulty recalling specific details.',
        analytics: {
          id: 3,
          sessionId: '3',
          participantId: id!,
          turnCount: 8,
          participantTurnCount: 4,
          avgTurnLength: 10,
          sentimentAnalysis: {
            overallSentiment: 'mixed',
            summary: 'Some challenges with recall noted'
          },
          computedAt: '2026-02-12T14:16:00Z'
        },
      },
    ];

    setPatient(mockPatient);
    setSessions(mockSessions);
    setSelectedSession(mockSessions[0]);

    if (mockSessions[0].turns) {
      generateConversationFlow(mockSessions[0].turns);
    }

    calculateWeeklyMetrics(mockSessions);
    setIsLoading(false);
  };

  const generateConversationFlow = (turns: Turn[]) => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Create nodes for each turn
    turns.forEach((turn, index) => {
      const isParticipant = turn.speakerType === 'participant';
      const isAgent = turn.speakerType === 'agent';
      const isCareGiver = turn.speakerName.includes('Caretaker');

      let color = '#94A3B8'; // default gray
      if (isParticipant) color = '#DC2626'; // red for patient
      if (isAgent) color = '#F4A7A7'; // pink for care agent
      if (isCareGiver) color = '#E9D5FF'; // light purple for caretaker

      flowNodes.push({
        id: `turn-${turn.id}`,
        type: 'default',
        position: {
          x: isParticipant ? 150 : (isAgent ? 350 : 550),
          y: index * 100 + 50
        },
        data: {
          label: ''
        },
        style: {
          background: color,
          border: 'none',
          borderRadius: '50%',
          width: isParticipant ? 50 : (isAgent ? 40 : 35),
          height: isParticipant ? 50 : (isAgent ? 40 : 35),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0px',
          padding: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
        draggable: false,
      });

      // Create edges between consecutive turns
      if (index > 0) {
        flowEdges.push({
          id: `edge-${turn.id}`,
          source: `turn-${turns[index - 1].id}`,
          target: `turn-${turn.id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#E5E7EB', strokeWidth: 2 },
        });
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const calculateWeeklyMetrics = async (sessionsData: SessionWithDetails[]) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekSessions = sessionsData.filter(s =>
      new Date(s.startedAt) >= weekAgo
    );

    const totalConversations = weekSessions.length;

    const totalDuration = weekSessions.reduce((sum, session) => {
      if (session.endedAt) {
        const duration = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const avgDuration = totalConversations > 0 ? totalDuration / totalConversations : 0;

    // Calculate sentiment breakdown from session analytics
    let positiveCnt = 0;
    let neutralCnt = 0;
    let negativeCnt = 0;

    for (const session of weekSessions) {
      if (session.analytics?.sentimentAnalysis) {
        const sentiment = (session.analytics.sentimentAnalysis as any)?.overallSentiment;
        if (sentiment === 'positive') positiveCnt++;
        else if (sentiment === 'neutral') neutralCnt++;
        else if (sentiment === 'negative' || sentiment === 'mixed') negativeCnt++;
      }
    }

    const total = positiveCnt + neutralCnt + negativeCnt;
    const sentimentBreakdown = total > 0 ? {
      positive: Math.round((positiveCnt / total) * 100),
      neutral: Math.round((neutralCnt / total) * 100),
      monitor: Math.round((negativeCnt / total) * 100)
    } : {
      positive: 33,
      neutral: 33,
      monitor: 34
    };

    setWeeklyMetrics({
      totalConversations,
      avgDuration,
      sentimentBreakdown
    });
  };

  const handleSessionSelect = async (session: SessionWithDetails) => {
    setSelectedSession(session);

    // Fetch full session details if needed
    if (!session.turns || session.turns.length === 0) {
      try {
        const sessionDetailRes = await axios.get(`/api/sessions/${session.id}`);
        const sessionDetail = sessionDetailRes.data.data;
        setSelectedSession(sessionDetail);

        if (sessionDetail.turns && sessionDetail.turns.length > 0) {
          generateConversationFlow(sessionDetail.turns);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    } else {
      generateConversationFlow(session.turns);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSessionDuration = (session: SessionWithDetails) => {
    if (!session.endedAt) return 'In progress';
    const duration = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60);
    return `${Math.round(duration)} min duration`;
  };

  const getSessionParticipants = (session: SessionWithDetails) => {
    // Return a formatted string of participants
    return `${patient?.name}, Care Agent`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-3 border-solid border-[var(--color-accent)] border-r-transparent"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
          Patient not found
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => navigate('/admin/patients')}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <h1
          className="text-xl font-bold tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          patronum.ai
        </h1>

        <div className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
          Welcome, <span className="font-medium text-gray-900">{patient.caregiver?.name || 'Admin'}</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="relative z-10 flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Recent Conversations */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="px-6 py-6 border-b border-gray-200">
            <h2
              className="text-sm font-bold text-gray-900 uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Recent Conversations
            </h2>
            <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
              Last 7 days
            </p>
          </div>

          <div className="p-4 space-y-3">
            {sessions.map((session) => {
              const isSelected = selectedSession?.id === session.id;
              const statusColor = session.status === 'completed' ? 'bg-green-500' :
                                session.status === 'active' ? 'bg-blue-500' : 'bg-gray-400';

              return (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session)}
                  className={`w-full text-left p-4 border transition-all ${
                    isSelected
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                      <span
                        className="text-xs text-gray-500"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <p
                      className="text-sm font-semibold text-gray-900 line-clamp-1"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {getSessionParticipants(session)}
                    </p>
                    <p
                      className="text-xs text-gray-600 line-clamp-2"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {session.aiSummary || session.topic || 'Conversation session'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-sans)' }}>
                      {getSessionDuration(session)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {selectedSession ? (
              <>
                {/* Date Header */}
                <div className="mb-6">
                  <h2
                    className="text-3xl font-semibold tracking-tight text-gray-900"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {formatDate(selectedSession.startedAt)}
                  </h2>
                  <p
                    className="text-sm text-gray-600 mt-1"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {patient.name} • {patient.agents?.[0]?.name || 'Care Agent'}
                  </p>
                </div>

                {/* Summary Section */}
                <div className="mb-8">
                  <h3
                    className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Summary
                  </h3>
                  <p
                    className="text-sm text-gray-700 leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {selectedSession.aiSummary || 'No summary available for this session.'}
                  </p>
                </div>

                {/* Conversation Flow */}
                {nodes.length > 0 && (
                  <div className="mb-8">
                    <h3
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Conversation Flow
                    </h3>
                    <div className="border border-gray-200 bg-white" style={{ height: '400px' }}>
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        connectionMode={ConnectionMode.Loose}
                        fitView
                        panOnDrag={true}
                        zoomOnScroll={true}
                        zoomOnPinch={true}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        attributionPosition="bottom-left"
                        proOptions={{ hideAttribution: true }}
                      >
                        <Background color="#e5e7eb" gap={20} size={1} />
                      </ReactFlow>
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                        <span className="text-gray-600">Patient</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#F4A7A7]" />
                        <span className="text-gray-600">Care Agent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#E9D5FF]" />
                        <span className="text-gray-600">Caretaker</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Transcript */}
                {selectedSession.turns && selectedSession.turns.length > 0 && (
                  <div className="mb-8">
                    <h3
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Full Transcript
                    </h3>
                    <div className="space-y-4">
                      {selectedSession.turns.map((turn) => {
                        const isParticipant = turn.speakerType === 'participant';
                        const avatarColor = isParticipant ? '#DC2626' : '#F4A7A7';
                        const initial = turn.speakerName.charAt(0).toUpperCase();

                        return (
                          <div key={turn.id} className="flex gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {initial}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-sm font-semibold text-gray-900"
                                  style={{ fontFamily: 'var(--font-sans)' }}
                                >
                                  {turn.speakerName}
                                </span>
                                <span
                                  className="text-xs text-gray-500"
                                  style={{ fontFamily: 'var(--font-sans)' }}
                                >
                                  {formatTime(turn.timestamp)}
                                </span>
                              </div>
                              <p
                                className="text-sm text-gray-700"
                                style={{ fontFamily: 'var(--font-sans)' }}
                              >
                                {turn.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-sans)' }}>
                  Select a conversation to view details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Weekly Overview */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="px-6 py-6 border-b border-gray-200">
            <h2
              className="text-sm font-bold text-gray-900 uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Weekly Overview
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Total Conversations */}
            <div>
              <p
                className="text-xs text-gray-500 uppercase tracking-wide mb-2"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Total Conversations
              </p>
              <p
                className="text-4xl font-bold text-[var(--color-accent)]"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {weeklyMetrics.totalConversations}
              </p>
              <p
                className="text-xs text-gray-500 mt-1"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                This week
              </p>
            </div>

            {/* Avg Duration */}
            <div>
              <p
                className="text-xs text-gray-500 uppercase tracking-wide mb-2"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Avg Duration
              </p>
              <p
                className="text-3xl font-bold text-gray-900"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {weeklyMetrics.avgDuration.toFixed(1)}
              </p>
              <p
                className="text-xs text-gray-500 mt-1"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                minutes
              </p>
            </div>

            {/* Sentiment Breakdown */}
            <div>
              <p
                className="text-xs text-gray-500 uppercase tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Sentiment Breakdown
              </p>
              <div className="space-y-3">
                {/* Positive */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-medium text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Positive
                    </span>
                    <span
                      className="text-sm font-bold text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {weeklyMetrics.sentimentBreakdown.positive}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${weeklyMetrics.sentimentBreakdown.positive}%` }}
                    />
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-medium text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Neutral
                    </span>
                    <span
                      className="text-sm font-bold text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {weeklyMetrics.sentimentBreakdown.neutral}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400"
                      style={{ width: `${weeklyMetrics.sentimentBreakdown.neutral}%` }}
                    />
                  </div>
                </div>

                {/* Monitor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-medium text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Monitor
                    </span>
                    <span
                      className="text-sm font-bold text-gray-900"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {weeklyMetrics.sentimentBreakdown.monitor}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${weeklyMetrics.sentimentBreakdown.monitor}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
