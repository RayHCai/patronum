import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createPatient, type CreatePatientData } from '../../services/participants';

export default function CreatePatient() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdPatient, setCreatedPatient] = useState<any>(null);

  const [formData, setFormData] = useState<CreatePatientData>({
    name: '',
    dateOfBirth: '',
    notes: '',
    photoUrl: '',
    caregiver: {
      name: '',
      email: '',
      phone: '',
      relationship: '',
    },
  });

  const handleInputChange = (field: keyof CreatePatientData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCaregiverChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      caregiver: {
        ...prev.caregiver,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Patient name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up caregiver data - only include if at least name is provided
      const cleanedData: CreatePatientData = {
        ...formData,
        caregiver: formData.caregiver?.name
          ? formData.caregiver
          : undefined,
      };

      const result = await createPatient(cleanedData);
      setCreatedPatient(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create patient');
      setIsSubmitting(false);
    }
  };

  if (createdPatient) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          {/* Success Header */}
          <div className="bg-white border border-gray-200 p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-green-50 border border-green-200">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold text-gray-900 tracking-tight"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Patient Created Successfully
                </h1>
                <p
                  className="text-sm text-gray-600 mt-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {createdPatient.name} has been added to the system
                </p>
              </div>
            </div>
          </div>

          {/* Access Link Section */}
          {createdPatient.id && (
            <div className="bg-blue-50 border border-blue-200 p-6 mb-6">
              <h2
                className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Patient Access Link
              </h2>
              <p
                className="text-sm text-gray-700 mb-4"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Share this link with the patient or caregiver. It can be used multiple times and never expires.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/patient/access?id=${createdPatient.id}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 text-xs font-mono select-all focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  onClick={(e) => e.currentTarget.select()}
                  style={{ fontFamily: 'monospace' }}
                />
                <button
                  onClick={() => {
                    const accessUrl = `${window.location.origin}/patient/access?id=${createdPatient.id}`;
                    navigator.clipboard.writeText(accessUrl);
                  }}
                  className="px-4 py-2 bg-[var(--color-accent)] text-white hover:opacity-90 font-medium whitespace-nowrap transition-opacity text-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/admin/patients/${createdPatient.id}`)}
              className="flex-1 px-5 py-2.5 bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity font-medium text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              View Patient Profile
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-5 py-2.5 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Create Another Patient
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/admin/patients')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Back to Patient List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-white to-red-50/20 pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/patients')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4 font-medium"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Patients</span>
          </button>

          <h1
            className="text-3xl font-bold text-gray-900 tracking-tight"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Create New Patient
          </h1>
          <p
            className="text-sm text-gray-600 mt-1"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Add a new patient to the system
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 p-8"
        >
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          )}

          {/* Patient Information */}
          <div className="mb-8">
            <h2
              className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Patient Information
            </h2>

            <div className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  placeholder="Additional notes about the patient..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Caregiver Information */}
          <div className="mb-8 pt-8 border-t border-gray-200">
            <h2
              className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Caregiver Information (Optional)
            </h2>

            <div className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Caregiver Name
                </label>
                <input
                  type="text"
                  value={formData.caregiver?.name || ''}
                  onChange={(e) => handleCaregiverChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  placeholder="Jane Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-900 mb-2"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.caregiver?.email || ''}
                    onChange={(e) => handleCaregiverChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    style={{ fontFamily: 'var(--font-sans)' }}
                    placeholder="caregiver@example.com"
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-900 mb-2"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.caregiver?.phone || ''}
                    onChange={(e) => handleCaregiverChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    style={{ fontFamily: 'var(--font-sans)' }}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-900 mb-2"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.caregiver?.relationship || ''}
                  onChange={(e) => handleCaregiverChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  placeholder="Daughter, Son, Spouse, etc."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/patients')}
              className="flex-1 px-5 py-2.5 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              style={{ fontFamily: 'var(--font-sans)' }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-sans)' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Patient...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
