import React, { useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { 
  getRegisteredAdminUsers, 
  saveRegisteredAdminUsers, 
  deleteAdminUserLocal, 
  removeDeletedUserIdentifier, 
  isUserDeleted 
} from '../data/initialUsers';
import { ROLE_DEFINITIONS, ALL_ROLES } from '../data/rolesPermissions';
import { 
  fetchAdminUsersFromSupabase,
  syncAllAdminUsersToSupabase,
  insertAdminUserToSupabase,
  updateAdminUserInSupabase,
  deleteAdminUserFromSupabase,
  isSupabaseConnected,
  ADMIN_USERS_SETUP_SQL
} from '../lib/supabaseClient';
import { 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  KeyRound, 
  Copy, 
  Check, 
  Database, 
  Sparkles, 
  X,
  Shield,
  Layers,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sliders,
  Info,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'users' | 'matrix' | 'rls'>('users');

  const [users, setUsers] = useState<AdminUser[]>(() => {
    return getRegisteredAdminUsers();
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; username?: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ALL_ROLES[1]); // Default Koordinator Lomba
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);
  const [copiedTableSql, setCopiedTableSql] = useState(false);
  const [showMissingTableModal, setShowMissingTableModal] = useState(false);

  // Supabase State
  const [isLiveConnected, setIsLiveConnected] = useState(isSupabaseConnected());
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [fetchingSupabase, setFetchingSupabase] = useState(false);

  // Sync to localStorage
  const saveUsers = (updated: AdminUser[]) => {
    setUsers(updated);
    saveRegisteredAdminUsers(updated);
  };

  // Sync state listener
  useEffect(() => {
    const handleCredsUpdated = () => {
      setIsLiveConnected(isSupabaseConnected());
    };
    window.addEventListener('supabase_credentials_updated', handleCredsUpdated);

    // Initial check: if connected, try to fetch remote users silently
    if (isSupabaseConnected()) {
      fetchAdminUsersFromSupabase().then(({ data, error }) => {
        if (data && data.length > 0) {
          setUsers((current) => {
            const validRemote = data.filter((u) => !isUserDeleted(u.id, u.username));
            const remoteIds = new Set(validRemote.map((u) => u.id));
            const kept = current.filter((u) => !remoteIds.has(u.id) && !isUserDeleted(u.id, u.username));
            const merged = [...validRemote, ...kept];
            saveRegisteredAdminUsers(merged);
            return merged;
          });
        }
      }).catch(console.warn);
    }

    return () => {
      window.removeEventListener('supabase_credentials_updated', handleCredsUpdated);
    };
  }, []);

  // Sync all local users to Supabase
  const handleSyncToSupabase = async () => {
    if (!isSupabaseConnected()) {
      setToastMessage('Supabase belum terhubung. Konfigurasi kredensial di tab "Database Supabase" terlebih dahulu.');
      setTimeout(() => setToastMessage(''), 5000);
      return;
    }
    setSyncingSupabase(true);
    try {
      const res = await syncAllAdminUsersToSupabase(users);
      if (res.success) {
        setToastMessage(`Berhasil menyinkronkan ${res.count} akun panitia ke tabel "admin_users" Supabase!`);
      } else {
        setToastMessage(`Gagal sinkronisasi: ${res.error}`);
        if (res.missingTable || res.error?.toLowerCase().includes('admin_users') || res.error?.toLowerCase().includes('schema cache')) {
          setShowMissingTableModal(true);
        }
      }
    } catch (err: any) {
      setToastMessage(`Terjadi kesalahan: ${err.message}`);
      if (err.message?.toLowerCase().includes('admin_users') || err.message?.toLowerCase().includes('schema cache')) {
        setShowMissingTableModal(true);
      }
    } finally {
      setSyncingSupabase(false);
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  // Fetch users from Supabase and merge
  const handleFetchFromSupabase = async () => {
    if (!isSupabaseConnected()) {
      setToastMessage('Supabase belum terhubung. Konfigurasi kredensial di tab "Database Supabase" terlebih dahulu.');
      setTimeout(() => setToastMessage(''), 5000);
      return;
    }
    setFetchingSupabase(true);
    try {
      const { data, error } = await fetchAdminUsersFromSupabase();
      if (error) {
        setToastMessage(`Gagal memuat akun dari Supabase: ${error}`);
      } else if (data && data.length > 0) {
        const remoteIds = new Set(data.map((u) => u.id));
        const keptLocals = users.filter((u) => !remoteIds.has(u.id));
        const merged = [...data, ...keptLocals];
        saveUsers(merged);
        setToastMessage(`Berhasil memuat ${data.length} akun panitia dari database Supabase!`);
      } else {
        setToastMessage('Tabel "admin_users" di Supabase masih kosong. Silakan klik "Kirim ke Supabase" untuk sinkronisasi.');
      }
    } catch (err: any) {
      setToastMessage(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setFetchingSupabase(false);
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  // Change user role on the fly
  const handleRoleChange = (userId: string, newRole: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });
    saveUsers(updated);

    // If changing the currently logged in user's role
    const currentActive = localStorage.getItem('hsn2026_admin_user') || sessionStorage.getItem('hsn2026_admin_user');
    const targetUser = updated.find((u) => u.id === userId);
    if (targetUser && (targetUser.username === currentActive || targetUser.fullName === currentActive)) {
      if (localStorage.getItem('hsn2026_admin_role')) {
        localStorage.setItem('hsn2026_admin_role', newRole);
      }
      if (sessionStorage.getItem('hsn2026_admin_role')) {
        sessionStorage.setItem('hsn2026_admin_role', newRole);
      }
    }

    // Real-time update to Supabase
    if (targetUser && isSupabaseConnected()) {
      updateAdminUserInSupabase(targetUser).catch(console.warn);
    }

    setToastMessage(`Peran untuk "${targetUser?.fullName}" berhasil diperbarui menjadi "${newRole}".`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim() || !username.trim() || !password.trim()) return;

    // Check duplicate username
    if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setFormError('Username ini sudah terdaftar. Silakan pilih username lain.');
      return;
    }

    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role,
      email: email.trim() || `${username.trim().toLowerCase()}@hsnponcokusumo.nu`,
      phone: phone.trim() || '0812-XXXX-XXXX',
      createdAt: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      isActive: true,
    };

    removeDeletedUserIdentifier(newUser.username);
    removeDeletedUserIdentifier(newUser.id);

    const updated = [newUser, ...users];
    saveUsers(updated);
    setShowAddModal(false);

    // Real-time insert to Supabase
    if (isSupabaseConnected()) {
      insertAdminUserToSupabase(newUser).catch(console.warn);
    }

    // Reset form
    setFullName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');

    setToastMessage(`Akun ${newUser.fullName} (${newUser.username}) dengan peran "${newUser.role}" berhasil dibuat!`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === 'user-1' || (userToDelete.username && userToDelete.username.toLowerCase() === 'admin')) {
      setToastMessage('Akun Super Admin sistem utama tidak dapat dihapus demi keamanan sistem.');
      setUserToDelete(null);
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }

    const targetUser = users.find((u) => u.id === userToDelete.id);
    const targetUsername = userToDelete.username || targetUser?.username;

    // Hapus dari data lokal dan tandai secara permanen di daftar blacklist akun terhapus
    const updated = deleteAdminUserLocal(userToDelete.id, targetUsername);
    setUsers(updated);

    // Hapus dari Supabase secara permanen
    if (isSupabaseConnected()) {
      deleteAdminUserFromSupabase(userToDelete.id, targetUsername).catch(console.warn);
    }

    setToastMessage(`Akun panitia "${userToDelete.name}" telah berhasil dihapus secara permanen.`);
    setUserToDelete(null);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const sqlSample = `-- 1. Skrip Pembuatan Tabel Panitia / Admin Users di Supabase
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Aktifkan Akses RLS untuk CMS Admin
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all admin_users" ON admin_users;
CREATE POLICY "Public all admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- 3. (Opsional) Supabase Auth Users jika menggunakan otentikasi Supabase Auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'juri.tahfidz@hsnponcokusumo.nu',
  crypt('santri2026', gen_salt('bf')),
  now(),
  '{"full_name":"Ustadz Verifikator","role":"Divisi Regristrasi & Verifikator"}',
  now(),
  now()
) ON CONFLICT DO NOTHING;`;

  const rlsSqlSample = `-- ==========================================================
-- ATURAN KEAMANAN ROW LEVEL SECURITY (RLS) HSN 2026
-- ==========================================================

-- 1. Keamanan Tabel admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all admin_users" ON admin_users;
CREATE POLICY "Public all admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- 2. Keamanan Tabel participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Publik dapat mendaftar lomba
DROP POLICY IF EXISTS "Publik dapat mendaftar lomba" ON participants;
CREATE POLICY "Publik dapat mendaftar lomba"
ON participants FOR INSERT
WITH CHECK (true);

-- Publik dapat cek status pendaftaran
DROP POLICY IF EXISTS "Publik cek status pendaftaran" ON participants;
CREATE POLICY "Publik cek status pendaftaran"
ON participants FOR SELECT
USING (true);

-- Panitia & Juri dapat verifikasi berkas
DROP POLICY IF EXISTS "Panitia verifikasi berkas" ON participants;
CREATE POLICY "Panitia verifikasi berkas"
ON participants FOR UPDATE
USING (true);

-- Super Admin dapat menghapus data peserta
DROP POLICY IF EXISTS "Super Admin hapus peserta" ON participants;
CREATE POLICY "Super Admin hapus peserta"
ON participants FOR DELETE
USING (true);`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#020e19] border border-white/10">
        <button
          onClick={() => setSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            subTab === 'users'
              ? 'bg-[#006B4F] text-[#F2C96D] border border-[#D9B45B]/40 shadow-sm'
              : 'text-[#DDE7E8] hover:bg-white/5'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Daftar Panitia & Akun ({users.length})</span>
        </button>

        <button
          onClick={() => setSubTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            subTab === 'matrix'
              ? 'bg-[#006B4F] text-[#00D9F5] border border-[#00D9F5]/40 shadow-sm'
              : 'text-[#DDE7E8] hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#00D9F5]" />
          <span>Matriks Hak Akses (RBAC Matrix)</span>
        </button>

        <button
          onClick={() => setSubTab('rls')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            subTab === 'rls'
              ? 'bg-[#006B4F] text-[#F2C96D] border border-[#D9B45B]/40 shadow-sm'
              : 'text-[#DDE7E8] hover:bg-white/5'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Aturan Keamanan Database (RLS)</span>
        </button>
      </div>

      {/* SUB-TAB 1: DAFTAR AKUN PANITIA & QUICK ROLE SELECTOR */}
      {subTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#020e19] border border-white/10">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F2C96D]" />
                <span>Daftar Pengguna & Hak Akses Panitia ({users.length})</span>
              </h3>
              <p className="text-xs text-[#DDE7E8]/70 mt-0.5">
                Anda dapat mengubah peran panitia secara langsung melalui pilihan dropdown di kolom <strong>Peran / Divisi</strong>.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#00D9F5]/20 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Panitia Baru</span>
            </button>
          </div>

          {/* Supabase Synchronization Control Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#006B4F]/30 via-[#020e19] to-[#008F72]/20 border border-[#00D9F5]/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isLiveConnected ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
              }`}>
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-bold text-white">
                    Sinkronisasi Database Supabase
                  </h4>
                  {isLiveConnected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      TERHUBUNG
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      OFFLINE (LOKAL)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#DDE7E8]/70 mt-0.5">
                  Simpan dan kelola seluruh {users.length} data panitia di tabel <code className="text-[#F2C96D]">admin_users</code> Supabase secara terpusat.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleFetchFromSupabase}
                disabled={fetchingSupabase}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title="Unduh data akun panitia terbaru dari database Supabase"
              >
                <DownloadCloud className={`w-3.5 h-3.5 text-[#00D9F5] ${fetchingSupabase ? 'animate-bounce' : ''}`} />
                <span>{fetchingSupabase ? 'Memuat...' : 'Tarik dari Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={syncingSupabase}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 border border-[#00D9F5]/40 text-[#00D9F5] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                title="Unggah seluruh akun panitia CMS ke tabel admin_users Supabase"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-bounce' : ''}`} />
                <span>{syncingSupabase ? 'Menyinkronkan...' : 'Kirim ke Supabase'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-[#020e19] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[#DDE7E8]/70 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Nama Panitia</th>
                    <th className="py-3 px-4">Username Login</th>
                    <th className="py-3 px-4">Peran / Hak Akses (Ubah Langsung)</th>
                    <th className="py-3 px-4">Kontak (Email / WA)</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {users.map((u) => {
                    const roleInfo = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS['Sekretariat Utama HSN 2026'];
                    const isSuper = u.id === 'user-1';

                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#006B4F]/40 border border-[#D9B45B]/40 flex items-center justify-center text-[#F2C96D] text-xs font-bold shrink-0">
                              {u.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{u.fullName}</span>
                                {isSuper && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D9B45B]/20 text-[#F2C96D] border border-[#D9B45B]/40">
                                    UTAMA
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#DDE7E8]/60 font-normal">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono px-2 py-0.5 rounded bg-white/10 text-[#00D9F5] text-[11px]">
                            {u.username}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Shield className="w-3 h-3 text-[#F2C96D]" />
                              {u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#031525] border border-white/20 text-[#F2C96D] text-xs font-semibold focus:outline-none focus:border-[#00D9F5] cursor-pointer hover:border-white/40"
                              title="Ubah peran hak akses pengguna ini"
                            >
                              {ALL_ROLES.map((r) => (
                                <option key={r} value={r} className="bg-[#031525] text-white">
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#DDE7E8]/80 text-[11px]">
                          <div>{u.email}</div>
                          <div className="text-[#DDE7E8]/60">{u.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#DDE7E8]/60 text-[11px]">
                          {u.createdAt}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Aktif
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!isSuper ? (
                            <button
                              onClick={() => setUserToDelete({ id: u.id, name: u.fullName, username: u.username })}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors"
                              title="Hapus Akun Panitia"
                              aria-label="Hapus Akun Panitia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#DDE7E8]/40 italic">Permanen</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MATRIKS HAK AKSES & WEWENANG (RBAC MATRIX) */}
      {subTab === 'matrix' && (
        <div className="space-y-6 animate-fade-in">
          {/* Explanation Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#006B4F]/30 via-[#031525] to-[#008F72]/20 border border-[#00D9F5]/40 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00D9F5]/20 border border-[#00D9F5]/40 flex items-center justify-center text-[#00D9F5] shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-bold text-white">
                Struktur Role-Based Access Control (RBAC) Festival HSN 2026
              </h3>
              <p className="text-xs text-[#DDE7E8]/80 leading-relaxed">
                Pengaturan hak akses membagi panitia menjadi 5 tingkatan divisi operasional. Pembatasan diterapkan pada tingkat antarmuka pengguna (UI Guard), sesi verifikasi (Session Claims), dan query database.
              </p>
            </div>
          </div>

          {/* RBAC Matrix Table */}
          <div className="rounded-2xl bg-[#020e19] border border-white/10 overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#F2C96D]" />
                <h4 className="font-heading text-sm font-bold text-white">
                  Matriks Perbandingan Wewenang Antar Peran
                </h4>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Akses Penuh
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Terbatas / Read Only
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> Dibatasi
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[#DDE7E8]/70 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Peran Panitia</th>
                    <th className="py-3 px-3 text-center">Verifikasi Peserta</th>
                    <th className="py-3 px-3 text-center">Kelola Lomba</th>
                    <th className="py-3 px-3 text-center">Kelola Akun</th>
                    <th className="py-3 px-3 text-center">Ekspor CSV</th>
                    <th className="py-3 px-3 text-center">Arsip Berkas</th>
                    <th className="py-3 px-3 text-center">Deploy Vercel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {ALL_ROLES.map((r) => {
                    const info = ROLE_DEFINITIONS[r];
                    const caps = info.capabilities;

                    return (
                      <tr key={r} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${info.badgeColor} border ${info.borderColor}`}>
                              {info.shortTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#DDE7E8]/70 font-normal mt-1 leading-normal">
                            {info.description}
                          </p>
                        </td>

                        {/* Verifikasi Peserta */}
                        <td className="py-4 px-3 text-center">
                          {caps.verifyParticipants === 'FULL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Penuh
                            </span>
                          ) : caps.verifyParticipants === 'VIEW_ONLY' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Lihat Saja
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              <XCircle className="w-3 h-3" /> Tidak
                            </span>
                          )}
                        </td>

                        {/* Kelola Lomba */}
                        <td className="py-4 px-3 text-center">
                          {caps.manageCompetitions === 'FULL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Penuh
                            </span>
                          ) : caps.manageCompetitions === 'VIEW_ONLY' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Lihat Saja
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              <XCircle className="w-3 h-3" /> Tidak
                            </span>
                          )}
                        </td>

                        {/* Kelola Akun */}
                        <td className="py-4 px-3 text-center">
                          {caps.manageUsers === 'FULL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Ya
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              <XCircle className="w-3 h-3" /> Dibatasi
                            </span>
                          )}
                        </td>

                        {/* Ekspor Data */}
                        <td className="py-4 px-3 text-center">
                          {caps.exportData ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Ya
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              <XCircle className="w-3 h-3" /> Tidak
                            </span>
                          )}
                        </td>

                        {/* Arsip Berkas */}
                        <td className="py-4 px-3 text-center">
                          {caps.manageDocuments === 'FULL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Kelola
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Unduh
                            </span>
                          )}
                        </td>

                        {/* Deploy Vercel */}
                        <td className="py-4 px-3 text-center">
                          {caps.accessDeployment ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                              <CheckCircle className="w-3 h-3" /> Penuh
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              <XCircle className="w-3 h-3" /> Tidak
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ketentuan Khusus Verifikasi Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Ketentuan Khusus Verifikasi & Pengelolaan Peserta:</span>
              <p className="text-[#DDE7E8]/80 text-[11px] leading-relaxed">
                Hanya <strong>Super Admin (Sekretariat Utama)</strong> dan <strong>Divisi Regristrasi & Verifikator</strong> yang memiliki wewenang untuk memverifikasi peserta (mengubah status menjadi Terverifikasi/Ditolak/Menunggu). Bagi pengguna dengan peran lainnya, menu <strong>AKSI & KELOLA</strong> peserta otomatis dinonaktifkan.
              </p>
            </div>
          </div>

          {/* Step by step guide: How to change roles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#006B4F] text-[#F2C96D] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h5 className="font-bold text-white text-sm">Ubah Peran Pengguna</h5>
              <p className="text-[#DDE7E8]/70 leading-relaxed text-[11px]">
                Buka tab <strong>"Daftar Panitia & Akun"</strong>. Pada baris pengguna yang ingin diubah, klik menu pilihan pada kolom <strong>Peran / Divisi</strong> lalu pilih jabatan baru. Perubahan langsung tersimpan seketika.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#006B4F] text-[#00D9F5] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h5 className="font-bold text-white text-sm">Sesi Otomatis Menyesuaikan</h5>
              <p className="text-[#DDE7E8]/70 leading-relaxed text-[11px]">
                Saat pengguna tersebut login, sistem akan membaca metadata peran dari profil akunnya dan mengaktifkan hak akses tab serta tombol aksi yang sesuai dengan perannya.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#006B4F] text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h5 className="font-bold text-white text-sm">Proteksi Berlapis</h5>
              <p className="text-[#DDE7E8]/70 leading-relaxed text-[11px]">
                Akun Super Admin (Sekretariat Utama ID <code>user-1</code>) diproteksi secara permanen dari penghapusan demi menjaga kelangsungan kontrol sistem dan keamanan master panitia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DATABASE SECURITY (SUPABASE RLS) */}
      {subTab === 'rls' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-5 rounded-2xl bg-[#020e19] border border-[#00D9F5]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Database className="w-4 h-4 text-[#00D9F5]" />
                <span>Aturan Row-Level Security (RLS) PostgreSQL / Supabase</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rlsSqlSample);
                  setCopiedRlsSql(true);
                  setTimeout(() => setCopiedRlsSql(false), 3000);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-[#00D9F5] flex items-center gap-1.5 transition-all"
              >
                {copiedRlsSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRlsSql ? 'Tersalin!' : 'Salin Script SQL RLS'}</span>
              </button>
            </div>

            <p className="text-xs text-[#DDE7E8]/80 leading-relaxed">
              Jika aplikasi terhubung ke database backend Supabase, jalankan script SQL di bawah ini pada menu <strong>SQL Editor</strong> Supabase untuk memastikan izin verifikasi, baca, dan hapus diamankan secara ketat langsung pada level database server:
            </p>

            <pre className="p-4 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
              {rlsSqlSample}
            </pre>
          </div>

          {/* Supabase User Creation Guide */}
          <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <KeyRound className="w-4 h-4 text-[#F2C96D]" />
                <span>Cara Tambah User & Role via Supabase SQL</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlSample);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-[#F2C96D] flex items-center gap-1.5 transition-all"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL User'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              {sqlSample}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Tambah User Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#031525] border border-[#00D9F5]/50 p-6 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#006B4F]/40 border border-[#D9B45B] flex items-center justify-center text-[#F2C96D]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-white">
                  Tambah Akun Panitia Baru
                </h3>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  Tentukan peran & hak akses untuk akun panitia ini.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#00D9F5]" /> Nama Lengkap Panitia
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gus Rofiqul A'la"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#DDE7E8] font-medium mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: rofiq_juri"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>

                <div>
                  <label className="block text-[#DDE7E8] font-medium mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#F2C96D]" /> Password
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#008F72]" /> Peran & Hak Akses
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#DDE7E8]/60 mt-1">
                  {ROLE_DEFINITIONS[role]?.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#DDE7E8] font-medium mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#00D9F5]" /> Email (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="panitia@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>

                <div>
                  <label className="block text-[#DDE7E8] font-medium mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#00D9F5]" /> No. WA (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="0812-XXXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] font-black uppercase tracking-wider"
                >
                  Simpan & Aktifkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Konfirmasi Hapus Akun Panitia */}
      {userToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#031525] border border-rose-500/50 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-heading font-bold text-white text-base">
                Hapus Akun Panitia?
              </h4>
              <p className="text-xs text-[#DDE7E8]/80 mt-1.5 leading-relaxed">
                Yakin ingin menghapus akun panitia <strong className="text-white">"{userToDelete.name}"</strong>? Pengguna ini tidak akan bisa login lagi ke CMS.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SUB-MODAL: Bantuan Setup Tabel admin_users Supabase */}
      {showMissingTableModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#031525] border-2 border-[#F2C96D]/70 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F2C96D]/20 border border-[#F2C96D]/40 text-[#F2C96D] flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-white">
                      Tabel admin_users Belum Dibuat di Supabase
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Wajib 1 Kali Saja
                    </span>
                  </div>
                  <p className="text-xs text-[#DDE7E8]/80 mt-0.5">
                    Supabase belum memiliki tabel <code className="text-[#F2C96D]">admin_users</code> untuk menyimpan akun dan hak akses panitia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMissingTableModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step by step guide */}
            <div className="p-4 rounded-2xl bg-[#006B4F]/20 border border-[#006B4F]/40 space-y-2">
              <h4 className="text-xs font-bold text-[#F2C96D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00D9F5]" />
                <span>3 Langkah Cepat Mengaktifkan:</span>
              </h4>
              <ol className="text-xs text-[#DDE7E8]/90 space-y-1.5 list-decimal list-inside pl-1">
                <li>
                  Klik tombol <strong>"Salin Skrip SQL admin_users"</strong> di bawah.
                </li>
                <li>
                  Buka <strong>Supabase Dashboard → SQL Editor → New query</strong>, lalu <strong>Paste (Ctrl+V)</strong>.
                </li>
                <li>
                  Klik tombol <strong>"Run"</strong> di Supabase. Setelah sukses, klik <strong>"Kirim Ulang ke Supabase"</strong>!
                </li>
              </ol>
            </div>

            {/* SQL Code Box */}
            <div className="relative rounded-2xl bg-[#010b14] border border-white/15 p-3.5 max-h-52 overflow-y-auto">
              <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                {ADMIN_USERS_SETUP_SQL}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Buka Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ADMIN_USERS_SETUP_SQL);
                    setCopiedTableSql(true);
                    setToastMessage('Skrip SQL admin_users berhasil disalin! Jalankan di SQL Editor Supabase.');
                    setTimeout(() => setCopiedTableSql(false), 3000);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F2C96D]/20 hover:bg-[#F2C96D]/30 border border-[#F2C96D]/50 text-[#F2C96D] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  {copiedTableSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedTableSql ? 'Tersalin!' : 'Salin Skrip SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMissingTableModal(false);
                    handleSyncToSupabase();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Kirim Ulang ke Supabase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
