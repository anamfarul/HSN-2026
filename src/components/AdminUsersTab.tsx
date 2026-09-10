import React, { useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { INITIAL_ADMIN_USERS } from '../data/initialUsers';
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
  X
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(() => {
    try {
      const stored = localStorage.getItem('hsn2026_registered_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with initial if not existing
          const ids = new Set(parsed.map((u: AdminUser) => u.id));
          const initialsToAdd = INITIAL_ADMIN_USERS.filter((u) => !ids.has(u.id));
          return [...parsed, ...initialsToAdd];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ADMIN_USERS;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Koordinator Teknis Lomba');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Sync to localStorage
  const saveUsers = (updated: AdminUser[]) => {
    setUsers(updated);
    try {
      localStorage.setItem('hsn2026_registered_users', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
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

    const updated = [newUser, ...users];
    saveUsers(updated);
    setShowAddModal(false);

    // Reset form
    setFullName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');

    setToastMessage(`Akun ${newUser.fullName} (${newUser.username}) berhasil ditambahkan dan siap digunakan untuk login!`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === 'user-1') {
      setToastMessage('Akun Super Admin sistem utama tidak dapat dihapus.');
      setUserToDelete(null);
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }
    const updated = users.filter((u) => u.id !== userToDelete.id);
    saveUsers(updated);
    setToastMessage(`Akun panitia "${userToDelete.name}" telah berhasil dihapus.`);
    setUserToDelete(null);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const sqlSample = `-- Tambah Pengguna Admin Baru di Supabase SQL Editor
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'panitia.baru@hsnponcokusumo.nu',
  crypt('santri2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Ustadz Panitia Baru","role":"Koordinator Lomba"}',
  now(),
  now()
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSample);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#020e19] border border-white/10">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#F2C96D]" />
            <span>Daftar Pengguna & Hak Akses Panitia ({users.length})</span>
          </h3>
          <p className="text-xs text-[#DDE7E8]/70 mt-0.5">
            Pengguna yang ditambahkan langsung aktif dan dapat langsung masuk melalui halaman login admin.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#00D9F5]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Panitia Baru</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#020e19] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[#DDE7E8]/70 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Nama & Identitas</th>
                <th className="py-3 px-4">Username Login</th>
                <th className="py-3 px-4">Peran / Divisi</th>
                <th className="py-3 px-4">Kontak (Email/WA)</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#006B4F]/40 border border-[#D9B45B]/40 flex items-center justify-center text-[#F2C96D] text-xs font-bold shrink-0">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <div>{u.fullName}</div>
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#006B4F]/30 text-[#F2C96D] border border-[#D9B45B]/30">
                      {u.role}
                    </span>
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
                    {u.id !== 'user-1' ? (
                      <button
                        onClick={() => setUserToDelete({ id: u.id, name: u.fullName })}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors"
                        title="Hapus Akun Panitia"
                        aria-label="Hapus Akun Panitia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#DDE7E8]/40 italic">Utama</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase SQL Integration Guide Card */}
      <div className="p-5 rounded-2xl bg-[#020e19] border border-[#00D9F5]/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Database className="w-4 h-4 text-[#00D9F5]" />
            <span>Cara Menambah User di Supabase Auth & SQL Editor</span>
          </div>
          <button
            onClick={handleCopySql}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-[#00D9F5] flex items-center gap-1.5 transition-all"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Tersalin!' : 'Salin Contoh SQL'}</span>
          </button>
        </div>

        <p className="text-xs text-[#DDE7E8]/80 leading-relaxed">
          Jika Anda menggunakan Supabase Backend, ada 2 opsi resmi untuk menambah user:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#DDE7E8]/90">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="font-bold text-[#F2C96D] flex items-center gap-1.5">
              <span>Metode 1: Supabase Dashboard UI</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#DDE7E8]/80">
              <li>Buka dashboard Supabase project Anda</li>
              <li>Klik menu <strong>Authentication</strong> di bilah kiri</li>
              <li>Pilih tab <strong>Users</strong> lalu klik <strong>Add User &gt; Create User</strong></li>
              <li>Masukkan Email & Password panitia, lalu klik Create</li>
            </ol>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="font-bold text-[#00D9F5] flex items-center gap-1.5">
              <span>Metode 2: Supabase SQL Editor</span>
            </div>
            <p className="text-[11px] text-[#DDE7E8]/80">
              Jalankan script SQL di tab SQL Editor untuk menambahkan user panitia beserta password terenkripsi bcrypt dan metadata divisi.
            </p>
          </div>
        </div>

        <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto">
          {sqlSample}
        </pre>
      </div>

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
                  Akun langsung aktif dan dapat digunakan login seketika.
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
                  <KeyRound className="w-3.5 h-3.5 text-[#008F72]" /> Peran / Divisi Akses
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                >
                  <option value="Sekretariat Utama HSN 2026">Sekretariat Utama (Super Admin)</option>
                  <option value="Koordinator Teknis Lomba">Koordinator Teknis Lomba</option>
                  <option value="Dewan Juri & Verifikator">Dewan Juri & Verifikator</option>
                  <option value="Divisi Acara & Registrasi">Divisi Acara & Registrasi</option>
                  <option value="Tim Publikasi & Media Center">Tim Publikasi & Media Center</option>
                </select>
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
    </div>
  );
};
