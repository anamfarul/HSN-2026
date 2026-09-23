import React, { useState } from 'react';
import { getRegisteredAdminUsers, isUserDeleted } from '../data/initialUsers';
import { AdminUser } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  KeyRound, 
  AlertCircle, 
  Sparkles, 
  X,
  CheckCircle2
} from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: (adminData: { username: string; role: string }) => void;
  onClose: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Sekretariat Utama HSN 2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    // Simulate verification check
    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      // Cek apakah akun ini telah dihapus oleh administrator
      if (isUserDeleted(undefined, cleanUser)) {
        setIsLoading(false);
        setErrorMessage('Akun panitia ini telah dihapus oleh administrator dan tidak lagi memiliki akses.');
        return;
      }

      // Ambil daftar akun terdaftar yang sah (bebas dari akun terhapus)
      const allUsers: AdminUser[] = getRegisteredAdminUsers();

      // Cek kecocokan kredensial
      const matchedUser = allUsers.find(
        (u) => 
          (u.username.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)) &&
          (u.password === cleanPass || (!u.password && cleanPass === 'santri2026'))
      );

      // Cek jika akun berstatus non-aktif
      if (matchedUser && matchedUser.isActive === false) {
        setIsLoading(false);
        setErrorMessage('Akun panitia ini berstatus non-aktif. Silakan hubungi Sekretariat Utama.');
        return;
      }

      // Master failsafe demo credentials (HANYA untuk super admin utama 'admin' dan jika belum dihapus)
      const isMasterAdminMatch = 
        !isUserDeleted(undefined, 'admin') &&
        ((cleanUser === 'admin' || cleanUser === 'admin@hsnponcokusumo.id') &&
         (cleanPass === 'santri2026' || cleanPass === 'admin123'));

      const isValid = !!matchedUser || isMasterAdminMatch;
      const activeRole = matchedUser ? matchedUser.role : (isMasterAdminMatch ? 'Sekretariat Utama HSN 2026' : role);
      const activeDisplayName = matchedUser ? matchedUser.fullName : (isMasterAdminMatch ? 'Gus Ahmad Al-Fatih' : cleanUser);

      if (isValid) {
        setIsLoading(false);
        setSuccessToast(true);

        if (rememberMe) {
          localStorage.setItem('hsn2026_admin_auth', 'true');
          localStorage.setItem('hsn2026_admin_user', activeDisplayName);
          localStorage.setItem('hsn2026_admin_role', activeRole);
        } else {
          sessionStorage.setItem('hsn2026_admin_auth', 'true');
          sessionStorage.setItem('hsn2026_admin_user', activeDisplayName);
          sessionStorage.setItem('hsn2026_admin_role', activeRole);
        }

        setTimeout(() => {
          onLoginSuccess({ username: activeDisplayName, role: activeRole });
        }, 500);
      } else {
        setIsLoading(false);
        setErrorMessage('Username atau kata sandi panitia tidak cocok. Silakan periksa kembali atau hubungi Sekretariat Utama.');
      }
    }, 600);
  };

  return (
    <div className="relative w-full max-w-lg rounded-3xl bg-[#031525] border border-[#00D9F5]/40 shadow-[0_0_50px_rgba(0,217,245,0.25)] overflow-hidden my-auto p-6 sm:p-8 animate-scale-up">
      {/* Background Islamic Arabesque Overlay */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-20 pointer-events-none" />

      {/* Ambient glowing orbs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#006B4F]/30 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F2C96D]/15 rounded-full blur-[70px] pointer-events-none" />

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all z-20"
        aria-label="Tutup Login"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006B4F] to-[#008F72] border-2 border-[#D9B45B] shadow-[0_0_20px_rgba(217,180,91,0.4)] flex items-center justify-center text-[#F2C96D] mb-3">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006B4F]/40 border border-[#00D9F5]/30 text-[10px] font-bold text-[#00D9F5] uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-[#F2C96D]" />
          <span>PORTAL KEAMANAN CMS HSN 2026</span>
        </div>

        <h2 className="font-heading font-black text-2xl text-white tracking-tight">
          Masuk Portal Admin
        </h2>
        <p className="text-xs text-[#DDE7E8]/80 mt-1 max-w-sm">
          Khusus Panitia Pelaksana, Divisi & Sekretariat MWC NU Kecamatan Poncokusumo
        </p>
      </div>

      {/* Success Banner */}
      {successToast && (
        <div className="relative z-10 mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Autentikasi berhasil! Mengalihkan ke Dashboard CMS...</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="relative z-10 mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="relative z-10 space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-[#DDE7E8] mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#00D9F5]" />
            <span>Nama Pengguna / Email Panitia</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: admin atau sekretariat"
              className="w-full px-4 py-3 rounded-xl bg-[#020e19] border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D9F5] focus:ring-1 focus:ring-[#00D9F5] transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-[#DDE7E8] mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#F2C96D]" />
            <span>Kata Sandi (Password)</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi panitia"
              className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#020e19] border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D9F5] focus:ring-1 focus:ring-[#00D9F5] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#DDE7E8] mb-1.5 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#008F72]" />
            <span>Hak Akses / Divisi</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-white text-xs focus:outline-none focus:border-[#00D9F5] transition-all"
          >
            <option value="Sekretariat Utama HSN 2026">Sekretariat Utama (Super Admin)</option>
            <option value="Koordinator Teknis Lomba">Koordinator Teknis Lomba</option>
            <option value="Divisi Regristrasi & Verifikator">Divisi Regristrasi & Verifikator</option>
            <option value="Divisi Sekretariat & Administrasi">Divisi Sekretariat & Administrasi</option>
            <option value="Tim Publikasi & Media Center">Tim Publikasi & Media Center</option>
          </select>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-[#DDE7E8]/80 hover:text-white">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-[#020e19] border-white/20 text-[#00D9F5] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Ingat sesi di perangkat ini</span>
          </label>
          <span className="text-[11px] text-[#00D9F5]/70 flex items-center gap-1">
            <Lock className="w-3 h-3" /> SSL 256-bit
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:shadow-[0_0_25px_rgba(0,217,245,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#031525] border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi Kredensial...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 text-[#031525]" />
              <span>Masuk ke Portal Admin</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
