// Admin sidebar navigation
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, BarChart3, Settings, Home, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuthStore();

  const menuItems = [
    { icon: Users, label: 'Patients', path: '/admin/patients' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/auth/login');
  };

  return (
    <div className="w-64 h-screen flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-6 py-8 border-b border-gray-200">
        <h1
          className="text-xl font-bold tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Patronum Admin
        </h1>
        {admin && (
          <p
            className="text-xs text-gray-500 mt-1 font-medium"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {admin.name}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <button
          onClick={handleGoHome}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <Home size={18} strokeWidth={2} />
          <span>Home</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
