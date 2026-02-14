// Admin sidebar navigation
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/admin/settings')}
      className="fixed top-8 right-8 z-50 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors rounded-lg"
      title="Settings"
    >
      <Settings size={22} strokeWidth={2} />
    </button>
  );
}
