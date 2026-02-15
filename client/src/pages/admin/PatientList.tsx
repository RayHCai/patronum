// Admin patient list page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, TrendingUp, TrendingDown, Minus, AlertCircle, Clock, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Participant } from '../../types';
import { getAllParticipants } from '../../services/participants';
import { LoadingScreen } from '../../components/ui';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

// Helper to calculate days since last session
const getDaysSinceLastSession = (patient: Participant): number | null => {
  if (!patient.sessions || patient.sessions.length === 0) return null;
  const lastSession = patient.sessions[patient.sessions.length - 1];
  const lastDate = new Date(lastSession.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Mock engagement trend (would be real AI signal)
const getEngagementTrend = (patient: Participant): 'up' | 'stable' | 'down' => {
  const sessionCount = patient.sessions?.length || 0;
  if (sessionCount >= 5) return 'up';
  if (sessionCount >= 2) return 'stable';
  return 'down';
};

export default function PatientList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch patients from database
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        const data = await getAllParticipants();
        setPatients(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch patients:', err);
        setError(err.message || 'Failed to load patients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const totalPatients = patients.length;
  const activeToday = patients.filter(p => {
    const daysSince = getDaysSinceLastSession(p);
    return daysSince === 0;
  }).length;
  const needsReview = patients.filter(p => {
    const daysSince = getDaysSinceLastSession(p);
    return daysSince !== null && daysSince > 7;
  }).length;
  const newThisWeek = patients.filter(p => {
    const created = new Date(p.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  return (
    <div className="h-screen bg-gray-50 relative overflow-hidden">
      {/* Header - matching PatientProfile navbar */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="w-32"></div>

        <h1
          className="text-xl font-bold tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Patronum
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/patients/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-red-800 transition-colors rounded-lg"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Patient
          </button>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">

            {/* Page Title */}
            <motion.div className="mb-8" initial="hidden" animate="visible" variants={fadeIn}>
              <h2
                className="text-3xl font-semibold text-gray-900 mb-2"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Patients Overview
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
                Monitor and manage patient engagement
              </p>
            </motion.div>

            {isLoading ? (
            <LoadingScreen
              mode="inline"
              size="medium"
              message="Loading patients..."
              subtitle=""
            />
          ) : error ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-red-900 font-semibold mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                Error loading patients
              </p>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
                {error}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <motion.div
                className="grid grid-cols-4 gap-6 mb-8"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" variants={fadeIn}>
                  <p className="text-sm font-medium text-gray-600 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    Total Patients
                  </p>
                  <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                    {totalPatients}
                  </p>
                </motion.div>

                <motion.div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" variants={fadeIn}>
                  <p className="text-sm font-medium text-gray-600 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    Active Today
                  </p>
                  <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                    {activeToday}
                  </p>
                </motion.div>

                <motion.div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" variants={fadeIn}>
                  <p className="text-sm font-medium text-gray-600 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    Needs Review
                  </p>
                  <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                    {needsReview}
                  </p>
                </motion.div>

                <motion.div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" variants={fadeIn}>
                  <p className="text-sm font-medium text-gray-600 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    New This Week
                  </p>
                  <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                    {newThisWeek}
                  </p>
                </motion.div>
              </motion.div>

              {/* Search */}
              <motion.div className="mb-6" initial="hidden" animate="visible" variants={fadeIn}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all shadow-sm"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  />
                </div>
              </motion.div>

              {/* Patient Table */}
              <motion.div
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                initial="hidden"
                animate="visible"
                variants={fadeIn}
              >
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Patient
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Last Session
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Total Sessions
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Engagement
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Status
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-sans)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500" style={{ fontFamily: 'var(--font-sans)' }}>
                          No patients found
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((patient) => {
                        const daysSince = getDaysSinceLastSession(patient);
                        const trend = getEngagementTrend(patient);
                        const sessionCount = patient.sessions?.length || 0;

                        return (
                          <tr
                            key={patient.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/admin/patients/${patient.id}`)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {patient.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                                    {patient.name}
                                  </p>
                                  {patient.notes && (
                                    <p className="text-sm text-gray-500 truncate max-w-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                                      {patient.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-gray-700" style={{ fontFamily: 'var(--font-sans)' }}>
                                <Clock size={14} className="text-gray-400" />
                                {daysSince === null ? (
                                  <span className="text-gray-400">Never</span>
                                ) : daysSince === 0 ? (
                                  <span className="text-green-600 font-medium">Today</span>
                                ) : daysSince === 1 ? (
                                  <span>Yesterday</span>
                                ) : (
                                  <span>{daysSince} days ago</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-sans)' }}>
                                {sessionCount}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {trend === 'up' && <TrendingUp size={16} className="text-green-600" />}
                                {trend === 'stable' && <Minus size={16} className="text-gray-400" />}
                                {trend === 'down' && <TrendingDown size={16} className="text-orange-500" />}
                                <span className={`text-sm font-medium ${
                                  trend === 'up' ? 'text-green-600' :
                                  trend === 'stable' ? 'text-gray-600' :
                                  'text-orange-600'
                                }`} style={{ fontFamily: 'var(--font-sans)' }}>
                                  {trend === 'up' ? 'Improving' : trend === 'stable' ? 'Stable' : 'Declining'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {daysSince !== null && daysSince > 7 ? (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <AlertCircle size={14} />
                                  <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                                    Needs Review
                                  </span>
                                </div>
                              ) : patient.isActive ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200" style={{ fontFamily: 'var(--font-sans)' }}>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200" style={{ fontFamily: 'var(--font-sans)' }}>
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/patients/${patient.id}`);
                                }}
                                className="text-sm font-medium text-[var(--color-accent)] hover:text-red-800"
                                style={{ fontFamily: 'var(--font-sans)' }}
                              >
                                View Profile →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </motion.div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
