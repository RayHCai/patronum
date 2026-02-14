import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Participant } from '../../types';

export default function PatientSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    photoUrl: '',
    dateOfBirth: '',
    isActive: true,
    caregiver: {
      name: '',
      email: '',
      phone: '',
      relationship: '',
    },
  });

  // Fetch patient data on mount
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/participants/${id}`);
        const patient: Participant = response.data.data;

        // Populate form with existing data
        setFormData({
          name: patient.name || '',
          notes: patient.notes || '',
          photoUrl: patient.photoUrl || '',
          dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
          isActive: patient.isActive,
          caregiver: {
            name: patient.caregiver?.name || '',
            email: patient.caregiver?.email || '',
            phone: patient.caregiver?.phone || '',
            relationship: patient.caregiver?.relationship || '',
          },
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching patient:', err);
        setError('Failed to load patient data');
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPatient();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name.startsWith('caregiver.')) {
      const caregiverField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        caregiver: {
          ...prev.caregiver,
          [caregiverField]: value,
        },
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      // Prepare data for API
      const updateData = {
        name: formData.name,
        notes: formData.notes || undefined,
        photoUrl: formData.photoUrl || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        isActive: formData.isActive,
        caregiver: (formData.caregiver.name || formData.caregiver.email || formData.caregiver.phone || formData.caregiver.relationship)
          ? formData.caregiver
          : undefined,
      };

      await axios.put(`/api/participants/${id}`, updateData);

      setSuccessMessage('Patient information updated successfully!');
      setTimeout(() => {
        navigate(`/admin/patients/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating patient:', err);
      setError(err.response?.data?.message || 'Failed to update patient information');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-3 border-solid border-[var(--color-accent)] border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(`/admin/patients/${id}`)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={16} />
          Back to Patient Profile
        </button>

        <h1
          className="text-xl font-bold tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Patronum
        </h1>

        <div className="w-[140px]" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2
            className="text-3xl font-semibold tracking-tight text-gray-900 mb-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Patient Settings
          </h2>
          <p
            className="text-sm text-gray-600"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Edit patient information and preferences
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800" style={{ fontFamily: 'var(--font-sans)' }}>
              {error}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800" style={{ fontFamily: 'var(--font-sans)' }}>
              {successMessage}
            </p>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3
              className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Basic Information
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="dateOfBirth"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="photoUrl"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Photo URL
                </label>
                <input
                  type="url"
                  id="photoUrl"
                  name="photoUrl"
                  value={formData.photoUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Add any additional notes about the patient..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[var(--color-accent)] border-gray-300 rounded focus:ring-[var(--color-accent)]"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 text-sm font-medium text-gray-700"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Active Patient
                </label>
              </div>
            </div>
          </div>

          {/* Caregiver Information */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3
              className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Caregiver Information
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="caregiver.name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Caregiver Name
                </label>
                <input
                  type="text"
                  id="caregiver.name"
                  name="caregiver.name"
                  value={formData.caregiver.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="caregiver.relationship"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Relationship
                </label>
                <input
                  type="text"
                  id="caregiver.relationship"
                  name="caregiver.relationship"
                  value={formData.caregiver.relationship}
                  onChange={handleInputChange}
                  placeholder="e.g., Daughter, Son, Spouse"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="caregiver.email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="caregiver.email"
                  name="caregiver.email"
                  value={formData.caregiver.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  htmlFor="caregiver.phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="caregiver.phone"
                  name="caregiver.phone"
                  value={formData.caregiver.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/patients/${id}`)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
