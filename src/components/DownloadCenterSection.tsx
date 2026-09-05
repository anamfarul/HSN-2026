import React, { useState } from 'react';
import { DOWNLOAD_DOCUMENTS } from '../data/initialData';
import { DownloadDoc } from '../types';
import { FileText, Download, Check, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

export const DownloadCenterSection: React.FC = () => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = (doc: DownloadDoc) => {
    setDownloadingId(doc.id);
    setDownloadSuccess(null);

    // Simulate instant secure file packaging & trigger realistic download
    setTimeout(() => {
      // Create a virtual text/pdf blob download for user convenience
      const simulatedContent = `=== MWC NU KECAMATAN PONCOKUSUMO ===
FESTIVAL HARI SANTRI NASIONAL 2026
DOKUMEN RESMI: ${doc.title.toUpperCase()}
Kategori: ${doc.category}
Ukuran: ${doc.size}
Tanggal Terbit: ${doc.lastUpdated}
Tema: "MENGAWAL INDONESIA MERDEKA MENUJU PERADABAN DUNIA"
Sekretariat: MWC NU Kecamatan Poncokusumo, Kab. Malang, Jawa Timur.

==================================================
Keterangan Dokumen:
${doc.description}

Catatan Resmi:
Dokumen ini diterbitkan secara sah oleh Panitia Pelaksana Peringatan Hari Santri Nasional 2026 MWC NU Kecamatan Poncokusumo untuk dipergunakan sebagaimana mestinya.
==================================================`;

      const blob = new Blob([simulatedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title.replace(/\s+/g, '_')}_HSN2026.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadingId(null);
      setDownloadSuccess(doc.title);
      setTimeout(() => setDownloadSuccess(null), 4000);
    }, 800);
  };

  return (
    <section id="unduhan" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020e19] overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9B45B]/15 border border-[#D9B45B]/30 text-xs font-bold tracking-widest text-[#F2C96D] uppercase mb-3">
            <Download className="w-3.5 h-3.5" />
            <span>PUSAT ARSIP & DOKUMEN RESMI</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            DOWNLOAD
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D9B45B] via-[#00D9F5] to-[#008F72]">
              CENTER HSN 2026
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Unduh seluruh berkas administrasi resmi, proposal kerjasama, petunjuk teknis perlombaan, dan peta lokasi festival.
          </p>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-fade-in shadow-xl">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              Berkas <strong>{downloadSuccess}</strong> berhasil diunduh ke perangkat Anda.
            </span>
          </div>
        )}

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOWNLOAD_DOCUMENTS.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-3xl p-6 sm:p-7 glass-panel border border-white/10 hover:border-[#00D9F5]/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Top info */}
                <div className="flex items-center justify-between mb-4">
                  {/* PDF Icon Pill */}
                  <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] shadow group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-[#F2C96D] px-2 py-0.5 rounded bg-[#D9B45B]/15 border border-[#D9B45B]/30 block">
                      {doc.format} • {doc.size}
                    </span>
                    <span className="text-[10px] text-[#DDE7E8]/60 mt-1 block">
                      {doc.category}
                    </span>
                  </div>
                </div>

                <h3 className="font-heading text-lg font-bold text-white group-hover:text-[#F2C96D] transition-colors mb-2 leading-snug">
                  {doc.title}
                </h3>

                <p className="text-xs text-[#DDE7E8]/80 leading-relaxed mb-6 line-clamp-2">
                  {doc.description}
                </p>
              </div>

              {/* Bottom metadata & download button */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#DDE7E8]/60">
                  Update: {doc.lastUpdated}
                </span>

                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow ${
                    downloadingId === doc.id
                      ? 'bg-white/20 text-white cursor-wait'
                      : 'bg-gradient-to-r from-[#006B4F] via-[#008F72] to-[#00D9F5] text-white hover:brightness-110 active:scale-95 shadow-[#008F72]/30'
                  }`}
                >
                  {downloadingId === doc.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>DOWNLOAD</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Need Help Banner */}
        <div className="mt-14 p-6 rounded-2xl bg-gradient-to-r from-[#006B4F]/20 via-[#031525] to-[#00D9F5]/10 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#00D9F5] flex-shrink-0" />
            <p className="text-xs sm:text-sm text-[#DDE7E8]">
              Memerlukan berkas pendukung dalam format khusus atau surat undangan resmi kelembagaan?
            </p>
          </div>
          <a
            href="#kontak"
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#F2C96D] bg-white/5 hover:bg-white/10 border border-[#D9B45B]/30 whitespace-nowrap transition-colors"
          >
            Hubungi Sekretariat
          </a>
        </div>
      </div>
    </section>
  );
};
