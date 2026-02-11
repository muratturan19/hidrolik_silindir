import { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config';

const API_BASE = '/hidrolik-api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standalone modda auth kontrolü yapma
    if (!APP_CONFIG.IS_PORTAL) {
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 1. Önce session storage kontrolü (Hızlı geçiş için)
      if (sessionStorage.getItem('adminAuth') === 'true') {
        setIsAuthenticated(true);
        setLoading(false);
        // Arka planda yine de doğrula
        await verifyToken();
        return;
      }

      // 2. Token kontrolü (SSO)
      await verifyToken();

    } catch (err) {
      // Hata durumunda portal login'e yönlendir
      redirectToPortal();
    }
  };

  const verifyToken = async () => {
    try {
      // API_BASE şu an '/api' olmalı (vite proxy veya nginx üzerinden)
      // Ancak mevcut kodda backend /users/.. diye path bekliyor olabilir.
      // Auth router: /auth/me
      const res = await fetch(`${API_BASE}/auth/me`);
      
      if (res.ok) {
        const data = await res.json();
        // Session storage güncelle
        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('adminUser', data.username);
        sessionStorage.setItem('isAdmin', data.is_admin ? 'true' : 'false');
        
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        throw new Error('Not authenticated');
      }
    } catch (error) {
       redirectToPortal();
    }
  };

  const redirectToPortal = () => {
    sessionStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setLoading(false);
    // Portal Login sayfasına fiziksel yönlendirme
    window.location.href = '/login'; 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return null; // Redirecting...
}

