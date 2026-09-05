import React, { useState } from 'react';
import { FIVE_PILLARS } from '../data/initialData';
import { HeartHandshake, BookOpen, Sparkles, Cpu, Globe, ArrowUpRight } from 'lucide-react';
import { FivePillar } from '../types';

export const FivePillarsSection: React.FC = () => {
  const [activePillar, setActivePillar] = useState<string | null>(null);

  const getIcon = (name: string) => {
    switch (name) {
      case 'HeartHandshake':
        return <HeartHandshake className="w-8 h-8" />;
      case 'BookOpen':
        return <BookOpen className="w-8 h-8" />;
      case 'Sparkles':
        return <Sparkles className="w-8 h-8" />;
      case 'Cpu':
        return <Cpu className="w-8 h-8" />;
      case 'Globe':
      default:
        return <Globe className="w-8 h-8" />;
    }
  };

  return (
    <section id="pilar" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020e19] overflow-hidden">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-[#006B4F]/20 via-[#00D9F5]/10 to-[#D9B45B]/15 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00D9F5]/10 border border-[#00D9F5]/30 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <span>SPIRIT & FILOSOFI PERGERAKAN</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            5 PILAR SANTRI
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F2C96D] via-[#00D9F5] to-[#008F72]">
              MASA DEPAN
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Kompas integritas, keilmuan, kebudayaan, dan daya saing global santri generasi emas Nahdlatul Ulama 2026.
          </p>
        </div>

        {/* 5 Interactive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {FIVE_PILLARS.map((pillar: FivePillar) => {
            const isHovered = activePillar === pillar.id;
            return (
              <div
                key={pillar.id}
                onMouseEnter={() => setActivePillar(pillar.id)}
                onMouseLeave={() => setActivePillar(null)}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-500 cursor-pointer overflow-hidden group ${
                  isHovered
                    ? 'transform -translate-y-3 shadow-2xl'
                    : 'bg-[#031525]/75 hover:bg-[#031525]'
                }`}
                style={{
                  border: isHovered
                    ? `1.5px solid ${pillar.glowColor}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isHovered
                    ? `0 20px 40px -15px ${pillar.glowColor}40`
                    : 'none',
                }}
              >
                {/* Glow Radial on Active */}
                <div
                  className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none"
                  style={{
                    backgroundColor: `${pillar.glowColor}25`,
                    opacity: isHovered ? 1 : 0.3,
                  }}
                />

                {/* Card Top: Number & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className="font-mono text-3xl sm:text-4xl font-black tracking-tighter transition-colors"
                      style={{ color: isHovered ? pillar.glowColor : '#DDE7E8' }}
                    >
                      {pillar.number}
                    </span>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg"
                      style={{
                        backgroundColor: `${pillar.glowColor}20`,
                        border: `1px solid ${pillar.glowColor}50`,
                        color: pillar.glowColor,
                      }}
                    >
                      {getIcon(pillar.iconName)}
                    </div>
                  </div>

                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2"
                    style={{
                      backgroundColor: `${pillar.glowColor}20`,
                      color: pillar.glowColor,
                    }}
                  >
                    {pillar.badge}
                  </span>

                  <h3 className="font-heading text-xl font-black tracking-wide text-white group-hover:text-[#F2C96D] transition-colors">
                    {pillar.title}
                  </h3>

                  <div className="text-xs font-semibold text-[#00D9F5] mt-1 mb-3">
                    {pillar.subtitle}
                  </div>

                  <p className="text-xs sm:text-sm text-[#DDE7E8]/80 leading-relaxed font-normal">
                    {pillar.description}
                  </p>
                </div>

                {/* Card Bottom: Interactive Footer */}
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-[#DDE7E8]/60 group-hover:text-white transition-colors">
                    HSN 2026 Pilar
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isHovered ? pillar.glowColor : 'rgba(255, 255, 255, 0.05)',
                      color: isHovered ? '#031525' : '#DDE7E8',
                    }}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
