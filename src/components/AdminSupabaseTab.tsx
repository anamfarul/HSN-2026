import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  UploadCloud, 
  Save, 
  ExternalLink, 
  Copy, 
  Check, 
  Table, 
  ShieldCheck, 
  Sparkles,
  Server,
  Layers,
  FileCode,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Wifi,
  Info,
  Trash2
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  testSupabaseConnection, 
  syncAllCompetitionsToSupabase,
  syncAllParticipantsToSupabase,
  syncAllAdminUsersToSupabase,
  fetchCompetitionsFromSupabase,
  fetchParticipantsFromSupabase,
  fetchAdminUsersFromSupabase,
  isSupabaseConnected,
  sanitizeSupabaseUrl,
  sanitizeSupabaseKey,
  pingSupabaseEndpoint,
  ADMIN_USERS_SETUP_SQL,
  FIX_FOREIGN_KEY_CASCADE_SQL,
  FIX_CATEGORY_ENUM_SQL
} from '../lib/supabaseClient';
import { AdminUser, Competition, ParticipantRegistration } from '../types';
import { 
  getRegisteredAdminUsers, 
  saveRegisteredAdminUsers, 
  isUserDeleted 
} from '../data/initialUsers';

export const FIX_COLUMNS_MIGRATION_SQL = `-- ==============================================================================
-- SKRIP PERBAIKAN SCHEMA CACHE & TABEL SUPABASE: FESTIVAL HARI SANTRI 2026
-- Salin dan jalankan di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Menambahkan kolom-kolom baru tanpa menghapus data tabel yang sudah ada!
-- ==============================================================================

-- 1. Pastikan kolom tabel competitions lengkap
ALTER TABLE IF EXISTS public.competitions 
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(150),
  ADD COLUMN IF NOT EXISTS technical_meeting VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
  ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS juknis_url TEXT,
  ADD COLUMN IF NOT EXISTS juknis_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Pastikan kolom tabel participants lengkap
ALTER TABLE IF EXISTS public.participants 
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. PERBAIKAN FOREIGN KEY CASCADE: Mencegah error 'referenced by a foreign key constraint from table participants'
-- Memungkinkan penghapusan lomba langsung di Supabase Table Editor maupun via Website CMS
ALTER TABLE IF EXISTS public.participants 
  DROP CONSTRAINT IF EXISTS participants_competition_id_fkey;

ALTER TABLE IF EXISTS public.participants 
  ADD CONSTRAINT participants_competition_id_fkey 
  FOREIGN KEY (competition_id) 
  REFERENCES public.competitions(id) 
  ON DELETE CASCADE;

-- 4. UPDATE & FLEKSIBILITAS KATEGORI LOMBA (PAUD/RA/TK, PAGAR NUSA & GURU)
-- Menjadikan tipe kolom category VARCHAR(100) fleksibel tanpa batasan ENUM
ALTER TABLE IF EXISTS public.competitions 
  ALTER COLUMN category TYPE VARCHAR(100) USING category::text;

ALTER TABLE IF EXISTS public.participants 
  ALTER COLUMN category TYPE VARCHAR(100) USING category::text;

-- Update otomatis data kategori lama 'PAUD/TK' menjadi 'PAUD/RA/TK'
UPDATE public.competitions 
  SET category = 'PAUD/RA/TK' 
  WHERE category = 'PAUD/TK';

UPDATE public.participants 
  SET category = 'PAUD/RA/TK' 
  WHERE category = 'PAUD/TK';

-- Jika tipe enum lama masih dipakai oleh objek lain, tambahkan nilai secara aman
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_generation_enum') THEN
    ALTER TYPE category_generation_enum ADD VALUE IF NOT EXISTS 'PAUD/RA/TK';
    ALTER TYPE category_generation_enum ADD VALUE IF NOT EXISTS 'PAGAR NUSA';
    ALTER TYPE category_generation_enum ADD VALUE IF NOT EXISTS 'GURU';
    ALTER TYPE category_generation_enum ADD VALUE IF NOT EXISTS 'UMUM';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Pastikan tabel admin_users tersedia
CREATE TABLE IF NOT EXISTS public.admin_users (
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

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all admin_users" ON public.admin_users;
CREATE POLICY "Public all admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

-- 5. Reload cache schema PostgREST Supabase agar langsung aktif
NOTIFY pgrst, 'reload schema';
`;

