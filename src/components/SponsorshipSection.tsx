import React, { useState } from 'react';
import { SPONSOR_PACKAGES } from '../data/initialData';
import { SponsorItem } from '../types';
import { Award, CheckCircle2, Sparkles, Download, MessageSquare, ArrowRight, X } from 'lucide-react';

interface SponsorshipSectionProps {
  onOpenDownload: () => void;
}

export const SponsorshipSection: React.FC<SponsorshipSectionProps> = ({ onOpenDownload }) => {
  const [activePackage, setActivePackage] = useState<SponsorItem | null>(null);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return '#00D9F5';
      case 'Gold':
        return '#F2C96D';
      case 'Silver':
        return '#DDE7E8';
      case 'Media Partner':
      default:
        return '#008F72';
    }
  };

  return (
    <section id="sponsor" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#D9B45B]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9B45B]/15 border border-[#D9B45B]/30 text-xs font-bold tracking-widest text-[#F2C96D] uppercase mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>KEMITRAAN & SPONSORSHIP</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            BERSINERGI MEMBANGUN
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5]">
              PERADABAN BANGSA
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Dukung gerakan santri berdaya dan raih eksposur strategis hingga lebih dari 10.000 masyarakat dan santri di Malang Raya.
          </p>
        </div>

        {/* Impact Highlights Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14 p-6 rounded-3xl bg-gradient-to-r from-[#006B4F]/30 via-[#020e19] to-[#00D9F5]/10 border border-white/10 text-center">
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#00D9F5]">10.000+</div>
            <div className="text-xs text-[#DDE7E8]/80 font-medium mt-1">Estimasi Jangkauan Warga & Jamaah</div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F2C96D]">15 Titik</div>
            <div className="text-xs text-[#DDE7E8]/80 font-medium mt-1">Baliho & Spanduk Jalur Protokol</div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#008F72]">100K+</div>
            <div className="text-xs text-[#DDE7E8]/80 font-medium mt-1">Impressi Digital Media Sosial NU</div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#D9B45B]">30+ Lembaga</div>
            <div className="text-xs text-[#DDE7E8]/80 font-medium mt-1">Jejaring Pesantren & Sekolah</div>
          </div>
        </div>

        {/* Sponsorship Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {SPONSOR_PACKAGES.map((pkg) => {
            const tierColor = getTierColor(pkg.tier);
            const isPlatinum = pkg.tier === 'Platinum';
            return (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  isPlatinum
                    ? 'glass-panel-gold border-2 border-[#D9B45B] shadow-2xl shadow-[#D9B45B]/20 scale-105 z-10'
                    : 'glass-panel border border-white/10 hover:border-white/30'
                }`}
              >
                {isPlatinum && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#D9B45B] to-[#F2C96D] text-[#031525] shadow">
                    PALING STRATEGIS
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${tierColor}20`,
                        color: tierColor,
                        border: `1px solid ${tierColor}40`,
                      }}
                    >
                      {pkg.tier}
                    </span>
                    <Sparkles className="w-4 h-4" style={{ color: tierColor }} />
                  </div>

                  <h3 className="font-heading text-lg font-bold text-white mb-2">
                    {pkg.name}
                  </h3>

                  <div className="font-mono text-xl sm:text-2xl font-black text-white mb-6" style={{ color: tierColor }}>
                    {pkg.contribution}
                  </div>

                  <div className="space-y-2.5 mb-6 text-xs text-white/85">
                    {pkg.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tierColor }} />
                        <span className="leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <a
                    href="#kontak"
                    className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-center block transition-all shadow"
                    style={{
                      backgroundColor: isPlatinum ? '#D9B45B' : 'rgba(255, 255, 255, 0.1)',
                      color: isPlatinum ? '#031525' : '#FFFFFF',
                    }}
                  >
                    Pilih Paket Kemitraan
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Banner: Download Proposal & Contact */}
        <div className="rounded-3xl p-8 bg-gradient-to-br from-[#006B4F]/30 via-[#031525] to-[#008F72]/20 border border-[#00D9F5]/30 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">
              Ingin Penawaran Khusus atau Bentuk Kemitraan Lainnya?
            </h3>
            <p className="text-xs sm:text-sm text-[#DDE7E8]/80 mt-1 max-w-xl">
              Kami membuka peluang kolaborasi natura, penyediaan fasilitas, media partner, serta stand bazar UMKM.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenDownload}
              className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-[#F2C96D] hover:bg-[#D9B45B] shadow-lg flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Proposal Sponsorship</span>
            </button>

            <a
              href="#kontak"
              className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#00D9F5]" />
              <span>Hubungi Seksi Usaha Dana</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
