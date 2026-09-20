import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Github, 
  FileCode, 
  Server,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  Database,
  ArrowUpRight
} from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConnected } from '../lib/supabaseClient';

export const AdminDeploymentTab: React.FC = () => {
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSyncUrl, setCopiedSyncUrl] = useState(false);
  const [copiedBackupJson, setCopiedBackupJson] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [creds, setCreds] = useState<{ url: string; anonKey: string }>({ url: '', anonKey: '' });
  const [isConnected, setIsConnected] = useState(false);

  const vercelDomain = 'https://hsn-2026.vercel.app';

  useEffect(() => {
    const active = getSupabaseCredentials();
    setCreds(active);
    setIsConnected(isSupabaseConnected());
  }, []);

  const vercelJsonCode = `{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`;

  const cliCommand = `npm i -g vercel
vercel login
vercel --prod`;

  // Real or sample credentials for copying
  const envText = creds.url && creds.anonKey 
    ? `VITE_SUPABASE_URL=${creds.url}\nVITE_SUPABASE_ANON_KEY=${creds.anonKey}`
    : `VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  // Magic sync URL that auto-injects credentials on Vercel domain
  const syncUrl = creds.url && creds.anonKey 
    ? `${vercelDomain}/#setup-supabase?url=${encodeURIComponent(creds.url)}&key=${encodeURIComponent(creds.anonKey)}`
    : `${vercelDomain}/#setup-supabase`;

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 3000);
  };

  // Export full CMS State to JSON file
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        site: 'Festival HSN 2026 MWC NU Poncokusumo',
        supabase_url: creds.url,
        supabase_anon_key: creds.anonKey,
        deleted_competitions: JSON.parse(localStorage.getItem('hsn2026_deleted_competitions_v1') || '[]'),
        custom_competitions: JSON.parse(localStorage.getItem('hsn2026_custom_competitions_v1') || '[]'),
        participants: JSON.parse(localStorage.getItem('hsn2026_participants') || '[]'),
        registered_users: JSON.parse(localStorage.getItem('hsn2026_registered_users') || '[]'),
        deleted_users: JSON.parse(localStorage.getItem('hsn2026_deleted_users_v1') || '[]'),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsn2026_cms_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal mengekspor data: ' + err.message);
    }
  };

  // Import full CMS State from JSON
  const handleImportBackup = () => {
    setImportMessage(null);
    if (!importJsonText.trim()) {
      setImportMessage({ type: 'error', text: 'Silakan tempel teks JSON cadangan terlebih dahulu.' });
      return;
    }

    try {
      const data = JSON.parse(importJsonText);

      if (data.supabase_url && data.supabase_anon_key) {
        saveSupabaseCredentials(data.supabase_url, data.supabase_anon_key);
      }
      if (Array.isArray(data.deleted_competitions)) {
        localStorage.setItem('hsn2026_deleted_competitions_v1', JSON.stringify(data.deleted_competitions));
      }
      if (Array.isArray(data.custom_competitions)) {
        localStorage.setItem('hsn2026_custom_competitions_v1', JSON.stringify(data.custom_competitions));
      }
      if (Array.isArray(data.participants)) {
        localStorage.setItem('hsn2026_participants', JSON.stringify(data.participants));
      }
      if (Array.isArray(data.registered_users)) {
        localStorage.setItem('hsn2026_registered_users', JSON.stringify(data.registered_users));
      }
      if (Array.isArray(data.deleted_users)) {
        localStorage.setItem('hsn2026_deleted_users_v1', JSON.stringify(data.deleted_users));
      }

      setImportMessage({ 
        type: 'success', 
        text: 'Data CMS berhasil diimpor! Halaman akan memuat ulang data dalam 2 detik...' 
      });

      window.dispatchEvent(new Event('supabase_credentials_updated'));
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setImportMessage({ type: 'error', text: 'Format JSON tidak valid: ' + err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Vercel Domain Connection Diagnostic Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#003828] via-[#02182b] to-[#012822] border border-[#00D9F5]/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white shrink-0 shadow-lg">
              <svg className="w-6 h-6 fill-white" viewBox="0 0 1155 1000">
                <path d="m577.3 0 577.4 1000H0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-lg font-bold text-white">
                  Sinkronisasi Data Vercel & CMS
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/40 flex items-center gap-1 font-mono">
                  hsn-2026.vercel.app
                </span>
              </div>
              <p className="text-xs text-[#DDE7E8]/80 mt-1">
                Koreksi dan panduan menyelaraskan data pendaftar & cabang lomba antara preview ini dengan website live di Vercel.
              </p>
            </div>
          </div>

          <a
            href={vercelDomain}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white text-[#031525] font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#DDE7E8] transition-all shadow-lg hover:scale-105 shrink-0"
          >
            <span>Buka Website Vercel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Diagnostic Explanation Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mengapa data di https://hsn-2026.vercel.app/ berbeda dengan di sini?</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#DDE7E8]/90">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <strong className="text-[#00D9F5] block">1. Isolasi LocalStorage</strong>
              <p>Peramban memisahkan memori per domain. Konfigurasi yang Anda simpan di domain preview ini tidak otomatis berpindah ke domain Vercel.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <strong className="text-[#F2C96D] block">2. Environment Variables Vercel</strong>
              <p>Vercel membutuhkan key <code className="text-white">VITE_SUPABASE_URL</code> & <code className="text-white">VITE_SUPABASE_ANON_KEY</code> di Vercel Project Settings agar database aktif untuk publik.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <strong className="text-emerald-400 block">3. Pembaruan Kode (Build Cache)</strong>
              <p>Deployment di Vercel perlu di-redeploy agar memuat perubahan cabang lomba ANSOR, kategori PAUD, dan perbaikan data terbaru.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SOLUSI 1: LINK SINKRONISASI INSTAN 1-KLIK KE VERCEL */}
      <div className="p-5 rounded-3xl bg-[#02111e] border border-emerald-500/40 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                <span>Solusi 1: Tautan Sinkronisasi Cepat (1-Klik ke Vercel)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Instan
                </span>
              </h4>
              <p className="text-[11px] text-[#DDE7E8]/70">
                Membuka website Vercel dengan parameter aman yang otomatis menyimpan kredensial Supabase ke domain Vercel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {creds.url && creds.anonKey ? (
              <a
                href={syncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span>Buka & Sinkronkan di Vercel</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => handleCopy(syncUrl, setCopiedSyncUrl)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {copiedSyncUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSyncUrl ? 'Tautan Tersalin!' : 'Salin Tautan'}</span>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300 break-all select-all">
          {syncUrl}
        </div>
      </div>

      {/* SOLUSI 2: PASANG ENVIRONMENT VARIABLES DI VERCEL DASHBOARD (PERMANEN UNTUK SEMUA PENGUNJUNG) */}
      <div className="p-5 rounded-3xl bg-[#020e19] border border-[#F2C96D]/40 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F2C96D]/20 border border-[#F2C96D]/40 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4 text-[#F2C96D]" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                <span>Solusi 2: Pasang Environment Variables di Vercel (Permanen)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F2C96D]/20 text-[#F2C96D] border border-[#F2C96D]/40">
                  Rekomendasi Publik
                </span>
              </h4>
              <p className="text-[11px] text-[#DDE7E8]/70">
                Wajib dilakukan agar database Supabase terhubung untuk seluruh pendaftar dan pengunjung umum tanpa perlu login admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#F2C96D] text-[#031525] font-black text-xs flex items-center justify-center gap-1.5 hover:bg-yellow-300 transition-all shadow-md active:scale-95"
            >
              <span>Buka Dashboard Vercel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => handleCopy(envText, setCopiedEnv)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Env Tersalin!' : 'Salin Kredensial (.env)'}</span>
            </button>
          </div>
        </div>

        {/* Snippet Siap Tempel */}
        <div className="relative">
          <pre className="p-3.5 rounded-2xl bg-black/80 border border-white/15 font-mono text-xs text-[#F2C96D] overflow-x-auto whitespace-pre leading-relaxed">
            {envText}
          </pre>
        </div>

        {/* 3 Langkah Mudah di Vercel */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
          <span className="font-bold text-white block">3 Langkah Memasukkan ke Vercel:</span>
          <ol className="space-y-2 text-[11px] text-[#DDE7E8]/85 list-decimal list-inside">
            <li>
              Buka <strong className="text-white">Vercel Dashboard</strong> &gt; Pilih project <strong className="text-[#00D9F5]">hsn-2026</strong> &gt; Masuk ke tab <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Environment Variables</strong>.
            </li>
            <li>
              Tempel key <code className="text-[#00D9F5] bg-black/40 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> dan <code className="text-[#00D9F5] bg-black/40 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> di atas, centang <em>Production, Preview, Development</em>, lalu klik <strong className="text-emerald-400">Save</strong>.
            </li>
            <li>
              Masuk ke tab <strong className="text-white">Deployments</strong> di Vercel &gt; Klik titik tiga <strong className="text-white">(...)</strong> pada deployment paling atas &gt; Pilih <strong className="text-[#F2C96D]">Redeploy</strong> (Pastikan centang <em>"Use existing Build Cache"</em> <span className="underline font-bold text-rose-300">dimatikan</span> agar membaca variabel baru).
            </li>
          </ol>
        </div>
      </div>

      {/* SOLUSI 3: CADANGAN & PEMULIHAN DATA CMS (EKSPOR / IMPOR JSON ANTAR DOMAIN) */}
      <div className="p-5 rounded-3xl bg-[#020e19] border border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-white">
                Cadangan &amp; Transfer Data CMS (Ekspor / Impor JSON)
              </h4>
              <p className="text-[11px] text-[#DDE7E8]/70">
                Pindahkan seluruh pengaturan lomba, daftar peserta, dan akun panitia antar domain tanpa kehilangan data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Cadangan (.json)</span>
          </button>
        </div>

        {/* Area Impor JSON */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-[11px] font-bold text-[#DDE7E8]/90 block">
            Impor Cadangan Data CMS ke Domain Ini:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Tempel teks JSON cadangan di sini untuk menyinkronkan data..."
              className="flex-1 p-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D9F5]"
            />
            <button
              type="button"
              onClick={handleImportBackup}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 self-stretch sm:self-auto"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Impor Sekarang</span>
            </button>
          </div>

          {importMessage && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold ${
              importMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
            }`}>
              {importMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* METODE DEPLOYMENT KE GITHUB & VERCEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Metode 1: Hubungkan via GitHub */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <Github className="w-4 h-4 text-[#00D9F5]" />
              <span>Pembaruan Kode Otomatis (GitHub)</span>
            </div>
            <p className="text-xs text-[#DDE7E8]/70 mb-4">
              Setiap kali Anda push perubahan kode ke GitHub, Vercel otomatis melakukan build ulang dan memperbarui website live.
            </p>

            <ol className="space-y-3 text-xs text-[#DDE7E8]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-white">Ekspor / Push ke GitHub</span>
                  <p className="text-[11px] text-[#DDE7E8]/70">Gunakan menu Settings di pojok atas AI Studio untuk "Export to GitHub" atau unduh ZIP proyek.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-white">Preset Vite di Vercel</span>
                  <p className="text-[11px] text-[#DDE7E8]/70">Build Command: <code className="text-white">npm run build</code>, Output Directory: <code className="text-white">dist</code>.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Gratis SSL HTTPS, CDN Global, dan proteksi otomatis.</span>
          </div>
        </div>

        {/* Metode 2: Deploy Instan via CLI */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <Terminal className="w-4 h-4 text-[#F2C96D]" />
              <span>Deploy Instan via Vercel CLI</span>
            </div>
            <p className="text-xs text-[#DDE7E8]/70 mb-4">
              Jalankan perintah ini di terminal komputer Anda untuk deploy update langsung ke domain utama:
            </p>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
                {cliCommand}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(cliCommand, setCopiedCliCommand)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white flex items-center gap-1 transition-all"
              >
                {copiedCliCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCliCommand ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="mt-3 space-y-1 text-[11px] text-[#DDE7E8]/80">
              <p>• Perintah <code className="text-[#00D9F5]">vercel --prod</code> langsung mem-publish ke domain <code className="text-white">hsn-2026.vercel.app</code>.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#DDE7E8]/80">
            <strong className="text-[#F2C96D]">Tips Produksi:</strong> Pastikan Environment Variables di Vercel sudah disimpan sebelum menjalankan redeploy.
          </div>
        </div>
      </div>
    </div>
  );
};

