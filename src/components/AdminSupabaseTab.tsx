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
  FileCode
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
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrl(creds.url);
    setAnonKey(creds.anonKey);
    setIsConnected(isSupabaseConnected());

    if (creds.url && creds.anonKey) {
      testSupabaseConnection().then((res) => {
        setIsConnected(res.success);
        if (res.success) {
          setStatusMessage(res.message);
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
              Daftar lomba Festival HSN 2026 terhubung dengan database PostgreSQL Supabase untuk persistensi realtime.
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
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          isConnected ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        }`}>
          {isConnected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

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
          <div className="p-3.5 rounded-xl bg-[#006B4F]/20 border border-[#006B4F]/40 text-[11px] text-[#DDE7E8]/90">
            <div className="flex items-center gap-1.5 font-bold text-[#F2C96D] mb-1">
              <FileCode className="w-3.5 h-3.5" />
              <span>Skema Tabel Supabase (database/supabase_schema_hsn2026.sql)</span>
            </div>
            <p>
              Tabel <strong className="text-white">competitions</strong> mendukung kolom: <code className="text-[#00D9F5]">code, title, category, rules, prizes, registration_fee, juknis_url, juknis_file_name</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
