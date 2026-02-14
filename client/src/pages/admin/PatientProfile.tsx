// Redesigned patient profile page with conversation analytics
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, RefreshCw, BarChart3 } from 'lucide-react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  Position,
  Handle,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Participant, Session, Turn } from '../../types';
import axios from 'axios';

// Custom circular node component with proper handles
function CircularNode({ data }: NodeProps) {
  return (
    <div style={data.style}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'transparent', border: 'none', top: -12 }}
      />
      <div>{data.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: 'none', bottom: -12 }}
      />
    </div>
  );
}

const nodeTypes = {
  circular: CircularNode,
};

interface SessionWithDetails extends Session {
  turns?: Turn[];
  participant?: Participant;
  agents?: any[];
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
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({
    totalConversations: 0,
    avgDuration: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, monitor: 0 }
  });

  console.log('PatientProfile component rendered. ID:', id, 'isLoading:', isLoading);

  // Fetch patient data and sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Starting to load patient profile for ID:', id);
        setIsLoading(true);
        const startTime = Date.now();

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

        // Ensure minimum loading time of 800ms for better UX
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 800 - elapsedTime);

        console.log('Data loaded in', elapsedTime, 'ms, waiting', remainingTime, 'ms more');
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        console.log('Finished loading patient profile');
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const generateConversationFlow = (turns: Turn[]) => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Create nodes for each turn
    turns.forEach((turn, index) => {
      const isUser = turn.speakerType === 'participant';
      const isModerator = turn.speakerType === 'moderator';
      const isPatientAgent = turn.speakerType === 'agent';

      // Stanford color scheme - using darker colors
      let color = '#8C1515'; // Stanford Cardinal Red for user
      let textColor = '#FFFFFF'; // white text

      if (isPatientAgent) {
        color = '#620000'; // Dark burgundy for AI patient agent
        textColor = '#FFFFFF';
      } else if (isModerator) {
        color = '#2E5339'; // Stanford Palo Alto Green (dark green) for AI moderator
        textColor = '#FFFFFF';
      } else if (isUser) {
        color = '#8C1515'; // Stanford Cardinal red for patient user
        textColor = '#FFFFFF';
      }

      const bubbleSize = 85; // All bubbles same size

      flowNodes.push({
        id: `turn-${turn.id}`,
        type: 'circular',
        position: {
          x: isUser ? 150 : (isModerator ? 350 : 550),
          y: index * 130 + 50
        },
        data: {
          label: turn.speakerName,
          style: {
            background: color,
            border: 'none',
            borderRadius: '50%',
            width: bubbleSize,
            height: bubbleSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontFamily: 'var(--font-serif)',
            fontWeight: '700',
            color: textColor,
            padding: '10px',
            textAlign: 'center',
            lineHeight: '1.2',
            boxShadow: '0 3px 10px rgba(140, 21, 21, 0.25)',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          }
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
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#9CA3AF',
            width: 20,
            height: 20,
          },
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
      const analytics = session.sessionAnalytics?.[0];
      if (analytics?.sentimentAnalysis) {
        const sentiment = (analytics.sentimentAnalysis as any)?.overallSentiment;
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
      positive: 0,
      neutral: 0,
      monitor: 0
    };

    setWeeklyMetrics({
      totalConversations,
      avgDuration,
      sentimentBreakdown
    });
  };

  const handleSessionSelect = async (session: SessionWithDetails) => {
    setIsLoadingSession(true);
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
      } finally {
        setIsLoadingSession(false);
      }
    } else {
      generateConversationFlow(session.turns);
      setIsLoadingSession(false);
    }
  };

  const handleRefreshSessions = async () => {
    try {
      setIsRefreshing(true);

      // Fetch sessions for this patient
      const sessionsRes = await axios.get(`/api/participants/${id}/sessions`);
      const sessionsData = sessionsRes.data.data || [];
      setSessions(sessionsData);

      // Recalculate weekly metrics with new data
      calculateWeeklyMetrics(sessionsData);

      // If there's a selected session, refresh its details too
      if (selectedSession) {
        const sessionDetailRes = await axios.get(`/api/sessions/${selectedSession.id}`);
        const sessionDetail = sessionDetailRes.data.data;
        setSelectedSession(sessionDetail);

        if (sessionDetail.turns && sessionDetail.turns.length > 0) {
          generateConversationFlow(sessionDetail.turns);
        }
      }
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReanalyzeSession = async (sessionId: string) => {
    try {
      setIsReanalyzing(true);
      console.log(`[UI] Re-analyzing session ${sessionId}...`);

      // Call the reanalyze endpoint
      const response = await axios.post(`/api/sessions/${sessionId}/reanalyze`);
      console.log(`[UI] Re-analysis completed:`, response.data);

      // Refresh the session details
      const sessionDetailRes = await axios.get(`/api/sessions/${sessionId}`);
      const sessionDetail = sessionDetailRes.data.data;
      setSelectedSession(sessionDetail);

      // Refresh all sessions to update the list
      const sessionsRes = await axios.get(`/api/participants/${id}/sessions`);
      const sessionsData = sessionsRes.data.data || [];
      setSessions(sessionsData);

      // Recalculate metrics
      calculateWeeklyMetrics(sessionsData);

      alert('Session analytics updated successfully!');
    } catch (error: any) {
      console.error('Error re-analyzing session:', error);
      alert(`Failed to re-analyze session: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsReanalyzing(false);
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
    console.log('Rendering loading screen...');
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white">
        <div
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-r-transparent mb-4"
          style={{ borderColor: '#620000', borderRightColor: 'transparent' }}
        ></div>
        <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
          Loading patient profile...
        </p>
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
          Patronum
        </h1>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="font-medium text-gray-900">{patient.name}</span>
          </div>
          <button
            onClick={() => navigate(`/admin/patients/${id}/settings`)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Patient Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="relative z-10 flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Recent Conversations */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
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
              <button
                onClick={handleRefreshSessions}
                disabled={isRefreshing}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh conversations"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
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
            {isLoadingSession ? (
              <div className="flex items-center justify-center h-64">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[var(--color-accent)] border-r-transparent"></div>
              </div>
            ) : selectedSession ? (
              <>
                {/* Date Header */}
                <div className="mb-6 flex items-start justify-between">
                  <div>
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
                      {patient.agents?.[0]?.name || 'Care Agent'}
                    </p>
                  </div>
                  {selectedSession.status === 'completed' && (
                    <button
                      onClick={() => handleReanalyzeSession(selectedSession.id)}
                      disabled={isReanalyzing}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      title="Re-run analytics for this session"
                    >
                      <BarChart3 size={14} className={isReanalyzing ? 'animate-spin' : ''} />
                      {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                    </button>
                  )}
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
                        nodeTypes={nodeTypes}
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
                        <div className="w-3 h-3 rounded-full bg-[#8C1515]" />
                        <span className="text-gray-600">Patient (user)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#2E5339]" />
                        <span className="text-gray-600">AI moderator</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#620000]" />
                        <span className="text-gray-600">AI patient agent</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Transcript */}
                {selectedSession.turns && selectedSession.turns.length > 0 && (
                  <div className="mb-8 pt-8 border-t border-gray-200">
                    <h3
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Full Transcript
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {selectedSession.turns.map((turn) => {
                        const isModerator = turn.speakerType === 'moderator';
                        const isPatientAgent = turn.speakerType === 'agent';

                        // Match colors from conversation flow and key
                        let avatarColor = '#8C1515'; // Stanford Cardinal Red for user (default)
                        if (isPatientAgent) {
                          avatarColor = '#620000'; // Dark burgundy for AI patient agent
                        } else if (isModerator) {
                          avatarColor = '#2E5339'; // Stanford Palo Alto Green for AI moderator
                        }

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
