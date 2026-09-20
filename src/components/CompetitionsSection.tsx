import React, { useState } from 'react';
import { Competition, CategoryGeneration } from '../types';
import { 
  Trophy, 
  Search, 
  Calendar, 
  MapPin, 
  FileText, 
  Gift, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  X,
  Sparkles,
  Award,
  Database
} from 'lucide-react';

interface CompetitionsSectionProps {
  competitions: Competition[];
  onRegisterCompetition: (competition: Competition) => void;
  isSupabaseLive?: boolean;
}

export const CompetitionsSection: React.FC<CompetitionsSectionProps> = ({
  competitions,
  onRegisterCompetition,
  isSupabaseLive,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetailModal, setActiveDetailModal] = useState<Competition | null>(null);

  const defaultCategories = [
    'SEMUA',
    'PAUD/RA/TK',
    'SD/MI',
    'SMP/MTs',
    'SMA/MA/SMK',
    'IPNU/IPPNU',
    'FATAYAT',
    'MUSLIMAT',
    'PAGAR NUSA',
    'GURU',
    'ANSOR',
    'UMUM',
  ];

  // Tambahkan kategori custom jika ada lomba baru dengan kategori tambahan
  const extraCategories = [...new Set<string>(competitions.map((c) => String(c.category)))].filter(
    (c) => Boolean(c) && !defaultCategories.includes(c)
  );
  const categories = [...defaultCategories, ...extraCategories];

  const filteredCompetitions = competitions.filter((comp) => {
    const matchesCategory =
      selectedCategory === 'SEMUA' || comp.category === selectedCategory;
    const matchesSearch =
      comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.targetAudience.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="lomba" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#008F72]/20 border border-[#00D9F5]/30 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>AJANG PRESTASI & KREATIVITAS</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            FESTIVAL
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00D9F5] via-[#D9B45B] to-[#F2C96D]">
              SANTRI NUSANTARA 2026
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Salurkan bakat, orisinalitas karya, dan sportivitas Anda dalam berbagai cabang perlombaan bergengsi berhadiah trofi kehormatan dan uang pembinaan.
          </p>

          {/* Supabase CMS Live Indicator */}
          <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#020e19]/80 border border-white/10 text-[11px] text-[#DDE7E8]/80 shadow-sm backdrop-blur-sm">
            <span className={`w-2 h-2 rounded-full ${isSupabaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-[#00D9F5]'}`} />
            <Database className="w-3 h-3 text-[#00D9F5]" />
            <span>
              {isSupabaseLive ? (
                <>Terhubung langsung dengan <strong className="text-emerald-400 font-semibold">Database Supabase CMS</strong> ({competitions.length} Cabang Lomba)</>
              ) : (
                <>Katalog Lomba Resmi HSN 2026 ({competitions.length} Cabang Lomba)</>
              )}
            </span>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/60 shadow-lg shadow-[#006B4F]/40 scale-105'
                    : 'bg-white/5 text-[#DDE7E8] hover:bg-white/10 border border-white/10 hover:border-[#00D9F5]/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Cari cabang lomba..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-[#DDE7E8]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Competitions Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map((comp) => (
            <div
              key={comp.id}
              className="group relative rounded-3xl p-6 sm:p-7 glass-card border border-white/10 hover:border-[#00D9F5]/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Header: Code & Category Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-0.5 rounded bg-[#D9B45B]/20 border border-[#D9B45B]/30">
                    {comp.code}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30 uppercase tracking-wider">
                    {comp.category}
                  </span>
                </div>

                <h3 className="font-heading text-lg sm:text-xl font-bold text-white group-hover:text-[#F2C96D] transition-colors mb-2 leading-snug">
                  {comp.title}
                </h3>

                <p className="text-xs text-[#00D9F5] font-medium mb-3">
                  Sasaran: {comp.targetAudience}
                </p>

                <p className="text-xs sm:text-sm text-[#DDE7E8]/80 leading-relaxed mb-5 line-clamp-3">
                  {comp.description}
                </p>

                {/* Info Pills */}
                <div className="space-y-2 py-3 border-y border-white/10 mb-5 text-xs text-[#DDE7E8]/90">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#F2C96D]" />
                    <span>Batas Pendaftaran: <strong className="text-white">{comp.deadline}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-[#00D9F5]" />
                    <span>Biaya: <strong className="text-emerald-400">{comp.registrationFee}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDetailModal(comp)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-[#DDE7E8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00D9F5]" />
                  <span>Juknis & Hadiah</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRegisterCompetition(comp)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 active:scale-95 shadow transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Daftar</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCompetitions.length === 0 && (
          <div className="text-center py-16 text-[#DDE7E8]/70">
            <Trophy className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <p className="text-base font-semibold">Tidak ditemukan perlombaan dengan kata kunci tersebut.</p>
            <button
              onClick={() => {
                setSelectedCategory('SEMUA');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-[#00D9F5]"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Juknis & Detail Modal */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 bg-[#031525] border border-[#00D9F5]/40 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveDetailModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup detail juknis"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-0.5 rounded bg-[#D9B45B]/20">
                {activeDetailModal.code}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5]">
                {activeDetailModal.category}
              </span>
            </div>

            <h3 className="font-heading text-2xl font-black text-white mb-2">
              {activeDetailModal.title}
            </h3>
            <p className="text-xs text-[#00D9F5] font-semibold mb-4">
              Kategori Peserta: {activeDetailModal.targetAudience}
            </p>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-5 text-xs sm:text-sm text-[#DDE7E8]/90 leading-relaxed">
              {activeDetailModal.description}
            </div>

            {/* Ketentuan & Aturan Lomba */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F2C96D] mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Ketentuan & Aturan Lomba:</span>
              </h4>
              <div className="space-y-2 bg-[#020e19] p-4 rounded-xl border border-white/10">
                {activeDetailModal.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-white/90">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#008F72] mt-0.5 flex-shrink-0" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Penghargaan & Hadiah */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00D9F5] mb-2 flex items-center gap-2">
                <Award className="w-3.5 h-3.5" />
                <span>Apresiasi & Hadiah Kejuaraan:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#D9B45B]/15 border border-[#D9B45B]/40 text-center">
                  <div className="text-[10px] font-bold text-[#F2C96D] uppercase">Juara I</div>
                  <div className="text-xs font-semibold text-white mt-1">{activeDetailModal.prizes.first}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/15 text-center">
                  <div className="text-[10px] font-bold text-gray-300 uppercase">Juara II</div>
                  <div className="text-xs font-semibold text-white mt-1">{activeDetailModal.prizes.second}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#006B4F]/20 border border-[#008F72]/40 text-center">
                  <div className="text-[10px] font-bold text-[#00D9F5] uppercase">Juara III</div>
                  <div className="text-xs font-semibold text-white mt-1">{activeDetailModal.prizes.third}</div>
                </div>
              </div>
            </div>

            {/* Technical Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Technical Meeting</span>
                <span className="text-white font-semibold">{activeDetailModal.technicalMeeting}</span>
              </div>
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Lokasi / Media</span>
                <span className="text-white font-semibold">{activeDetailModal.location}</span>
              </div>
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Narahubung</span>
                <span className="text-[#00D9F5] font-semibold">{activeDetailModal.contactPerson}</span>
              </div>
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Batas Pendaftaran</span>
                <span className="text-[#F2C96D] font-semibold">{activeDetailModal.deadline}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              {activeDetailModal.juknisUrl ? (
                <a
                  href={activeDetailModal.juknisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#F2C96D] bg-[#D9B45B]/20 hover:bg-[#D9B45B]/30 border border-[#D9B45B]/40 transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh Juknis ({activeDetailModal.juknisFileName || 'PDF'})</span>
                </a>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDetailModal(null)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#DDE7E8] bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const comp = activeDetailModal;
                    setActiveDetailModal(null);
                    onRegisterCompetition(comp);
                  }}
                  className="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-lg shadow-[#00D9F5]/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Daftar Lomba Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
