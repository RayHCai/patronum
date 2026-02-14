import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <motion.div
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Patient Created Successfully!
                </h1>
                <p className="text-gray-600 mt-1">
                  {createdPatient.name} has been added to the system
                </p>
              </div>
            </div>
          </motion.div>

          {/* Access Link Section */}
          {createdPatient.id && (
            <motion.div
              className="bg-blue-50 rounded-2xl border border-blue-200 p-8 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Patient Access Link
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Share this link with the patient or caregiver. It can be used multiple times and never expires.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={`${window.location.origin}/patient/access?id=${createdPatient.id}`}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-mono select-all"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => {
                    const accessUrl = `${window.location.origin}/patient/access?id=${createdPatient.id}`;
                    navigator.clipboard.writeText(accessUrl);
                    // Optional: Add toast notification here
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold whitespace-nowrap transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            className="flex gap-4 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => navigate(`/admin/patients/${createdPatient.id}`)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Patient Profile
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Create Another Patient
            </button>
          </motion.div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/admin/patients')}
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Back to Patient List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/patients')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Patients</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Create New Patient</h1>
          <p className="text-gray-600 mt-1">
            Add a new patient to the system
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-sm font-medium text-red-800">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Patient Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Additional notes about the patient..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Caregiver Information */}
          <div className="mb-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Caregiver Information (Optional)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caregiver Name
                </label>
                <input
                  type="text"
                  value={formData.caregiver?.name || ''}
                  onChange={(e) => handleCaregiverChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.caregiver?.email || ''}
                    onChange={(e) => handleCaregiverChange('email', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="caregiver@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.caregiver?.phone || ''}
                    onChange={(e) => handleCaregiverChange('phone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.caregiver?.relationship || ''}
                  onChange={(e) => handleCaregiverChange('relationship', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Daughter, Son, Spouse, etc."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/patients')}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
