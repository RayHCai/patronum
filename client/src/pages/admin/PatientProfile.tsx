// Redesigned patient profile page with conversation analytics
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Settings, RefreshCw, BarChart3, Network } from 'lucide-react';
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
import { SpeechGraphVisualization, SpeechGraphMetrics } from '../../components/SpeechGraph';

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
  const [speechGraphData, setSpeechGraphData] = useState<any>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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

          // Fetch analytics and speech graph data for completed sessions
          if (sessionDetail.status === 'completed') {
            fetchSessionAnalytics(sessionDetail.id);
            fetchSpeechGraphData(sessionDetail.id);
          }
        }

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

    // Fetch analytics and speech graph data for completed sessions
    if (session.status === 'completed') {
      fetchSessionAnalytics(session.id);
      fetchSpeechGraphData(session.id);
    } else {
      setSessionAnalytics(null);
      setSpeechGraphData(null);
    }
  };

  const handleRefreshSessions = async () => {
    try {
      setIsRefreshing(true);

      // Fetch sessions for this patient
      const sessionsRes = await axios.get(`/api/participants/${id}/sessions`);
      const sessionsData = sessionsRes.data.data || [];
      setSessions(sessionsData);

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

  const fetchSpeechGraphData = async (sessionId: string) => {
    try {
      setLoadingGraph(true);
      setGraphError(null);
      console.log(`[UI] Fetching speech graph data for session ${sessionId}...`);

      const response = await axios.get(`/api/sessions/${sessionId}/speech-graph`);
      setSpeechGraphData(response.data.data);
      console.log('[UI] Speech graph data loaded:', response.data.data);
    } catch (error: any) {
      console.error('[UI] Error fetching speech graph:', error);
      if (error.response?.status === 404) {
        setGraphError('Speech graph analysis not available yet. Try re-analyzing the session.');
      } else {
        setGraphError('Failed to load speech graph data.');
      }
      setSpeechGraphData(null);
    } finally {
      setLoadingGraph(false);
    }
  };

  const fetchSessionAnalytics = async (sessionId: string) => {
    try {
      setLoadingAnalytics(true);
      console.log(`[UI] Fetching session analytics for session ${sessionId}...`);

      // Get session with analytics
      const response = await axios.get(`/api/sessions/${sessionId}`);
      const session = response.data.data;

      if (session.sessionAnalytics && session.sessionAnalytics.length > 0) {
        setSessionAnalytics(session.sessionAnalytics[0]);
        console.log('[UI] Session analytics loaded:', session.sessionAnalytics[0]);
      } else {
        setSessionAnalytics(null);
        console.log('[UI] No analytics available for this session');
      }
    } catch (error: any) {
      console.error('[UI] Error fetching session analytics:', error);
      setSessionAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleReanalyzeSession = async (sessionId: string) => {
    try {
      setIsReanalyzing(true);
      console.log(`[UI] Re-analyzing session ${sessionId}...`);

      // Call the reanalyze endpoint
      const response = await axios.post(`/api/sessions/${sessionId}/reanalyze`);
      console.log(`[UI] Re-analysis completed:`, response.data);

      const result = response.data.data;

      // Refresh the session details
      const sessionDetailRes = await axios.get(`/api/sessions/${sessionId}`);
      const sessionDetail = sessionDetailRes.data.data;
      setSelectedSession(sessionDetail);

      // Refresh all sessions to update the list
      const sessionsRes = await axios.get(`/api/participants/${id}/sessions`);
      const sessionsData = sessionsRes.data.data || [];
      setSessions(sessionsData);

      // Refresh speech graph data
      fetchSpeechGraphData(sessionId);

      // Show appropriate message based on speech graph status
      if (result.speechGraphStatus === 'completed') {
        toast.success('Session analytics and speech graph analysis updated successfully!', {
          duration: 5000,
        });
      } else if (result.speechGraphStatus === 'failed') {
        toast.error(
          `Speech graph analysis failed: ${result.speechGraphError || 'Unknown error'}. Make sure the Python service is running.`,
          {
            duration: 6000,
          }
        );
        toast.success('Session analytics updated successfully!', {
          duration: 4000,
        });
      } else {
        toast.success('Session analytics updated successfully!', {
          duration: 4000,
        });
        toast('Speech graph analysis was skipped (not enough participant data).', {
          icon: 'ℹ️',
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Error re-analyzing session:', error);
      toast.error(
        `Failed to re-analyze session: ${error.response?.data?.message || error.message}`,
        {
          duration: 5000,
        }
      );
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
        <div className="w-80 bg-gradient-to-b from-red-50/20 via-white/50 to-white/80 backdrop-blur-xl border-r border-gray-200/50 overflow-y-auto">
          <div className="px-6 py-7 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-base font-semibold text-gray-900 tracking-tight mb-1"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Recent Conversations
                </h2>
                <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-sans)' }}>
                  Last 7 days
                </p>
              </div>
              <button
                onClick={handleRefreshSessions}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh conversations"
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {sessions.map((session) => {
              const isSelected = selectedSession?.id === session.id;
              const statusColor = session.status === 'completed' ? 'bg-emerald-500' :
                                session.status === 'active' ? 'bg-blue-500' : 'bg-gray-400';

              return (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session)}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-300 ${
                    isSelected
                      ? 'border-gray-300 bg-white/90 backdrop-blur-sm shadow-md'
                      : 'border-gray-200/60 bg-white/60 backdrop-blur-sm hover:border-gray-300 hover:bg-white/80 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${statusColor} shadow-sm`} />
                      <span
                        className="text-xs text-gray-500 font-medium"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <p
                      className="text-sm font-semibold text-gray-900 line-clamp-1"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {getSessionParticipants(session)}
                    </p>
                    <p
                      className="text-xs text-gray-600 leading-relaxed line-clamp-2"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {session.aiSummary || session.topic || 'Conversation session'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
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
                  </div>
                  {selectedSession.status === 'completed' && (
                    <button
                      onClick={() => handleReanalyzeSession(selectedSession.id)}
                      disabled={isReanalyzing}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      title="Re-run analytics for this session"
                    >
                      <BarChart3 size={14} />
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

                {/* Speech Graph Analysis */}
                {selectedSession?.status === 'completed' && (
                  <div className="mb-8 pt-8 border-t border-gray-200">
                    <h3
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Speech Graph Analysis
                    </h3>

                    {loadingGraph && (
                      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-center">
                          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#620000] border-r-transparent mb-2"></div>
                          <p className="text-sm text-gray-600">Loading speech graph analysis...</p>
                        </div>
                      </div>
                    )}

                    {graphError && !loadingGraph && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">{graphError}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          Use the "Re-analyze" button above to generate speech graph data.
                        </p>
                      </div>
                    )}

                    {speechGraphData && !loadingGraph && (
                      <>
                        <SpeechGraphMetrics metrics={speechGraphData.metrics} />

                        <div className="mt-6">
                          <h4
                            className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Speech Network Visualization
                          </h4>
                          <div className="border border-gray-200 bg-white" style={{ height: '400px', overflow: 'hidden' }}>
                            <SpeechGraphVisualization
                              nodes={speechGraphData.graph.nodes}
                              links={speechGraphData.graph.links}
                              height={400}
                              animate={false}
                            />
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-3 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                              <span className="text-gray-600 font-medium">Node color:</span>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d73027' }} />
                                <span className="text-gray-500">Low connections</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fee08b' }} />
                                <span className="text-gray-500">Medium</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a9850' }} />
                                <span className="text-gray-500">High connections</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
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

        {/* Right Sidebar - Session Analytics */}
        <div className="w-80 bg-white border-l border-[var(--color-border)] overflow-y-auto">
          <div>
            <div className="px-6 py-7 border-b border-[var(--color-border)]">
              <h2
                className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Session Analytics
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
                Real-time insights
              </p>
            </div>

            <div className="p-6 space-y-8">
            {loadingAnalytics ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-accent)] border-r-transparent"></div>
                <p className="text-xs text-[var(--color-text-muted)] mt-4" style={{ fontFamily: 'var(--font-sans)' }}>
                  Loading analytics...
                </p>
              </div>
            ) : !selectedSession ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <BarChart3 size={20} className="text-[var(--color-accent)]" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Select a conversation to view analytics
                </p>
              </div>
            ) : selectedSession.status !== 'completed' ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <BarChart3 size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Analytics available after
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                  session completion
                </p>
              </div>
            ) : !sessionAnalytics ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-50 flex items-center justify-center">
                  <RefreshCw size={20} className="text-yellow-600" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                  No analytics available
                </p>
                <button
                  onClick={() => selectedSession && handleReanalyzeSession(selectedSession.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] hover:bg-red-100 rounded-lg transition-all duration-200"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <RefreshCw size={12} />
                  Generate analytics
                </button>
              </div>
            ) : (
              <>
                {/* Overall Sentiment */}
                {sessionAnalytics.sentimentAnalysis && (
                  <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                    <p
                      className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Overall Sentiment
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            sessionAnalytics.sentimentAnalysis.overallSentiment === 'positive'
                              ? '#10B981'
                              : sessionAnalytics.sentimentAnalysis.overallSentiment === 'negative'
                              ? '#EF4444'
                              : sessionAnalytics.sentimentAnalysis.overallSentiment === 'mixed'
                              ? '#F59E0B'
                              : '#6B7280',
                        }}
                      />
                      <p
                        className="text-lg font-semibold capitalize"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          color:
                            sessionAnalytics.sentimentAnalysis.overallSentiment === 'positive'
                              ? '#10B981'
                              : sessionAnalytics.sentimentAnalysis.overallSentiment === 'negative'
                              ? '#EF4444'
                              : sessionAnalytics.sentimentAnalysis.overallSentiment === 'mixed'
                              ? '#F59E0B'
                              : '#6B7280',
                        }}
                      >
                        {sessionAnalytics.sentimentAnalysis.overallSentiment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Emotional Tone - Animated Bars */}
                {sessionAnalytics.sentimentAnalysis?.emotionalTone && (
                  <div>
                    <p
                      className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Emotional Tone
                    </p>
                    <div className="space-y-4">
                      {/* Happiness */}
                      <div className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Happiness
                          </span>
                          <span
                            className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {Math.round(sessionAnalytics.sentimentAnalysis.emotionalTone.happiness * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${sessionAnalytics.sentimentAnalysis.emotionalTone.happiness * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Engagement */}
                      <div className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Engagement
                          </span>
                          <span
                            className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {Math.round(sessionAnalytics.sentimentAnalysis.emotionalTone.engagement * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${sessionAnalytics.sentimentAnalysis.emotionalTone.engagement * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Anxiety */}
                      <div className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Anxiety
                          </span>
                          <span
                            className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {Math.round(sessionAnalytics.sentimentAnalysis.emotionalTone.anxiety * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${sessionAnalytics.sentimentAnalysis.emotionalTone.anxiety * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Frustration */}
                      <div className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Frustration
                          </span>
                          <span
                            className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {Math.round(sessionAnalytics.sentimentAnalysis.emotionalTone.frustration * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${sessionAnalytics.sentimentAnalysis.emotionalTone.frustration * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Confusion */}
                      <div className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Confusion
                          </span>
                          <span
                            className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {Math.round(sessionAnalytics.sentimentAnalysis.emotionalTone.confusion * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${sessionAnalytics.sentimentAnalysis.emotionalTone.confusion * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cognitive Indicators */}
                {sessionAnalytics.sentimentAnalysis?.cognitiveIndicators && (
                  <div className="border-t border-[var(--color-border)] pt-8">
                    <p
                      className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Cognitive Indicators
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-lg p-2.5 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                          Clarity
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums" style={{ fontFamily: 'var(--font-sans)' }}>
                          {Math.round(sessionAnalytics.sentimentAnalysis.cognitiveIndicators.clarity * 100)}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                          Coherence
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums" style={{ fontFamily: 'var(--font-sans)' }}>
                          {Math.round(sessionAnalytics.sentimentAnalysis.cognitiveIndicators.coherence * 100)}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                          Memory
                        </p>
                        <p className="text-sm font-semibold capitalize text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                          {sessionAnalytics.sentimentAnalysis.cognitiveIndicators.memoryRecall}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Communication Patterns */}
                {sessionAnalytics.sentimentAnalysis?.communicationPatterns && (
                  <div>
                    <p
                      className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Communication
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-xs text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                          Avg Response Length
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums" style={{ fontFamily: 'var(--font-sans)' }}>
                          {sessionAnalytics.sentimentAnalysis.communicationPatterns.avgResponseLength} <span className="text-xs text-[var(--color-text-muted)] font-normal">words</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-xs text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
                          Questions Asked
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums" style={{ fontFamily: 'var(--font-sans)' }}>
                          {sessionAnalytics.sentimentAnalysis.communicationPatterns.questionAsking}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Positive Indicators */}
                {sessionAnalytics.sentimentAnalysis?.positiveIndicators &&
                  sessionAnalytics.sentimentAnalysis.positiveIndicators.length > 0 && (
                    <div className="border-t border-[var(--color-border)] pt-8">
                      <p
                        className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        Positive Signs
                      </p>
                      <ul className="space-y-2">
                        {sessionAnalytics.sentimentAnalysis.positiveIndicators.map((indicator: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-start gap-2 hover:bg-green-100 transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                            <span className="leading-relaxed">{indicator}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Concern Flags */}
                {sessionAnalytics.sentimentAnalysis?.concernFlags &&
                  sessionAnalytics.sentimentAnalysis.concernFlags.length > 0 && (
                    <div className="border-t border-[var(--color-border)] pt-8">
                      <p
                        className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        Concerns
                      </p>
                      <ul className="space-y-2">
                        {sessionAnalytics.sentimentAnalysis.concernFlags.map((flag: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-start gap-2 hover:bg-amber-100 transition-colors"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            <span className="text-amber-600 font-bold flex-shrink-0">⚠</span>
                            <span className="leading-relaxed">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
