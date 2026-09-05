import React, { useState } from 'react';
import { TIMELINE_ITEMS } from '../data/initialData';
import { TimelineItem } from '../types';
import { Calendar, CheckCircle2, Star, Sparkles, Clock, ArrowRight } from 'lucide-react';

export const EventTimelineSection: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<TimelineItem>(
    TIMELINE_ITEMS.find((t) => t.isHighlight) || TIMELINE_ITEMS[4]
  );

  return (
    <section id="agenda" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020e19] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-[#006B4F]/20 via-[#00D9F5]/10 to-[#D9B45B]/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00D9F5]/15 border border-[#00D9F5]/30 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>ROADMAP & AGENDA RESMI</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            TIMELINE
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D9B45B] via-[#00D9F5] to-[#008F72]">
              FESTIVAL HSN 2026
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Tahapan penyelenggaraan dari konsolidasi hingga perayaan puncak apel akbar dan tasyakuran kebangsaan.
          </p>
        </div>

        {/* Timeline Horizontal Navigation / Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {TIMELINE_ITEMS.map((item) => {
            const isSelected = selectedItem.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`relative rounded-2xl p-4 text-left transition-all duration-300 flex flex-col justify-between ${
                  item.isHighlight
                    ? isSelected
                      ? 'bg-gradient-to-b from-[#D9B45B]/25 via-[#031525] to-[#031525] border-2 border-[#D9B45B] shadow-[0_0_25px_rgba(217,180,91,0.5)] scale-105'
                      : 'bg-[#031525] border border-[#D9B45B]/60 shadow-[0_0_15px_rgba(217,180,91,0.25)]'
                    : isSelected
                    ? 'bg-[#031525] border-2 border-[#00D9F5] shadow-lg shadow-[#00D9F5]/20 scale-105'
                    : 'bg-[#031525]/70 hover:bg-[#031525] border border-white/10 hover:border-[#00D9F5]/30'
                }`}
              >
                {item.isHighlight && (
                  <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#D9B45B] text-[#031525] shadow flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-[#031525]" />
                    PUNCAK
                  </span>
                )}

                <div>
                  <div
                    className={`font-mono text-xs font-bold tracking-wider mb-1 ${
                      item.isHighlight ? 'text-[#F2C96D]' : isSelected ? 'text-[#00D9F5]' : 'text-[#DDE7E8]/70'
                    }`}
                  >
                    {item.period}
                  </div>
                  <div className="font-heading text-xs sm:text-sm font-bold text-white line-clamp-2">
                    {item.title}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span
                    className={`capitalize font-medium ${
                      item.status === 'completed'
                        ? 'text-emerald-400'
                        : item.status === 'current'
                        ? 'text-[#00D9F5]'
                        : 'text-[#DDE7E8]/60'
                    }`}
                  >
                    {item.status === 'completed'
                      ? 'Selesai'
                      : item.status === 'current'
                      ? 'Sedang Berjalan'
                      : 'Mendatang'}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.isHighlight
                        ? 'bg-[#D9B45B] animate-ping'
                        : isSelected
                        ? 'bg-[#00D9F5]'
                        : 'bg-white/20'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Timeline Card Highlight View */}
        <div
          className={`relative rounded-3xl p-6 sm:p-10 border shadow-2xl transition-all duration-500 overflow-hidden ${
            selectedItem.isHighlight
              ? 'glass-panel-gold border-[#D9B45B]/60 shadow-[0_0_40px_rgba(217,180,91,0.25)]'
              : 'glass-panel border-[#00D9F5]/30'
          }`}
        >
          {/* Subtle Glow Orb inside Card */}
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{
              backgroundColor: selectedItem.isHighlight
                ? 'rgba(217, 180, 91, 0.2)'
                : 'rgba(0, 217, 245, 0.15)',
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span
                  className="font-mono text-xs font-bold px-3 py-1 rounded-full uppercase"
                  style={{
                    backgroundColor: selectedItem.isHighlight ? 'rgba(217, 180, 91, 0.2)' : 'rgba(0, 217, 245, 0.2)',
                    color: selectedItem.isHighlight ? '#F2C96D' : '#00D9F5',
                    border: `1px solid ${selectedItem.isHighlight ? '#D9B45B' : '#00D9F5'}`,
                  }}
                >
                  {selectedItem.period}
                </span>

                {selectedItem.isHighlight && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-gradient-to-r from-[#D9B45B] to-[#F2C96D] text-[#031525] shadow flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    GRAND EVENT AKBAR HSN 2026
                  </span>
                )}
              </div>

              <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4">
                {selectedItem.title}
              </h3>

              <p className="text-sm sm:text-base text-[#DDE7E8]/90 leading-relaxed mb-6 font-normal">
                {selectedItem.description}
              </p>

              {selectedItem.isHighlight && (
                <div className="p-4 rounded-2xl bg-[#D9B45B]/10 border border-[#D9B45B]/30 mb-4 text-xs sm:text-sm text-[#F2C96D]">
                  <strong className="block mb-1 font-bold text-white">Dresscode & Kehadiran:</strong>
                  Seluruh peserta apel mengenakan atasan kemeja/baju putih santri santun, bersarung (putih/motif santun), dan berpeci hitam nasional.
                </div>
              )}
            </div>

            {/* Right Activities List */}
            <div className="lg:col-span-5 bg-black/40 rounded-2xl p-5 sm:p-6 border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00D9F5] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Rangkaian Agenda & Kegiatan:</span>
              </h4>

              <div className="space-y-3">
                {selectedItem.activities.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-white/95">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        selectedItem.isHighlight ? 'text-[#D9B45B]' : 'text-[#008F72]'
                      }`}
                    />
                    <span className="font-medium">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
