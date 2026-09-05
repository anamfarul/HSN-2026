import React, { useState } from 'react';
import { SIGNATURE_PROGRAMS } from '../data/initialData';
import { SignatureProgram } from '../types';
import { Flag, Moon, Compass, Calendar, MapPin, CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';

export const SignatureProgramsSection: React.FC = () => {
  const [activeModal, setActiveModal] = useState<SignatureProgram | null>(null);

  const getSignatureIcon = (name: string) => {
    switch (name) {
      case 'Flag':
        return <Flag className="w-6 h-6 text-[#00D9F5]" />;
      case 'Moon':
        return <Moon className="w-6 h-6 text-[#F2C96D]" />;
      case 'Compass':
      default:
        return <Compass className="w-6 h-6 text-[#008F72]" />;
    }
  };

  return (
    <section id="program-unggulan" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020e19] overflow-hidden">
      {/* Visual Ambiance */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#D9B45B]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9B45B]/15 border border-[#D9B45B]/30 text-xs font-bold tracking-widest text-[#F2C96D] uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PUNCAK MAHA KARYA FESTIVAL</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            SIGNATURE
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5]">
              PROGRAMS
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Tiga pilar momentum sakral dan akbar yang mengukir sejarah persatuan, doa kebangsaan, dan penghormatan kepada para pejuang Islam Nusantara.
          </p>
        </div>

        {/* 3 Large Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SIGNATURE_PROGRAMS.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-3xl overflow-hidden glass-panel border border-white/10 hover:border-[#D9B45B]/50 transition-all duration-500 shadow-2xl flex flex-col justify-between"
            >
              {/* Image Banner Container with Parallax Effect */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-[#031525]/50 to-transparent" />

                {/* Badge Top Left */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#031525]/85 border border-[#D9B45B]/40 text-[#F2C96D] backdrop-blur-md">
                    {item.badge}
                  </span>
                </div>

                {/* Icon Top Right */}
                <div className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-[#031525]/85 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                  {getSignatureIcon(item.iconName)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-7 sm:p-8 flex-1 flex flex-col justify-between -mt-6 relative z-10">
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-black text-white group-hover:text-[#F2C96D] transition-colors leading-snug mb-4">
                    {item.title}
                  </h3>

                  {/* Date & Location Pills */}
                  <div className="space-y-2 mb-5 text-xs text-[#DDE7E8]/90">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#00D9F5] flex-shrink-0" />
                      <span className="font-semibold text-white">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#D9B45B] flex-shrink-0" />
                      <span>{item.location}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#DDE7E8]/80 leading-relaxed mb-6 line-clamp-3 font-normal">
                    {item.description}
                  </p>

                  {/* Key Highlights */}
                  <div className="space-y-2 mb-6">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D9F5]">
                      Sorotan Utama:
                    </div>
                    {item.highlights.slice(0, 3).map((h, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-2 text-xs text-white/90">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#008F72] mt-0.5 flex-shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Button */}
                <button
                  onClick={() => setActiveModal(item)}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#DDE7E8] hover:text-white bg-white/5 hover:bg-[#006B4F]/40 border border-white/10 hover:border-[#00D9F5]/40 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                >
                  <span>Selengkapnya & Agenda</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Program Detail Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#031525] border border-[#D9B45B]/40 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-[#031525]/80 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup detail program"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={activeModal.image}
                alt={activeModal.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-[#031525]/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#D9B45B]/20 border border-[#D9B45B]/40 text-[#F2C96D] mb-2 inline-block">
                  {activeModal.badge}
                </span>
                <h3 className="font-heading text-2xl sm:text-4xl font-black text-white">
                  {activeModal.title}
                </h3>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <Calendar className="w-5 h-5 text-[#00D9F5]" />
                  <div>
                    <div className="text-[#DDE7E8]/60 text-[10px] uppercase font-bold">Waktu Pelaksanaan</div>
                    <div className="text-white font-semibold">{activeModal.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <MapPin className="w-5 h-5 text-[#D9B45B]" />
                  <div>
                    <div className="text-[#DDE7E8]/60 text-[10px] uppercase font-bold">Lokasi Utama</div>
                    <div className="text-white font-semibold">{activeModal.location}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#00D9F5] mb-2">
                  Deskripsi Kegiatan Lengkap:
                </h4>
                <p className="text-sm sm:text-base text-[#DDE7E8]/90 leading-relaxed font-normal">
                  {activeModal.description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#F2C96D] mb-3">
                  Rangkaian Agenda & Sorotan Acara:
                </h4>
                <div className="space-y-2.5">
                  {activeModal.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/95">
                      <CheckCircle2 className="w-4 h-4 text-[#008F72] mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 shadow transition-all"
                >
                  Tutup & Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
