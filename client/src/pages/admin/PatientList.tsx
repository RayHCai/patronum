// Admin patient list page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Eye, Calendar } from 'lucide-react';
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
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
              <p className="text-gray-600 mt-1">
                Manage participant profiles and view their progress
              </p>
            </div>

            <button
              onClick={() => navigate('/admin/patients/new')}
              className="flex items-center gap-2 px-8 py-4 text-[17px] font-semibold text-white bg-[var(--color-accent)] rounded-md shadow-lg hover:shadow-xl transition-all duration-150"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <Plus size={20} />
              Add Patient
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              {/* Filter buttons */}
              <button
                onClick={() => setFilterActive(null)}
                className={`px-8 py-4 text-[17px] font-semibold rounded-md transition-all duration-150 ${
                  filterActive === null
                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                    : 'text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] hover:border-[var(--color-text-primary)]'
                }`}
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                All
              </button>
              <button
                onClick={() => setFilterActive(true)}
                className={`px-8 py-4 text-[17px] font-semibold rounded-md transition-all duration-150 ${
                  filterActive === true
                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                    : 'text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] hover:border-[var(--color-text-primary)]'
                }`}
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Active
              </button>
              <button
                onClick={() => setFilterActive(false)}
                className={`px-8 py-4 text-[17px] font-semibold rounded-md transition-all duration-150 ${
                  filterActive === false
                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                    : 'text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] hover:border-[var(--color-text-primary)]'
                }`}
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Patient List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading patients...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-red-600 text-lg font-semibold mb-2">Error loading patients</p>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-600 text-lg">No patients found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPatients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {patient.name.split(' ').map((n) => n[0]).join('')}
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {patient.name}
                        </h3>
                        {patient.notes && (
                          <p className="text-gray-600 mt-1">{patient.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              patient.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {patient.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar size={16} />
                            Joined {new Date(patient.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => navigate(`/admin/patients/${patient.id}`)}
                      className="flex items-center gap-2 px-8 py-4 text-[17px] font-semibold text-[var(--color-text-primary)] border-2 border-[var(--color-border-hover)] rounded-md hover:border-[var(--color-text-primary)] transition-all duration-150"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      <Eye size={20} />
                      View Profile
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
