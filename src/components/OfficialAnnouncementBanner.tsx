import React, { useState } from 'react';
import { 
  Bell, 
  UploadCloud, 
  Tv, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  X, 
  Radio, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface OfficialAnnouncementBannerProps {
  onOpenUploadWork?: () => void;
  onOpenRegister?: () => void;
}

export const OfficialAnnouncementBanner: React.FC<OfficialAnnouncementBannerProps> = ({
  onOpenUploadWork,
  onOpenRegister,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isDismissed) return null;

  return (
    <aside 
      id="pengumuman-resmi-hsn"
      aria-label="Pengumuman Resmi Panitia Hari Santri Nasional 2026"
      className="relative z-40 w-full bg-gradient-to-r from-[#031525] via-[#004D38] to-[#020e19] border-b border-[#D9B45B]/40 shadow-xl text-white transition-all duration-300"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-10 left-1/4 w-72 h-20 bg-[#00D9F5]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 right-1/4 w-72 h-20 bg-[#D9B45B]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 relative z-10">
        {isMinimized ? (
          // Minimized view bar
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2 font-bold text-[#F2C96D]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D9F5] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D9F5]"></span>
              </span>
              <Bell className="w-3.5 h-3.5 text-[#F2C96D]" />
              <span className="uppercase tracking-wider">Pengumuman Penting:</span>
              <span className="text-white/90 font-medium truncate max-w-[280px] sm:max-w-none">
                Batas Aploud Karya (18 Okt) & Pengumuman Juara (23 Okt)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(false)}
                className="text-[11px] font-bold text-[#00D9F5] hover:underline px-2 py-0.5"
              >
                Buka Selengkapnya
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-white/40 hover:text-white p-1"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          // Full detailed banner
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            {/* Left Header Tag */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D9B45B] to-[#F2C96D] text-[#031525] flex items-center justify-center font-bold shadow-md shadow-[#D9B45B]/30 shrink-0">
                <Bell className="w-4 h-4 fill-[#031525]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F2C96D]/20 text-[#F2C96D] border border-[#F2C96D]/40">
                    PENGUMUMAN RESMI PANITIA
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
                    PENTING
                  </span>
                </div>
                <h3 className="font-heading font-black text-xs sm:text-sm text-white tracking-wide mt-0.5">
                  JADWAL PENGUMPULAN KARYA & MALAM PUNCAK HSN 2026
                </h3>
              </div>
            </div>

            {/* Middle: 2 Bullet Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full lg:w-auto text-xs flex-1 lg:mx-4">
              {/* Point 1 */}
              <div className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#00D9F5]/40 transition-all">
                <div className="w-5 h-5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div className="leading-snug">
                  <div className="font-bold text-[#00D9F5] flex items-center gap-1">
                    <UploadCloud className="w-3 h-3 text-[#00D9F5]" />
                    <span>Pengumpulan / Aploud Karya Peserta</span>
                  </div>
                  <div className="text-white/90 text-[11px] mt-0.5">
                    Terakhir tanggal <strong className="text-amber-300 font-bold">18 Oktober 2026</strong> pukul <strong className="text-amber-300 font-bold">24.00 WIB</strong>.
                  </div>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#F2C96D]/40 transition-all">
                <div className="w-5 h-5 rounded-full bg-[#F2C96D]/20 text-[#F2C96D] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div className="leading-snug">
                  <div className="font-bold text-[#F2C96D] flex items-center gap-1">
                    <Tv className="w-3 h-3 text-[#F2C96D]" />
                    <span>Pengumuman Pemenang Juara</span>
                  </div>
                  <div className="text-white/90 text-[11px] mt-0.5">
                    Tanggal <strong className="text-[#00D9F5] font-bold">23 Oktober 2026</strong> pada Malam Puncak HSN pukul <strong className="text-[#00D9F5] font-bold">18.00 WIB</strong> secara <strong className="text-white font-bold">offline</strong> & <strong className="text-white font-bold">online (Kanal YouTube Resmi HSN)</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-white/10">
              {onOpenUploadWork && (
                <button
                  id="announcement-btn-upload-karya"
                  onClick={onOpenUploadWork}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#F2C96D] text-[#031525] font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Aploud Karya</span>
                </button>
              )}

              <a
                href="https://www.youtube.com/@mwcnuponcokusumo"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 text-red-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                title="Buka Kanal YouTube Resmi HSN untuk Siaran Langsung Malam Puncak"
              >
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Kanal YouTube HSN</span>
                <span className="sm:hidden">YouTube</span>
              </a>

              <button
                onClick={() => setIsMinimized(true)}
                className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
                title="Kecilkan Pengumuman"
                aria-label="Kecilkan Pengumuman"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
