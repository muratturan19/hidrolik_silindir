import { NavLink } from 'react-router-dom';
import {
  Calculator,
  Settings,
  Cylinder,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    path: '/',
    icon: Calculator,
    label: 'Fiyat Hesapla',
  },
  {
    path: '/parameters',
    icon: Settings,
    label: 'Parametreler',
  },
  {
    path: '/history',
    icon: FileText,
    label: 'Geçmiş',
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
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
        {navItems.map((item) => (
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
  );
}
