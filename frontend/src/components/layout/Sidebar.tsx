import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calculator,
  Settings,
  Cylinder,
  FileText,
  Table2,
  ChevronLeft,
  ChevronRight,
  Shield,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { PasswordModal, isAdminAuthenticated } from '../ui/PasswordModal';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const mainNavItems = [
  {
    path: '/',
    icon: Calculator,
    label: 'Fiyat Hesapla',
  },
  {
    path: '/history',
    icon: FileText,
    label: 'Geçmiş',
  },
];

const adminNavItems = [
  {
    path: '/parameters',
    icon: Settings,
    label: 'Parametreler',
  },
  {
    path: '/excel-settings',
    icon: Table2,
    label: 'Excel Tablosu',
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const handleAdminItemClick = (path: string, e: React.MouseEvent) => {
    e.preventDefault();

    if (isAdminAuthenticated()) {
      navigate(path);
    } else {
      setPendingPath(path);
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  };

  return (
    <>
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out z-40
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Cylinder className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-base font-bold text-gray-900 whitespace-nowrap">
                  Hidrolik Silindir
                </h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                  Fiyatlandırma
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {/* Ana Menü */}
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group
                ${isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  {!collapsed && (
                    <span className="font-medium whitespace-nowrap">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Yönetim Bölümü */}
          {!collapsed && (
            <div className="pt-4">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Yönetim</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    adminExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {adminExpanded && (
                <div className="mt-1 space-y-1">
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={(e) => handleAdminItemClick(item.path, e)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 group
                        ${isActive
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-5 w-5 flex-shrink-0 ${
                              isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`}
                          />
                          <span className="font-medium whitespace-nowrap flex-1">{item.label}</span>
                          {!isAdminAuthenticated() && (
                            <Lock className="h-3.5 w-3.5 text-gray-300" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapsed durumda admin ikonları */}
          {collapsed && (
            <div className="pt-4 border-t border-gray-100 mt-4 space-y-1">
              {adminNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={(e) => handleAdminItemClick(item.path, e)}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 group relative"
                  title={item.label}
                >
                  <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                  {!isAdminAuthenticated() && (
                    <Lock className="h-2.5 w-2.5 text-amber-500 absolute top-1.5 right-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="
            absolute -right-3 top-20
            w-6 h-6 rounded-full
            bg-white border border-gray-200
            shadow-sm hover:shadow-md
            flex items-center justify-center
            text-gray-400 hover:text-gray-600
            transition-all duration-200
          "
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Footer */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>GPT-5.2 Aktif</span>
            </div>
          </div>
        )}
      </aside>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingPath(null);
        }}
        onSuccess={handlePasswordSuccess}
      />
    </>
  );
}