export const QUICK_SUPABASE_SETUP_SQL = `-- ==============================================================================
-- SKRIP SETUP RESMI SUPABASE DATABASE & RLS: FESTIVAL HARI SANTRI 2026
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- Hapus tabel galeri jika ada di database
DROP TABLE IF EXISTS gallery_items CASCADE;

-- 0. MIGRASI & PERBAIKAN KOLOM DATABASE YANG SUDAH ADA (ADD COLUMN IF NOT EXISTS)
ALTER TABLE IF EXISTS public.competitions 
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(150),
  ADD COLUMN IF NOT EXISTS technical_meeting VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
  ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS juknis_url TEXT,
  ADD COLUMN IF NOT EXISTS juknis_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS public.participants 
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Pastikan relasi Foreign Key antara participants dan competitions mendukung ON DELETE CASCADE
-- (Sehingga penghapusan lomba di tabel Supabase maupun website otomatis menghapus data pendaftar terkait tanpa error)
ALTER TABLE IF EXISTS public.participants 
  DROP CONSTRAINT IF EXISTS participants_competition_id_fkey;

ALTER TABLE IF EXISTS public.participants 
  ADD CONSTRAINT participants_competition_id_fkey 
  FOREIGN KEY (competition_id) 
  REFERENCES public.competitions(id) 
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

-- 1. Tipe ENUM Status Registrasi
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status_enum') THEN
        CREATE TYPE registration_status_enum AS ENUM (
            'Menunggu Verifikasi',
            'Terverifikasi',
            'Ditolak'
        );
    END IF;
END $$;

-- 2. Tabel Cabang Perlombaan
CREATE TABLE IF NOT EXISTS competitions (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    short_desc TEXT NOT NULL,
    full_desc TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
    registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    registration_deadline DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    contact_person VARCHAR(100) NOT NULL DEFAULT 'Sekretariat Panitia HSN 2026',
    contact_phone VARCHAR(25) NOT NULL DEFAULT '08123456789',
    juknis_url TEXT,
    juknis_file_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Pendaftaran Peserta (Registrations)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    institution VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    birth_date DATE,
    whatsapp VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    address TEXT NOT NULL,
    competition_id VARCHAR(50) REFERENCES competitions(id) ON DELETE CASCADE,
    competition_title VARCHAR(150) NOT NULL,
    document_url TEXT,
    document_name VARCHAR(255),
    payment_proof_url TEXT,
    payment_proof_name VARCHAR(255),
    status registration_status_enum NOT NULL DEFAULT 'Menunggu Verifikasi',
    notes TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fleksibilitas kolom category & migrasi PAUD/TK -> PAUD/RA/TK
ALTER TABLE IF EXISTS public.competitions ALTER COLUMN category TYPE VARCHAR(100) USING category::text;
ALTER TABLE IF EXISTS public.participants ALTER COLUMN category TYPE VARCHAR(100) USING category::text;
UPDATE public.competitions SET category = 'PAUD/RA/TK' WHERE category = 'PAUD/TK';
UPDATE public.participants SET category = 'PAUD/RA/TK' WHERE category = 'PAUD/TK';

-- 4. Tabel Pengguna Panitia (Admin Users)
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

-- 5. Tabel Pesan Kontak & Saran Aspirasi
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name VARCHAR(150) NOT NULL,
    sender_email VARCHAR(100),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Kebijakan Row Level Security (RLS) untuk Akses Anon Key Publik & CMS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public all competitions" ON competitions;
CREATE POLICY "Public all competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all participants" ON participants;
CREATE POLICY "Public all participants" ON participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all admin_users" ON admin_users;
CREATE POLICY "Public all admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all contact_messages" ON contact_messages;
CREATE POLICY "Public all contact_messages" ON contact_messages FOR ALL USING (true) WITH CHECK (true);

-- 7. Setup Storage Bucket 'registrations' (Untuk Bukti Transfer & Surat Mandat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('registrations', 'registrations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public upload registrations" ON storage.objects;
DROP POLICY IF EXISTS "Public select registrations" ON storage.objects;
DROP POLICY IF EXISTS "Public update registrations" ON storage.objects;

CREATE POLICY "Public upload registrations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'registrations');
CREATE POLICY "Public select registrations" ON storage.objects FOR SELECT USING (bucket_id = 'registrations');
CREATE POLICY "Public update registrations" ON storage.objects FOR UPDATE USING (bucket_id = 'registrations') WITH CHECK (bucket_id = 'registrations');
`;

interface AdminSupabaseTabProps {
  competitions: Competition[];
  participants?: ParticipantRegistration[];
  onRefreshCompetitions: (newComps: Competition[]) => void;
  onRefreshParticipants?: (newParticipants: ParticipantRegistration[]) => void;
  setFeedbackToast?: (msg: string) => void;
}

