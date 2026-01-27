import { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Varsayılan şifre - gerçek uygulamada backend'den kontrol edilmeli
const ADMIN_PASSWORD = 'hidrolik2024';

export function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      // Oturum boyunca yetkilendirmeyi sakla
      sessionStorage.setItem('adminAuth', 'true');
      setPassword('');
      setError('');
      onSuccess();
    } else {
      setError('Yanlış şifre!');
      setPassword('');
    }
  };

  const handleClose = () => {
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
            Bu alana erişmek için yönetici şifresini girin.
          </p>

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
                w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                ${error
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 focus:border-indigo-500'
                }
              `}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Giriş
            </button>
          </div>
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
}
