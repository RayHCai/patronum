// Admin patient list page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar } from 'lucide-react';
import AdminSidebar from '../../components/admin/Sidebar';
import { Participant } from '../../types';
import { getAllParticipants } from '../../services/participants';

export default function PatientList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
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
    const matchesFilter = filterActive === null || patient.isActive === filterActive;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
      {/* Soft gradient background - matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      <AdminSidebar />

      <div className="flex-1 overflow-auto relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-end justify-between border-b border-gray-200 pb-6">
              <div>
                <h1
                  className="text-4xl font-bold tracking-tight text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Patients
                </h1>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Manage participant profiles and view their progress
                </p>
              </div>

              <button
                onClick={() => navigate('/admin/patients/new')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-opacity"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <Plus size={18} strokeWidth={2.5} />
                Add Patient
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-gray-200 mb-6">
            <div className="p-4 flex gap-3 items-center">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              {/* Filter buttons */}
              <div className="flex gap-1 border border-gray-300">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterActive === null
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                    filterActive === true
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                    filterActive === false
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Patient List */}
          {isLoading ? (
            <div className="text-center py-12 bg-white border border-gray-200">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-3 border-solid border-[var(--color-accent)] border-r-transparent"></div>
              <p className="mt-3 text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
                Loading patients...
              </p>
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 p-8 text-center">
              <p className="text-red-900 text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                Error loading patients
              </p>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
                {error}
              </p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 text-center">
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                No patients found
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/admin/patients/${patient.id}`)}
                  className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-[var(--color-accent)] flex items-center justify-center text-white font-semibold text-sm">
                        {patient.name.split(' ').map((n) => n[0]).join('')}
                      </div>

                      {/* Info */}
                      <div>
                        <h3
                          className="text-base font-semibold text-gray-900"
                          style={{ fontFamily: 'var(--font-sans)' }}
                        >
                          {patient.name}
                        </h3>
                        {patient.notes && (
                          <p
                            className="text-sm text-gray-600 mt-0.5"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            {patient.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                              patient.isActive
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {patient.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={14} />
                            {new Date(patient.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
