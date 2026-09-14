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
  HelpCircle
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  testSupabaseConnection, 
  syncAllCompetitionsToSupabase,
  fetchCompetitionsFromSupabase,
  fetchParticipantsFromSupabase,
  isSupabaseConnected
} from '../lib/supabaseClient';
import { Competition, ParticipantRegistration } from '../types';

export const QUICK_SUPABASE_SETUP_SQL = `-- ==============================================================================
-- SKRIP SETUP RESMI SUPABASE DATABASE & RLS: FESTIVAL HARI SANTRI 2026
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Tipe ENUM Kategori & Status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_generation_enum') THEN
        CREATE TYPE category_generation_enum AS ENUM (
            'Pra-Santri/Anak',
            'SMP/MTs',
            'SMA/SMK/MA',
            'Santri Ponpes',
            'Umum/Mahasiswa'
        );
    END IF;
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
    category category_generation_enum NOT NULL,
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
    category category_generation_enum NOT NULL,
    birth_date DATE,
    whatsapp VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    address TEXT NOT NULL,
    competition_id VARCHAR(50),
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

-- 4. Tabel Pesan Kontak & Saran Aspirasi
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name VARCHAR(150) NOT NULL,
    sender_email VARCHAR(100),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Kebijakan Row Level Security (RLS) untuk Akses Anon Key Publik & CMS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public all competitions" ON competitions;
CREATE POLICY "Public all competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all participants" ON participants;
CREATE POLICY "Public all participants" ON participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all contact_messages" ON contact_messages;
CREATE POLICY "Public all contact_messages" ON contact_messages FOR ALL USING (true) WITH CHECK (true);

-- 6. Setup Storage Bucket 'registrations' (Untuk Bukti Transfer & Surat Mandat)
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
  onRefreshCompetitions: (newComps: Competition[]) => void;
  onRefreshParticipants?: (newParticipants: ParticipantRegistration[]) => void;
  setFeedbackToast: (msg: string) => void;
}

export const AdminSupabaseTab: React.FC<AdminSupabaseTabProps> = ({
  competitions,
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tableStatus, setTableStatus] = useState<{ competitions: boolean; participants: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);

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
      });
    }
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, anonKey);
    const connected = isSupabaseConnected();
    setIsConnected(connected);
    
    // Dispatch event for App.tsx to reload
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase_credentials_updated'));
    }

    setFeedbackToast('Kredensial Supabase berhasil disimpan!');
    setTimeout(() => setFeedbackToast(''), 4000);

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
      if (res.success) {
        setFeedbackToast(res.message);
      } else {
        setFeedbackToast(`Koneksi Gagal: ${res.message}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      setStatusMessage(`Gagal: ${err.message}`);
    } finally {
      setTesting(false);
      setTimeout(() => setFeedbackToast(''), 4000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(QUICK_SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setFeedbackToast('Skrip SQL berhasil disalin! Tempelkan dan jalankan di Supabase SQL Editor.');
    setTimeout(() => setCopiedSql(false), 4000);
  };

  const handleSyncToSupabase = async () => {
    if (!isConnected) {
      setFeedbackToast('Harap hubungkan ke Supabase terlebih dahulu.');
      setTimeout(() => setFeedbackToast(''), 4000);
      return;
    }

    setSyncing(true);
    try {
      const res = await syncAllCompetitionsToSupabase(competitions);
      if (res.success) {
        setFeedbackToast(`Sukses! ${res.count} cabang lomba berhasil disinkronkan ke Supabase.`);
        setStatusMessage(`Sinkronisasi berhasil: ${res.count} data tersimpan di tabel 'competitions'.`);
      } else {
        setFeedbackToast(`Gagal sinkronisasi: ${res.error}`);
        setStatusMessage(`Error: ${res.error}`);
      }
    } catch (err: any) {
      setFeedbackToast(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedbackToast(''), 4000);
    }
  };

  const handleFetchFromSupabase = async () => {
    setFetching(true);
    try {
      const { data: remoteComps, error: compErr } = await fetchCompetitionsFromSupabase();
      if (compErr) {
        setFeedbackToast(`Gagal memuat lomba: ${compErr}`);
      } else if (remoteComps && remoteComps.length > 0) {
        onRefreshCompetitions(remoteComps);
        setFeedbackToast(`Berhasil memuat ${remoteComps.length} cabang lomba dari Supabase!`);
      } else {
        setFeedbackToast('Tabel competitions di Supabase masih kosong.');
      }

      if (onRefreshParticipants) {
        const { data: remoteParticipants } = await fetchParticipantsFromSupabase();
        if (remoteParticipants && remoteParticipants.length > 0) {
          onRefreshParticipants(remoteParticipants);
        }
      }
    } catch (err: any) {
      setFeedbackToast(`Kesalahan: ${err.message}`);
    } finally {
      setFetching(false);
      setTimeout(() => setFeedbackToast(''), 4000);
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
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-2 py-0.5 rounded ${tableStatus.competitions ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                competitions: {tableStatus.competitions ? 'Siap' : 'Belum Ada'}
              </span>
              <span className={`px-2 py-0.5 rounded ${tableStatus.participants ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                participants: {tableStatus.participants ? 'Siap' : 'Belum Ada'}
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
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
              {/* Sync Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D9F5]/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-[#00D9F5]" />
                      <span>Sinkronkan Lomba Lokal ke Supabase</span>
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-1">
                      Mengunggah seluruh {competitions.length} cabang lomba (termasuk Juknis & hadiah) ke tabel <code className="text-[#F2C96D]">competitions</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={syncing}
                    className="px-3.5 py-2 rounded-xl bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 border border-[#00D9F5]/40 text-[#00D9F5] hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                    <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                  </button>
                </div>
              </div>

              {/* Fetch Latest Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Tarik Data Terbaru dari Supabase</span>
                    </h5>
                    <p className="text-[11px] text-[#DDE7E8]/70 mt-1">
                      Memperbarui tampilan website dan CMS dengan data langsung yang tersimpan di cloud database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchFromSupabase}
                    disabled={fetching}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
                    <span>{fetching ? 'Memuat...' : 'Tarik Data'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Database Schema Reference */}
          <div className="p-3.5 rounded-xl bg-[#006B4F]/20 border border-[#006B4F]/40 text-[11px] text-[#DDE7E8]/90 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#F2C96D] mb-0.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>Skema Database Lengkap: database/supabase_schema_hsn2026.sql</span>
              </div>
              <p className="text-[10px] text-white/70">
                Mencakup 12 tabel (lomba, pendaftaran, berita, sponsor, galeri, juknis, linimasa) & RLS Policy publik.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#00D9F5] hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Salin SQL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
