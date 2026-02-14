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
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">AI CST Admin</h1>
        {admin && (
          <p className="text-sm text-slate-400 mt-1">
            {admin.name}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-md mb-2 text-[15px] font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--color-accent)] text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white border-2 border-transparent'
              }`}
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleGoHome}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-md text-[15px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-white border-2 border-transparent transition-all duration-150"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-md text-[15px] font-semibold text-red-400 hover:bg-red-900/20 hover:text-red-300 border-2 border-transparent transition-all duration-150"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
