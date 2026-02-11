import { useState } from 'react';
import { Lock, X, Eye, EyeOff, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/hidrolik-api';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        // Oturum bilgilerini sakla
        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('adminUser', data.user.username);
        sessionStorage.setItem('isAdmin', data.user.is_admin ? 'true' : 'false');
        setUsername('');
        setPassword('');
        setError('');
        onSuccess();
      } else {
        setError(data.message || 'Giriş başarısız');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">Yönetici Girişi</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-600 text-sm mb-4">
            Bu alana erişmek için kullanıcı bilgilerinizi girin.
          </p>

          {/* Kullanıcı Adı */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="Kullanıcı adı"
                className={`
                  w-full px-4 py-3 pl-11 rounded-xl border-2 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                  ${error
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-indigo-500'
                  }
                `}
                autoFocus
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Şifre */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Şifre"
                className={`
                  w-full px-4 py-3 pl-11 pr-12 rounded-xl border-2 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                  ${error
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-indigo-500'
                  }
                `}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş'}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Varsayılan: admin / Admin123!
          </p>
        </form>
      </div>
    </div>
  );
}

// Yetkilendirme kontrolü için yardımcı fonksiyon
export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem('adminAuth') === 'true';
}

// Oturumu sonlandırma
export function clearAdminAuth(): void {
  sessionStorage.removeItem('adminAuth');
  sessionStorage.removeItem('adminUser');
  sessionStorage.removeItem('isAdmin');
}

// Mevcut kullanıcı bilgisi
export function getCurrentUser(): { username: string; isAdmin: boolean } | null {
  const auth = sessionStorage.getItem('adminAuth');
  if (auth !== 'true') return null;

  return {
    username: sessionStorage.getItem('adminUser') || '',
    isAdmin: sessionStorage.getItem('isAdmin') === 'true'
  };
}
