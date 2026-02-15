import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X, Edit2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { Participant } from '../../types';

interface PatientPhoto {
  id: string;
  photoUrl: string;
  caption: string | null;
  tags: string[];
  isAIGenerated: boolean;
  timesShown: number;
  uploadedAt: string;
}

export default function PatientSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Photo state
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    photoUrl: '',
    dateOfBirth: '',
    isActive: true,
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

  // Fetch photos
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!id) return;

      try {
        const response = await axios.get(`/api/participants/${id}/photos`);
        setPhotos(response.data.data || []);
      } catch (err) {
        console.error('Error fetching photos:', err);
      }
    };

    fetchPhotos();
  }, [id]);

  // Handle photo file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  // Upload photos with AI captioning
  const handlePhotoUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadingPhotos(true);
      setUploadProgress('Analyzing photos with AI...');

      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('photos', file));

      const response = await axios.post(`/api/participants/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedPhotos = response.data.data.photos;
      setPhotos([...photos, ...uploadedPhotos]);
      setSelectedFiles([]);
      setUploadProgress('');
      setSuccessMessage(`Successfully uploaded ${uploadedPhotos.length} photos with AI-generated captions!`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError('Failed to upload photos. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Delete photo
  const handlePhotoDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await axios.delete(`/api/participants/${id}/photos/${photoId}`);
      setPhotos(photos.filter(p => p.id !== photoId));
      setSuccessMessage('Photo deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
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

          {/* Photo Memory Collection */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3
              className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Photo Memory Collection
            </h3>
            <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'var(--font-sans)' }}>
              Upload photos to spark memories during conversations. AI will automatically generate captions and tags.
            </p>

            {/* Upload Section */}
            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-[var(--color-accent)] hover:text-red-700">
                    Choose photos
                  </span>
                  <input
                    id="photo-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, GIF, or WebP (max 5MB each, up to 10 photos)
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Selected: {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="w-full px-4 py-2 bg-[var(--color-accent)] text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {uploadingPhotos ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadProgress}
                      </span>
                    ) : (
                      'Upload & Analyze with AI'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Photo List */}
            {photos.length > 0 ? (
              <div className="space-y-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group border border-gray-200 rounded-lg bg-white p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {photo.isAIGenerated && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              <Sparkles className="h-3 w-3" />
                              AI Generated
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                          {photo.caption || 'No caption'}
                        </p>
                        {photo.tags && photo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {photo.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Shown {photo.timesShown} {photo.timesShown === 1 ? 'time' : 'times'} • Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePhotoDelete(photo.id)}
                        className="flex-shrink-0 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                  No photos uploaded yet. Add photos to help spark memories during conversations.
                </p>
              </div>
            )}
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
