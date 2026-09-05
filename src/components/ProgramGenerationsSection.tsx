import React, { useState } from 'react';
import { GENERATION_PROGRAMS } from '../data/initialData';
import { GenerationProgram, CategoryGeneration } from '../types';
import { 
  Smile, 
  Video, 
  Smartphone, 
  Mic2, 
  Radio, 
  ShoppingBag, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  X,
  Sparkles,
  Calendar
} from 'lucide-react';

interface ProgramGenerationsSectionProps {
  onSelectCategoryForRegister: (category: CategoryGeneration) => void;
}

export const ProgramGenerationsSection: React.FC<ProgramGenerationsSectionProps> = ({
  onSelectCategoryForRegister,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<GenerationProgram | null>(null);

  const getProgramIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smile':
        return <Smile className="w-6 h-6" />;
      case 'Video':
        return <Video className="w-6 h-6" />;
      case 'Smartphone':
        return <Smartphone className="w-6 h-6" />;
      case 'Mic2':
        return <Mic2 className="w-6 h-6" />;
      case 'Radio':
        return <Radio className="w-6 h-6" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-6 h-6" />;
      case 'Users':
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  return (
    <section id="program" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-batik-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#006B4F]/30 border border-[#008F72]/50 text-xs font-semibold tracking-widest text-[#00D9F5] uppercase mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>KLASTER PROGRAM LINTAS USIA</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            SATU FESTIVAL
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00D9F5] via-[#F2C96D] to-[#008F72]">
              SEMUA GENERASI
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Setiap lapisan generasi memiliki panggung kehormatan untuk berkreasi, berkompetisi secara sehat, dan menorehkan prestasi demi kemuliaan santri Nusantara.
          </p>
        </div>

        {/* 7 Interactive Generation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GENERATION_PROGRAMS.map((prog, index) => (
            <div
              key={prog.id}
              className="group relative rounded-3xl p-7 bg-gradient-to-b from-[#031525]/90 via-[#006B4F]/15 to-[#031525] border border-white/10 hover:border-[#00D9F5]/50 transition-all duration-300 shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer"
              onClick={() => setSelectedProgram(prog)}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold tracking-widest text-[#F2C96D] px-2.5 py-1 rounded-md bg-[#D9B45B]/15 border border-[#D9B45B]/30">
                    {prog.cardNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#00D9F5] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00D9F5]/10 border border-[#00D9F5]/30">
                      {prog.category}
                    </span>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow"
                      style={{ backgroundColor: `${prog.accentColor}30`, border: `1px solid ${prog.accentColor}60`, color: prog.accentColor }}
                    >
                      {getProgramIcon(prog.iconName)}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-[#DDE7E8]/70 block mb-1">
                  {prog.badge}
                </span>

                <h3 className="font-heading text-lg sm:text-xl font-bold text-white group-hover:text-[#F2C96D] transition-colors mb-3">
                  {prog.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#DDE7E8]/80 leading-relaxed mb-5 line-clamp-2">
                  {prog.description}
                </p>

                {/* Sub-Programs Pills */}
                <div className="space-y-1.5 mb-6">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D9F5] mb-2">
                    Program Utama:
                  </div>
                  {prog.programs.map((item, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs text-white/90">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#008F72] flex-shrink-0" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProgram(prog);
                  }}
                  className="text-xs font-semibold text-[#00D9F5] group-hover:text-[#F2C96D] transition-colors flex items-center gap-1.5"
                >
                  <span>Detail Program</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategoryForRegister(prog.category);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 shadow active:scale-95 transition-all"
                >
                  Daftar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 bg-[#031525] border border-[#00D9F5]/40 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProgram(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup modal detail"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-1 rounded bg-[#D9B45B]/20">
                {selectedProgram.cardNumber}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/40">
                {selectedProgram.category}
              </span>
              <span className="text-xs text-[#DDE7E8]/70">
                {selectedProgram.badge}
              </span>
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl font-black text-white mb-2">
              {selectedProgram.title}
            </h3>

            <p className="text-sm text-[#DDE7E8]/90 leading-relaxed mb-6">
              {selectedProgram.description}
            </p>

            <div className="space-y-4 bg-white/5 rounded-2xl p-5 border border-white/10 mb-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F2C96D] mb-1">
                  Tujuan & Target Capaian:
                </h4>
                <p className="text-xs sm:text-sm text-white/90">
                  {selectedProgram.objective}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#00D9F5] mb-1">
                  Sasaran Peserta:
                </h4>
                <p className="text-xs sm:text-sm text-white/90">
                  {selectedProgram.participantTarget}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D9B45B] mb-2">
                  Daftar Kegiatan & Lomba:
                </h4>
                <div className="space-y-2">
                  {selectedProgram.programs.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-white">
                      <Sparkles className="w-3.5 h-3.5 text-[#00D9F5]" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedProgram(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#DDE7E8] bg-white/10 hover:bg-white/20 transition-colors"
              >
                Tutup
              </button>

              <button
                onClick={() => {
                  const cat = selectedProgram.category;
                  setSelectedProgram(null);
                  onSelectCategoryForRegister(cat);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-lg shadow-[#00D9F5]/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daftar Kategori Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
