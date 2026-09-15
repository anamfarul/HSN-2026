import React from 'react';
import { ShieldCheck, Heart, ArrowUp, Sparkles, MapPin, Calendar } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenRegister: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenRegister }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#020b14] border-t border-[#00D9F5]/15 pt-16 pb-12 overflow-hidden text-[#DDE7E8]">
      {/* Subtle Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#006B4F]/20 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Col 1 & 2: Brand Identity & Spirit */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {/* NU Logo Emblem */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#006B4F] via-[#008F72] to-[#031525] p-0.5 shadow-lg shadow-[#006B4F]/40 flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-[#031525] flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold text-[#F2C96D]">NU</span>
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#00D9F5]" />
                    <span className="w-1 h-1 rounded-full bg-[#D9B45B]" />
                    <span className="w-1 h-1 rounded-full bg-[#00D9F5]" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold tracking-widest text-[#00D9F5] uppercase">
                  MWC NU KECAMATAN PONCOKUSUMO
                </div>
                <h3 className="font-heading text-lg font-black text-white leading-tight">
                  Festival Hari Santri Nasional 2026
                </h3>
              </div>
            </div>

            <p className="font-heading text-sm font-bold text-[#F2C96D] leading-snug">
              “Mengawal Indonesia Merdeka Menuju Peradaban Dunia”
            </p>

            <p className="text-xs text-[#DDE7E8]/80 leading-relaxed max-w-sm">
              Gerakan kolaboratif lintas generasi yang menghubungkan nilai-nilai luhur tradisi pesantren, kearifan Nusantara, kecakapan digital, dan inovasi global.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-[#00D9F5]">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Santri Berakhlak
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Santri Berilmu
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Santri Berbudaya
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Santri Berdigital
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Santri Mendunia
              </span>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              Navigasi Halaman
            </h4>
            <ul className="space-y-2.5 text-xs text-[#DDE7E8]/80">
              <li>
                <a href="#beranda" className="hover:text-[#00D9F5] transition-colors">
                  Beranda
                </a>
              </li>
              <li>
                <a href="#tentang" className="hover:text-[#00D9F5] transition-colors">
                  Tentang HSN 2026
                </a>
              </li>
              <li>
                <a href="#pilar" className="hover:text-[#00D9F5] transition-colors">
                  5 Pilar Santri Masa Depan
                </a>
              </li>
              <li>
                <a href="#program" className="hover:text-[#00D9F5] transition-colors">
                  Program Generasi
                </a>
              </li>
              <li>
                <a href="#lomba" className="hover:text-[#00D9F5] transition-colors">
                  Festival & Lomba
                </a>
              </li>
              <li>
                <a href="#agenda" className="hover:text-[#00D9F5] transition-colors">
                  Agenda & Timeline
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Informasi & Unduhan */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              Informasi & Berkas
            </h4>
            <ul className="space-y-2.5 text-xs text-[#DDE7E8]/80">
              <li>
                <a href="#sponsor" className="hover:text-[#00D9F5] transition-colors">
                  Paket Sponsorship
                </a>
              </li>
              <li>
                <a href="#unduhan" className="hover:text-[#00D9F5] transition-colors">
                  Download Proposal & Juknis
                </a>
              </li>
              <li>
                <a href="#berita" className="hover:text-[#00D9F5] transition-colors">
                  Kabar Hari Santri
                </a>
              </li>
              <li>
                <a href="#kontak" className="hover:text-[#00D9F5] transition-colors">
                  Narahubung Panitia
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="text-left text-[#F2C96D] hover:underline flex items-center gap-1 font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Portal Admin CMS</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Lokasi & Call to Action */}
          <div className="space-y-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white mb-4">
              Puncak Peringatan
            </h4>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#F2C96D] font-bold">
                <Calendar className="w-4 h-4" />
                <span>Kamis, 22 Oktober 2026</span>
              </div>
              <div className="flex items-start gap-2 text-[#DDE7E8]/80">
                <MapPin className="w-4 h-4 text-[#00D9F5] flex-shrink-0 mt-0.5" />
                <span>Lapangan Utama Poncokusumo, Kabupaten Malang</span>
              </div>
            </div>

            <button
              onClick={onOpenRegister}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 shadow transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daftar Sekarang</span>
            </button>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#DDE7E8]/70">
          <p>© 2026 MWC NU Kecamatan Poncokusumo. All Rights Reserved.</p>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdmin}
              className="hover:text-[#00D9F5] transition-colors"
            >
              CMS Admin
            </button>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 hover:text-white transition-colors"
              aria-label="Kembali ke atas halaman"
            >
              <span>Kembali Ke Atas</span>
              <ArrowUp className="w-3.5 h-3.5 text-[#00D9F5]" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
