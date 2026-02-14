// Admin patient profile page with detailed analytics
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MessageSquare, Brain, TrendingUp } from 'lucide-react';
import AdminSidebar from '../../components/admin/Sidebar';
import { Participant, Session } from '../../types';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Participant | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'analytics'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data
  useEffect(() => {
    setTimeout(() => {
      const mockPatient: Participant = {
        id: id!,
        name: 'John Doe',
        notes: 'Enjoys talking about gardening and family',
        dateOfBirth: '1950-05-15',
        isActive: true,
        createdAt: '2024-01-15',
        caregiver: {
          name: 'Mary Doe',
          relationship: 'Daughter',
          email: 'mary@example.com',
          phone: '(555) 123-4567',
        },
        agents: [
          {
            id: '1',
            participantId: id!,
            name: 'Mary Johnson',
            avatarColor: '#8B5CF6',
            voiceId: 'voice1',
            age: 68,
            background: { occupation: 'Teacher' },
            personality: { traits: ['Warm'] },
            createdAt: '2024-01-15',
          },
        ],
      };

      const mockSessions: Session[] = [
        {
          id: '1',
          participantId: id!,
          topic: 'Food & Cooking',
          status: 'completed',
          startedAt: '2024-02-10T14:00:00Z',
          endedAt: '2024-02-10T14:25:00Z',
        },
        {
          id: '2',
          participantId: id!,
          topic: 'Family & Friends',
          status: 'completed',
          startedAt: '2024-02-08T15:30:00Z',
          endedAt: '2024-02-08T15:50:00Z',
        },
      ];

      setPatient(mockPatient);
      setSessions(mockSessions);
      setIsLoading(false);
    }, 500);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <button
            onClick={() => navigate('/admin/patients')}
            className="flex items-center gap-2 text-[15px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={20} />
            Back to Patients
          </button>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                  {patient.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                  {patient.dateOfBirth && (
                    <p className="text-gray-600 mt-1">
                      Age: {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                    </p>
                  )}
                  {patient.notes && (
                    <p className="text-gray-700 mt-2">{patient.notes}</p>
                  )}
                </div>
              </div>

              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  patient.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {patient.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Caregiver Info */}
            {patient.caregiver && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Caregiver Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{patient.caregiver.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Relationship</p>
                    <p className="font-medium">{patient.caregiver.relationship}</p>
                  </div>
                  {patient.caregiver.email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{patient.caregiver.email}</p>
                    </div>
                  )}
                  {patient.caregiver.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{patient.caregiver.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="text-blue-600" size={24} />
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="text-purple-600" size={24} />
                <p className="text-sm text-gray-600">AI Agents</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{patient.agents?.length || 0}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-600" size={24} />
                <p className="text-sm text-gray-600">Engagement</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">92%</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-orange-600" size={24} />
                <p className="text-sm text-gray-600">Last Session</p>
              </div>
              <p className="text-xl font-bold text-gray-900">2 days ago</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex gap-8 px-6">
                {['overview', 'sessions', 'analytics'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-4 px-2 border-b-2 font-semibold transition-colors ${
                      activeTab === tab
                        ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                        : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{session.topic}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(session.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {session.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">All Sessions</h3>
                  <p className="text-gray-600">Full session history and details coming soon...</p>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Analytics & Insights</h3>
                  <p className="text-gray-600">Detailed analytics visualizations coming in Phase 11...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
