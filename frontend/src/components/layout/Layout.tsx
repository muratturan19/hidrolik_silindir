import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { UserInfo } from '../../types';

interface LayoutProps {
  currency: string;
  exchangeRate: number;
  onCurrencyChange: (currency: string, rate: number) => void;
  userInfo: UserInfo | null;
}

export function Layout({ currency, exchangeRate, onCurrencyChange, userInfo }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userInfo={userInfo}
      />
      <Header
        sidebarCollapsed={sidebarCollapsed}
        currency={currency}
        exchangeRate={exchangeRate}
        onCurrencyChange={onCurrencyChange}
      />

      <main
        className={`
          pt-16 min-h-screen transition-all duration-300
          ${sidebarCollapsed ? 'pl-16' : 'pl-64'}
        `}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
