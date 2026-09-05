import React from 'react';
import { FestivalStats } from '../types';
import { INITIAL_STATS } from '../data/initialData';
import { Layers, Activity, Users, School, Globe2, ShieldCheck, Sparkles } from 'lucide-react';

interface IntroStatsSectionProps {
  stats?: FestivalStats;
  onOpenAdmin?: () => void;
  onOpenRegister?: () => void;
}

export const IntroStatsSection: React.FC<IntroStatsSectionProps> = ({ 
  stats = INITIAL_STATS, 
  onOpenAdmin,
  onOpenRegister 
}) => {
  const safeStats: FestivalStats = {
    ...INITIAL_STATS,
    ...(stats || {}),
  };

  const statItems = [
    {
      label: 'KLASTER PROGRAM',
      value: `${safeStats.klasterProgram}+`,
      desc: 'Lintas Generasi dari PAUD hingga Muslimat NU',
      icon: Layers,
      color: '#00D9F5',
    },
    {
      label: 'KEGIATAN',
      value: `${safeStats.totalKegiatan}+`,
      desc: 'Lomba, Kajian, Apel Akbar, Bazar & Sholawat',
      icon: Activity,
      color: '#008F72',
    },
    {
      label: 'PESERTA',
      value: `${(safeStats.totalPeserta || 1000).toLocaleString()}+`,
      desc: 'Santri, Pelajar, Kader Muda & Jam\'iyyah',
      icon: Users,
      color: '#D9B45B',
    },
    {
      label: 'LEMBAGA',
      value: `${safeStats.totalLembaga}+`,
      desc: 'Pesantren, Madrasah, Sekolah & Ranting NU',
      icon: School,
      color: '#F2C96D',
    },
  ];

  return (
    <section id="tentang" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Decorative Glow & Geometry */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#006B4F]/25 border border-[#00D9F5]/25 text-xs font-semibold tracking-widest text-[#00D9F5] uppercase mb-4">
            <Globe2 className="w-3.5 h-3.5 text-[#00D9F5]" />
            <span>RESOLUSI JIHAD MASA KINI</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight leading-tight">
            DARI PESANTREN
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D9B45B] via-[#00D9F5] to-[#008F72]">
              UNTUK PERADABAN DUNIA
            </span>
          </h2>

          <div className="w-24 h-1 bg-gradient-to-r from-[#006B4F] via-[#00D9F5] to-[#D9B45B] mx-auto my-6 rounded-full" />

          <p className="text-base sm:text-lg text-[#DDE7E8] leading-relaxed font-normal">
            Hari Santri Nasional 2026 MWC NU Kecamatan Poncokusumo dihadirkan sebagai gerakan kolaboratif lintas generasi yang menghubungkan nilai-nilai pesantren, budaya Nusantara, ilmu pengetahuan, teknologi dan kreativitas.
          </p>
        </div>

        {/* Narrative Feature Highlight Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: Akar Pesantren */}
          <div className="glass-card rounded-2xl p-7 border border-white/10 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#006B4F]/30 border border-[#008F72]/50 flex items-center justify-center text-[#00D9F5] mb-5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2 group-hover:text-[#00D9F5] transition-colors">
              Menjaga Tradisi Salafus Shalih
            </h3>
            <p className="text-sm text-[#DDE7E8]/80 leading-relaxed">
              Memegang teguh sanad keilmuan, adab santri kepada kiai, kajian kitab kuning turats, serta prinsip Ahlussunnah wal Jama\'ah An-Nahdliyyah yang moderat (tawasuth), seimbang (tawazun), dan toleran (tasamuh).
            </p>
          </div>

          {/* Card 2: Sintesis Sains & Budaya */}
          <div className="glass-card rounded-2xl p-7 border border-[#D9B45B]/20 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#D9B45B]/20 border border-[#D9B45B]/50 flex items-center justify-center text-[#F2C96D] mb-5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2 group-hover:text-[#F2C96D] transition-colors">
              Budaya Nusantara & Kebangsaan
            </h3>
            <p className="text-sm text-[#DDE7E8]/80 leading-relaxed">
              Santri tidak mencabut diri dari akar bumi Nusantara. Dari lereng Bromo-Semeru, santri merawat kelestarian alam, kearifan lokal, dan komitmen hubbul wathan minal iman (cinta tanah air sebagian dari iman).
            </p>
          </div>

          {/* Card 3: Transformasi Digital Menembus Dunia */}
          <div className="glass-card rounded-2xl p-7 border border-[#00D9F5]/20 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#00D9F5]/20 border border-[#00D9F5]/50 flex items-center justify-center text-[#00D9F5] mb-5 group-hover:scale-110 transition-transform">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2 group-hover:text-[#00D9F5] transition-colors">
              Akselerasi Teknologi Menuju Dunia
            </h3>
            <p className="text-sm text-[#DDE7E8]/80 leading-relaxed">
              Santri abad 21 menguasai teknologi kecerdasan buatan, komputasi awan, media kreatif, dan wirausaha digital untuk membawa risalah Islam rahmatan lil alamin ke pentas peradaban global.
            </p>
          </div>
        </div>

        {/* Animated Statistics Section */}
        <div className="relative rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-[#006B4F]/20 via-[#031525]/90 to-[#008F72]/20 border border-[#00D9F5]/20 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00D9F5]">
                DIMENSI & SKALA FESTIVAL HSN 2026
              </span>
              <h3 className="font-heading text-2xl font-black text-white mt-1">
                Data Statistik Semarak Hari Santri
              </h3>
            </div>
            <button
              onClick={() => onOpenAdmin?.()}
              className="self-start md:self-auto text-xs text-[#F2C96D] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#D9B45B]/40 transition-all"
              title="Perbarui angka statistik di Panel Admin"
            >
              <span>Edit via Admin</span>
              <span className="text-xs">→</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {statItems.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}50` }}
                  >
                    <IconComponent className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <div 
                    className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-1"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className="font-heading text-xs sm:text-sm font-bold tracking-wider text-white uppercase mt-1">
                    {item.label}
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#DDE7E8]/70 mt-1 max-w-[200px]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