export const AdminSupabaseTab: React.FC<AdminSupabaseTabProps> = ({
  competitions,
  participants,
  onRefreshCompetitions,
  onRefreshParticipants,
  setFeedbackToast,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [syncingParticipants, setSyncingParticipants] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tableStatus, setTableStatus] = useState<{ competitions: boolean; participants: boolean; admin_users?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedAdminUsersSql, setCopiedAdminUsersSql] = useState(false);
  const [copiedCascadeSql, setCopiedCascadeSql] = useState(false);
  const [copiedCategorySql, setCopiedCategorySql] = useState(false);
  const [showAdminUsersSqlModal, setShowAdminUsersSqlModal] = useState(false);
  const [showCascadeSqlModal, setShowCascadeSqlModal] = useState(false);
  const [showCategorySqlModal, setShowCategorySqlModal] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [internalToast, setInternalToast] = useState<string | null>(null);

  // Safe notification helper that handles both parent toast and internal fallback
  const notify = (msg: string) => {
    setInternalToast(msg);
    if (typeof setFeedbackToast === 'function') {
      try {
        setFeedbackToast(msg);
      } catch (err) {
        console.warn('Parent feedbackToast error:', err);
      }
    }
    setTimeout(() => {
      setInternalToast(null);
      if (typeof setFeedbackToast === 'function') {
        try {
          setFeedbackToast('');
        } catch {
          // ignore
        }
      }
    }, 4000);
  };

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrl(creds.url);
    setAnonKey(creds.anonKey);
    setIsConnected(isSupabaseConnected());

    if (creds.url && creds.anonKey) {
      testSupabaseConnection().then((res) => {
        setIsConnected(res.success);
        setStatusMessage(res.message);
        if (res.tables) {
          setTableStatus(res.tables);
        }
      }).catch((err) => {
        setStatusMessage(`Gagal: ${err?.message || 'Tidak dapat menghubungi server'}`);
      });
    }
  }, []);

  const handlePingServer = async () => {
    setPingTesting(true);
    setPingResult(null);
    try {
      const clean = sanitizeSupabaseUrl(url);
      const res = await pingSupabaseEndpoint(clean);
      if (res.reachable) {
        setPingResult(`Domain Supabase ${clean} aktif & dapat dihubungi via REST API (HTTP Status: ${res.status}).`);
      } else {
        setPingResult(`Gagal terhubung: ${res.error}`);
      }
    } catch (err: any) {
      setPingResult(`Gagal ping: ${err.message}`);
    } finally {
      setPingTesting(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = sanitizeSupabaseKey(anonKey);
    setUrl(cleanUrl);
    setAnonKey(cleanKey);

    saveSupabaseCredentials(cleanUrl, cleanKey);
    const connected = isSupabaseConnected();
    setIsConnected(connected);
    
    // Dispatch event for App.tsx to reload
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase_credentials_updated'));
    }

    notify('Kredensial Supabase berhasil disimpan & dibersihkan!');

    // Auto test
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await testSupabaseConnection();
      setIsConnected(res.success);
      setStatusMessage(res.message);
      if (res.tables) {
        setTableStatus(res.tables);
      }
      notify(res.success ? res.message : `Koneksi Gagal: ${res.message}`);
    } catch (err: any) {
      setIsConnected(false);
      const errMsg = err?.message || 'Terjadi kesalahan sistem saat menghubungi Supabase';
      setStatusMessage(`Gagal: ${errMsg}`);
      notify(`Koneksi Gagal: ${errMsg}`);
    } finally {
      setTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(QUICK_SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    notify('Skrip SQL setup database berhasil disalin! Tempelkan dan jalankan di Supabase SQL Editor.');
    setTimeout(() => setCopiedSql(false), 4000);
  };

  const handleCopyMigrationSql = () => {
    navigator.clipboard.writeText(FIX_COLUMNS_MIGRATION_SQL);
    notify('Skrip SQL perbaikan kolom Supabase disalin! Jalankan di Supabase SQL Editor untuk menambah kolom yang kurang.');
  };

  const handleCopyCascadeSql = () => {
    navigator.clipboard.writeText(FIX_FOREIGN_KEY_CASCADE_SQL);
    setCopiedCascadeSql(true);
    notify('Skrip SQL CASCADE Hapus Lomba berhasil disalin! Jalankan di SQL Editor Supabase untuk mengatasi error foreign key.');
    setTimeout(() => setCopiedCascadeSql(false), 4000);
  };

  const handleCopyCategorySql = () => {
    navigator.clipboard.writeText(FIX_CATEGORY_ENUM_SQL);
    setCopiedCategorySql(true);
    notify('Skrip SQL perbaikan kategori PAUD/RA/TK, PAGAR NUSA & GURU disalin! Jalankan di SQL Editor Supabase.');
    setTimeout(() => setCopiedCategorySql(false), 4000);
  };

  const handleSyncToSupabase = async () => {
    if (!isConnected) {
      notify('Harap hubungkan ke Supabase terlebih dahulu.');
      return;
    }

    setSyncing(true);
    try {
      const res = await syncAllCompetitionsToSupabase(competitions);
      if (res.success) {
        notify(`Sukses! ${res.count} cabang lomba berhasil disinkronkan ke Supabase.`);
        setStatusMessage(`Sinkronisasi berhasil: ${res.count} data tersimpan di tabel 'competitions'.`);
      } else {
        notify(`Gagal sinkronisasi: ${res.error}`);
        setStatusMessage(`Error: ${res.error}`);
      }
    } catch (err: any) {
      notify(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchFromSupabase = async () => {
    setFetching(true);
    try {
      let msgParts: string[] = [];

      // 1. Fetch competitions
      const { data: remoteComps, error: compErr } = await fetchCompetitionsFromSupabase();
      if (compErr) {
        console.warn('Lomba fetch error:', compErr);
      } else if (remoteComps && remoteComps.length > 0) {
        onRefreshCompetitions(remoteComps);
        msgParts.push(`${remoteComps.length} lomba`);
      }

      // 2. Fetch participants
      if (onRefreshParticipants) {
        const { data: remoteParticipants } = await fetchParticipantsFromSupabase();
        if (remoteParticipants && remoteParticipants.length > 0) {
          onRefreshParticipants(remoteParticipants);
          msgParts.push(`${remoteParticipants.length} peserta`);
        }
      }

      // 3. Fetch admin users
      const { data: remoteUsers } = await fetchAdminUsersFromSupabase();
      if (remoteUsers && remoteUsers.length > 0) {
        try {
          const validUsers = remoteUsers.filter((u) => !isUserDeleted(u.id, u.username));
          saveRegisteredAdminUsers(validUsers);
          msgParts.push(`${validUsers.length} user panitia`);
        } catch (_) {}
      }

      if (msgParts.length > 0) {
        notify(`Berhasil menarik data dari Supabase: ${msgParts.join(', ')}!`);
      } else {
        notify('Koneksi berhasil, namun database Supabase masih belum memiliki data.');
      }
    } catch (err: any) {
      notify(`Kesalahan: ${err.message}`);
    } finally {
      setFetching(false);
    }
  };

  const handleSyncUsersToSupabase = async () => {
    if (!isConnected) {
      notify('Harap hubungkan ke Supabase terlebih dahulu.');
      return;
    }
    setSyncingUsers(true);
    try {
      const currentUsers = getRegisteredAdminUsers();
      const res = await syncAllAdminUsersToSupabase(currentUsers);
      if (res.success) {
        notify(`Sukses! ${res.count} akun panitia berhasil disinkronkan ke Supabase (tabel admin_users).`);
        setStatusMessage(`Sinkronisasi user berhasil: ${res.count} akun panitia tersimpan di tabel 'admin_users'.`);
        setTableStatus((prev) => prev ? { ...prev, admin_users: true } : { competitions: true, participants: true, admin_users: true });
      } else {
        notify(res.error || 'Gagal sinkronisasi data user');
        setStatusMessage(`Error user: ${res.error}`);
        if (res.missingTable || res.error?.toLowerCase().includes('admin_users') || res.error?.toLowerCase().includes('schema cache')) {
          setTableStatus((prev) => prev ? { ...prev, admin_users: false } : { competitions: true, participants: true, admin_users: false });
          setShowAdminUsersSqlModal(true);
        }
      }
    } catch (err: any) {
      notify(`Terjadi kesalahan: ${err.message}`);
      if (err.message?.toLowerCase().includes('admin_users') || err.message?.toLowerCase().includes('schema cache')) {
        setShowAdminUsersSqlModal(true);
      }
    } finally {
      setSyncingUsers(false);
    }
  };

  const handleFetchUsersFromSupabase = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await fetchAdminUsersFromSupabase();
      if (error) {
        notify(`Gagal memuat user panitia: ${error}`);
        if (error.toLowerCase().includes('admin_users') || error.toLowerCase().includes('schema cache')) {
          setTableStatus((prev) => prev ? { ...prev, admin_users: false } : { competitions: true, participants: true, admin_users: false });
          setShowAdminUsersSqlModal(true);
        }
      } else if (data && data.length > 0) {
        const validUsers = data.filter((u) => !isUserDeleted(u.id, u.username));
        saveRegisteredAdminUsers(validUsers);
        notify(`Berhasil memuat ${validUsers.length} akun panitia dari tabel 'admin_users' Supabase!`);
        setTableStatus((prev) => prev ? { ...prev, admin_users: true } : { competitions: true, participants: true, admin_users: true });
      } else {
        notify('Tabel admin_users di Supabase masih kosong.');
      }
    } catch (err: any) {
      notify(`Kesalahan: ${err.message}`);
      if (err.message?.toLowerCase().includes('admin_users') || err.message?.toLowerCase().includes('schema cache')) {
        setShowAdminUsersSqlModal(true);
      }
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSyncParticipantsToSupabase = async () => {
    if (!isConnected) {
      notify('Harap hubungkan ke Supabase terlebih dahulu.');
      return;
    }
    setSyncingParticipants(true);
    try {
      const listToSync = participants && participants.length > 0 
        ? participants 
        : (() => {
            try {
              const stored = localStorage.getItem('hsn2026_participants');
              return stored ? JSON.parse(stored) : [];
            } catch (_) { return []; }
          })();

      if (listToSync.length === 0) {
        notify('Belum ada data pendaftar peserta untuk disinkronkan.');
        return;
      }

      const res = await syncAllParticipantsToSupabase(listToSync);
      if (res.success) {
        notify(`Sukses! ${res.count} data pendaftar peserta berhasil disinkronkan ke tabel 'participants' Supabase.`);
        setStatusMessage(`Sinkronisasi peserta berhasil: ${res.count} peserta tersimpan di database.`);
      } else {
        notify(`Gagal sinkronisasi peserta: ${res.error}`);
      }
    } catch (err: any) {
      notify(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSyncingParticipants(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#DDE7E8]">
      {/* Top Connection Status Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#006B4F]/40 via-[#031525] to-[#008F72]/30 border border-[#00D9F5]/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
            isConnected ? 'bg-emerald-600 border border-emerald-400' : 'bg-amber-600/80 border border-amber-400'
          }`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white">
                Status Integrasi Supabase CMS
              </h3>
              {isConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> TERHUBUNG (LIVE CMS)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> BELUM TERHUBUNG
                </span>
              )}
            </div>
            <p className="text-xs text-[#DDE7E8]/80 mt-1">
              Daftar lomba Festival HSN 2026 dan pendaftaran peserta terhubung ke PostgreSQL Supabase untuk persistensi realtime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Menguji...' : 'Tes Koneksi'}</span>
          </button>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 transition-all shadow-md"
          >
            <span>Buka Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border ${
          isConnected ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-2.5">
            {isConnected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
          {tableStatus && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className={`px-2 py-0.5 rounded ${tableStatus.competitions ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                competitions: {tableStatus.competitions ? 'Siap' : 'Belum Ada'}
              </span>
              <span className={`px-2 py-0.5 rounded ${tableStatus.participants ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                participants: {tableStatus.participants ? 'Siap' : 'Belum Ada'}
              </span>
              <span className={`px-2 py-0.5 rounded ${tableStatus.admin_users ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                admin_users: {tableStatus.admin_users ? 'Siap' : 'Belum Ada'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* SPECIAL NOTICE & DIAGNOSTIC GUIDE CARD */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#003B2C]/40 via-[#021525] to-[#01261B]/50 border-2 border-[#D9B45B]/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-[#F2C96D] shrink-0" />
            <div>
              <h4 className="font-heading text-sm sm:text-base font-bold text-white">
                Solusi: Mengapa Data Pengisian Website Belum Tersimpan ke Supabase?
              </h4>
              <p className="text-[11px] text-[#DDE7E8]/80 mt-0.5">
                Ikuti 3 langkah mudah berikut agar data pendaftaran peserta & kontak langsung tersimpan ke Supabase:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow shrink-0"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'SQL Berhasil Disalin!' : 'Salin Skrip SQL Skema & RLS'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-[#00D9F5] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#00D9F5]/20 text-center leading-5 text-[11px]">1</span>
              <span>Isi Kredensial URL & Key</span>
            </div>
            <p className="text-[11px] text-[#DDE7E8]/80 leading-relaxed">
              Buka Supabase Dashboard &gt; Project Settings &gt; API. Salin <strong>Project URL</strong> dan <strong>Anon Public Key</strong> ke formulir di bawah ini, lalu klik "Simpan Kredensial".
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-[#F2C96D] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#F2C96D]/20 text-center leading-5 text-[11px]">2</span>
              <span>Jalankan SQL di Supabase</span>
            </div>
            <p className="text-[11px] text-[#DDE7E8]/80 leading-relaxed">
              Klik tombol <strong>"Salin Skrip SQL"</strong> di kanan atas. Buka menu <strong>SQL Editor</strong> di dashboard Supabase, buat query baru, paste (tempel), lalu klik <strong>Run</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-center leading-5 text-[11px]">3</span>
              <span>Sinkronkan Cabang Lomba</span>
            </div>
            <p className="text-[11px] text-[#DDE7E8]/80 leading-relaxed">
              Kembali ke tab ini, klik <strong>"Tes Koneksi"</strong> untuk memastikan status "Siap", lalu klik tombol <strong>"Sinkronkan Lomba Lokal ke Supabase"</strong>. Selesai!
            </p>
          </div>
        </div>

        {/* Expandable SQL Preview */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowSqlViewer(!showSqlViewer)}
            className="text-xs text-[#00D9F5] hover:underline flex items-center gap-1.5 font-semibold"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{showSqlViewer ? 'Sembunyikan Kode SQL' : 'Lihat Isi Skrip SQL Skema & RLS'}</span>
            {showSqlViewer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSqlViewer && (
            <div className="mt-3 relative">
              <pre className="p-4 rounded-xl bg-[#010a12] border border-white/15 text-[11px] font-mono text-emerald-300 max-h-60 overflow-y-auto overflow-x-auto whitespace-pre">
                {QUICK_SUPABASE_SETUP_SQL}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Columns (Credentials Form & Quick Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Credential Settings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#020e19] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Server className="w-4 h-4 text-[#00D9F5]" />
            <h4 className="font-heading text-sm font-bold text-white">
              Konfigurasi API Supabase
            </h4>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#DDE7E8] mb-1">
                Project URL (VITE_SUPABASE_URL):
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/15 focus:border-[#00D9F5] text-xs text-white placeholder-white/30 focus:outline-none font-mono"
              />
              
              {/* Dashboard URL Auto-detection banner */}
              {(url.includes('supabase.com/dashboard/project') || url.includes('app.supabase.com/project')) && (
                <div className="mt-2 p-2.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-[11px] text-sky-200 flex items-start gap-2 animate-fade-in">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D9F5] shrink-0 mt-0.5" />
                  <span>
                    <strong>Auto-Convert Terdeteksi:</strong> Link dashboard akan otomatis diubah ke format REST API: <code>{sanitizeSupabaseUrl(url)}</code> saat disimpan.
                  </span>
                </div>
              )}

              <p className="text-[10px] text-white/50 mt-1">
                Ditemukan di dashboard Supabase: Project Settings → API → Project URL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#DDE7E8] mb-1">
                Anon Public Key (VITE_SUPABASE_ANON_KEY):
              </label>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-[#031525] border border-white/15 focus:border-[#00D9F5] text-xs text-white placeholder-white/30 focus:outline-none font-mono resize-none"
              />
              <p className="text-[10px] text-white/50 mt-1">
                Kunci anon aman untuk peramban client-side dengan otentikasi RLS.
              </p>
            </div>

            {/* Ping Result Notification */}
            {pingResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border animate-fade-in ${
                pingResult.includes('aktif')
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {pingResult.includes('aktif') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{pingResult}</span>
              </div>
            )}

            {/* Info on Paused Free Supabase Projects */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan "Failed to fetch":</strong> Proyek Supabase gratis otomatis dijeda (paused) jika 7 hari tidak ada traffic. Jika muncul pesan gagal jaringan, buka <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-[#00D9F5]">Supabase Dashboard</a> lalu klik <strong>"Restore project"</strong>.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handlePingServer}
                disabled={pingTesting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/15"
              >
                <Wifi className={`w-3.5 h-3.5 ${pingTesting ? 'animate-pulse text-[#00D9F5]' : ''}`} />
                <span>{pingTesting ? 'Menguji...' : 'Tes Ping API Domain'}</span>
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Kredensial</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Sync & Database Operations */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
              <Layers className="w-4 h-4 text-[#F2C96D]" />
              <h4 className="font-heading text-sm font-bold text-white">
                Operasi Sinkronisasi Database Lomba
              </h4>
            </div>

            <div className="space-y-3">
              {/* 1. Lomba Sync Card */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D9F5]/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-[#00D9F5]" />
                      <span>Cabang Lomba ({competitions.length})</span>
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-0.5">
                      Tabel <code className="text-[#F2C96D]">competitions</code>: juknis, syarat, hadiah, dan biaya pendaftaran.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setShowCategorySqlModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                      title="Perbaiki format enum kategori PAUD/RA/TK & PAGAR NUSA di database Supabase"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Fix Kategori</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCascadeSqlModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                      title="Perbaiki error foreign key saat menghapus lomba di database Supabase"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Fix Hapus</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      disabled={syncing}
                      className="px-3 py-1.5 rounded-xl bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 border border-[#00D9F5]/40 text-[#00D9F5] hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                      <span>{syncing ? 'Menyinkronkan...' : 'Kirim Lomba'}</span>
                    </button>
                  </div>
                </div>

                {/* Banner edukasi kategori baru PAUD/RA/TK, PAGAR NUSA & GURU */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Kategori <strong>PAUD/RA/TK</strong>, <strong>PAGAR NUSA</strong>, atau <strong>GURU</strong> ditolak Supabase? Buka solusi migrasi database.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategorySqlModal(true)}
                    className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] shrink-0 uppercase tracking-wider transition-colors"
                  >
                    Buka Solusi
                  </button>
                </div>

                {/* Banner edukasi penanganan error foreign key */}
                <div className="mt-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-2 text-[11px] text-rose-200">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Lomba tidak bisa dihapus di tabel Supabase? Aktifkan <strong>ON DELETE CASCADE</strong> agar referensi peserta terhapus otomatis.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCascadeSqlModal(true)}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 uppercase tracking-wider transition-colors"
                  >
                    Buka Solusi
                  </button>
                </div>
              </div>

              {/* 2. User Panitia Sync Card */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#F2C96D]/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#F2C96D]" />
                      <span>Akun Panitia & User CMS</span>
                      {tableStatus && tableStatus.admin_users === false && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                          Tabel Belum Dibuat
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-0.5">
                      Tabel <code className="text-[#F2C96D]">admin_users</code>: login terpusat, role panitia, & hak akses juri.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAdminUsersSqlModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F2C96D]/15 hover:bg-[#F2C96D]/30 border border-[#F2C96D]/40 text-[#F2C96D] text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                      title="Lihat & Salin Skrip SQL Pembuatan Tabel admin_users"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>SQL Tabel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchUsersFromSupabase}
                      disabled={fetchingUsers}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                      title="Tarik data user panitia dari Supabase"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#00D9F5] ${fetchingUsers ? 'animate-spin' : ''}`} />
                      <span>{fetchingUsers ? '...' : 'Tarik'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncUsersToSupabase}
                      disabled={syncingUsers}
                      className="px-3 py-1.5 rounded-xl bg-[#F2C96D]/20 hover:bg-[#F2C96D]/30 border border-[#F2C96D]/40 text-[#F2C96D] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${syncingUsers ? 'animate-bounce' : ''}`} />
                      <span>{syncingUsers ? 'Menyinkronkan...' : 'Kirim Users'}</span>
                    </button>
                  </div>
                </div>

                {tableStatus && tableStatus.admin_users === false && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Tabel <code>admin_users</code> belum ada di database Supabase Anda. Jalankan skrip SQL untuk mengaktifkan sinkronisasi.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminUsersSqlModal(true)}
                      className="px-2.5 py-1 rounded bg-[#F2C96D] hover:bg-[#ffe196] text-[#031525] font-black text-[10px] shrink-0 uppercase tracking-wider self-start sm:self-auto transition-colors"
                    >
                      Setup Tabel SQL
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Peserta Terdaftar Sync Card */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-emerald-400" />
                      <span>Pendaftar Peserta Terdaftar</span>
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-0.5">
                      Tabel <code className="text-[#F2C96D]">participants</code>: formulir registrasi, kontak WA, & bukti bayar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncParticipantsToSupabase}
                    disabled={syncingParticipants}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${syncingParticipants ? 'animate-bounce' : ''}`} />
                    <span>{syncingParticipants ? 'Menyinkronkan...' : 'Kirim Peserta'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Fetch All Latest Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/40 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Tarik Semua Data Terbaru (Lomba, Peserta, Users)</span>
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-0.5">
                      Mengambil pembaruan terkini dari cloud database ke seluruh modul CMS.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchFromSupabase}
                    disabled={fetching}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 border border-emerald-400/50 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
                    <span>{fetching ? 'Memuat...' : 'Tarik Semua'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Database Schema Reference & Migration */}
          <div className="p-3.5 rounded-xl bg-[#006B4F]/20 border border-[#006B4F]/40 text-[11px] text-[#DDE7E8]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#F2C96D] mb-0.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>Skema Database & Migrasi Kolom Supabase</span>
              </div>
              <p className="text-[10px] text-white/70">
                Sistem kini otomatis menyesuaikan kolom. Jika ingin memperbarui tabel database Supabase secara manual, salin skrip di bawah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCascadeSqlModal(true)}
                title="Perbaiki Foreign Key constraint agar penghapusan lomba di Supabase Table Editor maupun Website tidak error"
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Fix Hapus (CASCADE)</span>
              </button>
              <button
                type="button"
                onClick={handleCopyMigrationSql}
                title="Menambahkan kolom juknis dan berkas bukti pembayaran pada tabel yang sudah ada"
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Fix Kolom (ALTER)</span>
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                title="Salin skrip setup lengkap Supabase"
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#00D9F5] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Salin SQL Lengkap</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL BANTUAN SETUP TABEL ADMIN_USERS SUPABASE */}
      {showAdminUsersSqlModal && (
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
                      Setup Tabel admin_users di Supabase
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Wajib 1 Kali Saja
                    </span>
                  </div>
                  <p className="text-xs text-[#DDE7E8]/80 mt-0.5">
                    Penyebab kegagalan: Tabel <code className="text-[#F2C96D]">public.admin_users</code> belum dibuat di schema database Supabase Anda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminUsersSqlModal(false)}
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
                  Klik tombol <strong>"Run"</strong> (atau tekan Ctrl+Enter) di Supabase.
                </li>
                <li>
                  Setelah sukses di Supabase, kembali ke sini lalu klik tombol <strong>"Kirim Ulang Users"</strong>!
                </li>
              </ol>
            </div>

            {/* SQL Code Box */}
            <div className="relative rounded-2xl bg-[#010b14] border border-white/15 p-3.5 max-h-56 overflow-y-auto">
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
                    setCopiedAdminUsersSql(true);
                    notify('Skrip SQL admin_users berhasil disalin! Jalankan di SQL Editor Supabase.');
                    setTimeout(() => setCopiedAdminUsersSql(false), 3000);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F2C96D]/20 hover:bg-[#F2C96D]/30 border border-[#F2C96D]/50 text-[#F2C96D] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  {copiedAdminUsersSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAdminUsersSql ? 'Tersalin!' : 'Salin Skrip SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAdminUsersSqlModal(false);
                    handleSyncUsersToSupabase();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Kirim Ulang Users</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BANTUAN FIX FOREIGN KEY CASCADE SUPABASE */}
      {showCascadeSqlModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#031525] border-2 border-rose-500/70 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-white">
                      Solusi Error Hapus Lomba di Supabase
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ON DELETE CASCADE
                    </span>
                  </div>
                  <p className="text-xs text-[#DDE7E8]/80 mt-0.5">
                    Mengatasi error: <code className="text-rose-300">is currently referenced by a foreign key constraint from the table 'participants'</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCascadeSqlModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Error explanation banner */}
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs text-rose-200">
              <div className="flex items-center gap-2 font-bold text-white">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Penyebab Error Pada Screenshot Supabase:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                Tabel <code className="font-mono text-white bg-black/40 px-1 py-0.5 rounded">participants</code> memiliki relasi Foreign Key (<code className="font-mono text-white bg-black/40 px-1 py-0.5 rounded">participants_competition_id_fkey</code>) ke tabel <code className="font-mono text-white bg-black/40 px-1 py-0.5 rounded">competitions</code>. Karena belum diatur ke <strong className="text-emerald-300">ON DELETE CASCADE</strong>, database menolak menghapus lomba selama masih ada data peserta terdaftar pada lomba tersebut.
              </p>
            </div>

            {/* Step by step guide */}
            <div className="p-4 rounded-2xl bg-[#006B4F]/20 border border-[#006B4F]/40 space-y-2">
              <h4 className="text-xs font-bold text-[#F2C96D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00D9F5]" />
                <span>Cara Memperbaiki Agar Lomba Bisa Dihapus Bebas:</span>
              </h4>
              <ol className="text-xs text-[#DDE7E8]/90 space-y-1.5 list-decimal list-inside pl-1">
                <li>
                  Klik tombol <strong>"Salin Skrip SQL CASCADE"</strong> di bawah ini.
                </li>
                <li>
                  Buka <strong>Supabase Dashboard → SQL Editor → New query</strong>, lalu tekan <strong>Paste (Ctrl+V)</strong>.
                </li>
                <li>
                  Klik tombol hijau <strong>"Run"</strong> (atau tekan Ctrl+Enter). Selesai!
                </li>
              </ol>
              <p className="text-[11px] text-emerald-300/90 pt-1 italic">
                * Setelah skrip ini dijalankan, Anda dapat menghapus lomba langsung dari Table Editor Supabase maupun melalui Website CMS tanpa kendala.
              </p>
            </div>

            {/* SQL Code Box */}
            <div className="relative rounded-2xl bg-[#010b14] border border-white/15 p-3.5 max-h-48 overflow-y-auto">
              <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                {FIX_FOREIGN_KEY_CASCADE_SQL}
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
                  onClick={handleCopyCascadeSql}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  {copiedCascadeSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCascadeSql ? 'SQL Tersalin!' : 'Salin Skrip SQL CASCADE'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCascadeSqlModal(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Skrip Perbaikan Kategori Lomba (PAUD/RA/TK & PAGAR NUSA) */}
      {showCategorySqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#020e19] border border-amber-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-white text-base">
                      Perbaikan Kategori Baru (PAUD/RA/TK, PAGAR NUSA, GURU & ANSOR)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Supabase SQL
                    </span>
                  </div>
                  <p className="text-xs text-[#DDE7E8]/80 mt-0.5">
                    Mengatasi penolakan enum &amp; error 0A000 view: <code className="text-amber-300">view_rekap_peserta_lomba &amp; view_pendaftar_terbaru</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategorySqlModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status auto-healing info */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5 text-xs text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-white">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Proteksi Otomatis Website Sudah Aktif:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                Sistem CMS kini telah dilengkapi penyesuaian otomatis (fallback compatibility) sehingga pengiriman data lomba tetap berhasil. Skrip SQL di bawah ini telah diperbarui agar <strong>bebas dari Error 0A000 (view_rekap_peserta_lomba)</strong> serta mendukung kategori <strong>PAUD/RA/TK</strong>, <strong>PAGAR NUSA</strong>, <strong>GURU</strong>, dan <strong>ANSOR</strong> secara permanen.
              </p>
            </div>

            {/* Step by step guide */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <h4 className="text-xs font-bold text-[#F2C96D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Cara Menjalankan Skrip di Supabase:</span>
              </h4>
              <ol className="text-xs text-[#DDE7E8]/90 space-y-1.5 list-decimal list-inside pl-1">
                <li>
                  Klik tombol <strong>"Salin Skrip SQL Kategori"</strong> di bawah ini.
                </li>
                <li>
                  Buka <strong>Supabase Dashboard → SQL Editor → New query</strong>, lalu tempelkan (<strong>Ctrl+V</strong>).
                </li>
                <li>
                  Klik tombol hijau <strong>"Run"</strong> (atau tekan <strong>Ctrl+Enter</strong>). Selesai!
                </li>
              </ol>
            </div>

            {/* SQL Code Box */}
            <div className="relative rounded-2xl bg-[#010b14] border border-white/15 p-3.5 max-h-48 overflow-y-auto">
              <pre className="text-[11px] font-mono text-amber-300 whitespace-pre-wrap leading-relaxed">
                {FIX_CATEGORY_ENUM_SQL}
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
                  onClick={handleCopyCategorySql}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  {copiedCategorySql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCategorySql ? 'SQL Tersalin!' : 'Salin Skrip SQL Kategori'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCategorySqlModal(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast Alert */}
      {internalToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md bg-[#031525] border border-[#00D9F5] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-[#00D9F5] shrink-0" />
          <span>{internalToast}</span>
        </div>
      )}
    </div>
  );
};
