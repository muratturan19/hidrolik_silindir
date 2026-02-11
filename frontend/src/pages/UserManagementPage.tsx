import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Key, Shield, User, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';

const API_BASE = '/hidrolik-api';

interface UserInfo {
  username: string;
  is_admin: boolean;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mevcut kullanıcı (sessionStorage'dan)
  const currentUser = sessionStorage.getItem('adminUser') || 'admin';
  const isCurrentUserAdmin = sessionStorage.getItem('isAdmin') === 'true';

  // Yeni kullanıcı ekleme form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Şifre değiştirme modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPasswordChange, setNewPasswordChange] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPasswordChange, setShowNewPasswordChange] = useState(false);

  // Şifre sıfırlama modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_username: currentUser })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/users/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: currentUser,
          new_username: newUsername,
          new_password: newPassword,
          is_admin: newIsAdmin
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setNewUsername('');
        setNewPassword('');
        setNewIsAdmin(false);
        setShowAddForm(false);
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Kullanıcı eklenemedi');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`'${username}' kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/users/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: currentUser,
          target_username: username
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Kullanıcı silinemedi');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: passwordTarget,
          old_password: oldPassword,
          new_password: newPasswordChange
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPasswordChange('');
        setPasswordTarget(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Şifre değiştirilemedi');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: currentUser,
          target_username: resetTarget,
          new_password: resetPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setShowResetModal(false);
        setResetPassword('');
        setResetTarget(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Şifre sıfırlanamadı');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
                <p className="text-sm text-gray-500">Sistem kullanıcılarını yönetin</p>
              </div>
            </div>
            {isCurrentUserAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                <UserPlus className="h-4 w-4" />
                Kullanıcı Ekle
              </button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {/* Mesajlar */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Yeni Kullanıcı Formu */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Yeni Kullanıcı Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Kullanıcı adı"
                    required
                    minLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="Şifre (min 6 karakter)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Admin yetkisi ver</span>
                </label>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Ekle
                </button>
              </div>
            </form>
          )}

          {/* Kullanıcı Listesi */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${user.is_admin ? 'bg-amber-100' : 'bg-gray-100'}`}>
                      {user.is_admin ? (
                        <Shield className="h-5 w-5 text-amber-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">
                        {user.is_admin ? 'Yönetici' : 'Kullanıcı'}
                        {user.username === currentUser && ' (Siz)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Kendi şifreni değiştir */}
                    {user.username === currentUser && (
                      <button
                        onClick={() => {
                          setPasswordTarget(user.username);
                          setShowPasswordModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Şifreni Değiştir"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                    )}

                    {/* Admin: Başkasının şifresini sıfırla */}
                    {isCurrentUserAdmin && user.username !== currentUser && (
                      <button
                        onClick={() => {
                          setResetTarget(user.username);
                          setShowResetModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Şifre Sıfırla"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}

                    {/* Admin: Kullanıcı sil */}
                    {isCurrentUserAdmin && user.username !== currentUser && (
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Şifre Değiştirme Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Şifre Değiştir</h3>
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Şifre</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                  <div className="relative">
                    <input
                      type={showNewPasswordChange ? 'text' : 'password'}
                      value={newPasswordChange}
                      onChange={(e) => setNewPasswordChange(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordChange(!showNewPasswordChange)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showNewPasswordChange ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  Değiştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şifre Sıfırlama Modal (Admin) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Şifre Sıfırla</h3>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{resetTarget}</strong> kullanıcısı için yeni şifre belirleyin.
            </p>
            <form onSubmit={handleResetPassword}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                    minLength={6}
                    placeholder="Min 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Sıfırla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
