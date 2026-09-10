import React, { useState } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Github, 
  Cloud, 
  Cpu, 
  FileCode, 
  ShieldCheck, 
  ArrowRight,
  Server
} from 'lucide-react';

export const AdminDeploymentTab: React.FC = () => {
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

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
vercel`;

  const envSample = `VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Vercel Status Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#006B4F]/30 via-[#031525] to-[#008F72]/20 border border-[#00D9F5]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white shrink-0 shadow-lg">
            {/* Vercel triangle */}
            <svg className="w-6 h-6 fill-white" viewBox="0 0 1155 1000">
              <path d="m577.3 0 577.4 1000H0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white">
                Status Integrasi Vercel
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> SIAP DEPLOY (READY)
              </span>
            </div>
            <p className="text-xs text-[#DDE7E8]/80 mt-1">
              File konfigurasi <code className="text-[#00D9F5] font-mono">vercel.json</code> dan build output <code className="text-[#F2C96D] font-mono">dist/</code> sudah terkonfigurasi untuk Vite SPA.
            </p>
          </div>
        </div>

        <a
          href="https://vercel.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-white text-[#031525] font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#DDE7E8] transition-all shadow-lg hover:scale-105 shrink-0"
        >
          <span>Buka Vercel New Project</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 2 Deployment Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Metode 1: Hubungkan via GitHub (Paling Direkomendasikan) */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <Github className="w-4 h-4 text-[#00D9F5]" />
              <span>Metode 1: Hubungkan via GitHub (Auto-Deploy)</span>
            </div>
            <p className="text-xs text-[#DDE7E8]/70 mb-4">
              Setiap kali Anda push perubahan kode ke GitHub, Vercel otomatis melakukan build dan update website.
            </p>

            <ol className="space-y-3 text-xs text-[#DDE7E8]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-white">Push Repository ke GitHub</span>
                  <p className="text-[11px] text-[#DDE7E8]/70">Download ZIP atau ekspor proyek ini ke akun GitHub Anda.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-white">Import di Vercel</span>
                  <p className="text-[11px] text-[#DDE7E8]/70">Buka <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-[#00D9F5] underline">vercel.com</a> &gt; Add New &gt; Project &gt; Pilih repositori GitHub Anda.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-semibold text-white">Cek Pengaturan Build (Preset Vite)</span>
                  <ul className="list-disc list-inside text-[11px] text-[#DDE7E8]/70 mt-1 space-y-0.5">
                    <li>Framework Preset: <strong className="text-white">Vite</strong></li>
                    <li>Build Command: <strong className="text-white">npm run build</strong></li>
                    <li>Output Directory: <strong className="text-white">dist</strong></li>
                  </ul>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#006B4F] text-[#F2C96D] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <span className="font-semibold text-white">Klik tombol "Deploy"</span>
                  <p className="text-[11px] text-[#DDE7E8]/70">Dalam 45-60 detik website Anda resmi live dengan domain <code>.vercel.app</code>.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Gratis SSL HTTPS, CDN Global, dan proteksi DDoS aktif otomatis.</span>
          </div>
        </div>

        {/* Metode 2: Deploy Cepat Menggunakan Vercel CLI */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <Terminal className="w-4 h-4 text-[#F2C96D]" />
              <span>Metode 2: Deploy Instan via Terminal / Vercel CLI</span>
            </div>
            <p className="text-xs text-[#DDE7E8]/70 mb-4">
              Jalankan perintah ini di terminal laptop/komputer Anda untuk deploy dalam satu baris perintah:
            </p>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
                {cliCommand}
              </pre>
              <button
                onClick={() => handleCopy(cliCommand, setCopiedCliCommand)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white flex items-center gap-1 transition-all"
              >
                {copiedCliCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCliCommand ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-[11px] text-[#DDE7E8]/80">
              <p>• Ketik <strong>Y</strong> saat ditanya <em>"Set up and deploy?"</em></p>
              <p>• Pilih scope akun Vercel Anda</p>
              <p>• Vercel otomatis mendeteksi konfigurasi <code>vercel.json</code> dan build <code>dist/</code></p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#DDE7E8]/80">
            <strong className="text-[#F2C96D]">Tips Produksi:</strong> Untuk update live ke domain utama, jalankan: <code className="text-white bg-black px-1.5 py-0.5 rounded font-mono">vercel --prod</code>
          </div>
        </div>
      </div>

      {/* vercel.json & Environment Variable Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* vercel.json Preview */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <FileCode className="w-4 h-4 text-[#00D9F5]" />
              <span>Konfigurasi vercel.json (Sudah Dibuat)</span>
            </div>
            <button
              onClick={() => handleCopy(vercelJsonCode, setCopiedVercelJson)}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-[#00D9F5] flex items-center gap-1"
            >
              {copiedVercelJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedVercelJson ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#DDE7E8]/70">
            Fungsi rewrites memastikan semua rute SPA dialihkan ke <code>index.html</code> tanpa error 404 saat pengguna refresh halaman.
          </p>
          <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto">
            {vercelJsonCode}
          </pre>
        </div>

        {/* Environment Variables Supabase */}
        <div className="p-5 rounded-2xl bg-[#020e19] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Server className="w-4 h-4 text-[#F2C96D]" />
              <span>Environment Variables di Vercel (Supabase)</span>
            </div>
            <button
              onClick={() => handleCopy(envSample, setCopiedEnv)}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-[#F2C96D] flex items-center gap-1"
            >
              {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedEnv ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#DDE7E8]/70">
            Masukkan key ini di menu <strong>Settings &gt; Environment Variables</strong> pada dashboard Vercel Anda:
          </p>
          <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-[#F2C96D] overflow-x-auto">
            {envSample}
          </pre>
          <p className="text-[10px] text-[#DDE7E8]/60 italic">
            Dapatkan URL dan Anon Key dari dashboard Supabase &gt; Project Settings &gt; API.
          </p>
        </div>
      </div>
    </div>
  );
};
