import React, { useState } from 'react';
import { ParticipantRegistration, Competition, DownloadDoc } from '../types';
import { 
  X, 
  ShieldCheck, 
  Users, 
  Trophy, 
  FileText, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus, 
  Edit, 
  Trash2, 
  BarChart3,
  Lock,
  LogOut,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantRegistration[];
  onUpdateParticipantStatus: (id: string, status: 'Terverifikasi' | 'Menunggu' | 'Ditolak') => void;
  competitions: Competition[];
  onAddCompetition: (comp: Competition) => void;
  onDeleteCompetition: (id: string) => void;
  documents: DownloadDoc[];
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  participants,
  onUpdateParticipantStatus,
  competitions,
  onAddCompetition,
  onDeleteCompetition,
  documents,
}) => {
  // Simple authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default demo authenticated
  const [activeTab, setActiveTab] = useState<'participants' | 'competitions' | 'documents' | 'stats'>('participants');
  
  // Filters for participants
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Competition Form State
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompCategory, setNewCompCategory] = useState('SMP/MTs');
  const [newCompTarget, setNewCompTarget] = useState('');
  const [newCompDeadline, setNewCompDeadline] = useState('10 Oktober 2026');

  if (!isOpen) return null;

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.competitionTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // Export CSV function
  const handleExportCSV = () => {
    const headers = 'No Reg,Nama Lengkap,Lembaga,Kategori,Lomba,WhatsApp,Email,Status,Tanggal Daftar\n';
    const rows = filteredParticipants
      .map(
        (p) =>
          `"${p.registrationNumber}","${p.fullName}","${p.institution}","${p.category}","${p.competitionTitle}","${p.whatsapp}","${p.email}","${p.status}","${p.registeredAt}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Peserta_HSN2026_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateNewComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompTitle.trim()) return;

    const randomId = `comp-${Date.now()}`;
    const code = `LMB-${competitions.length + 1}`;
    const created: Competition = {
      id: randomId,
      code,
      title: newCompTitle.trim(),
      category: newCompCategory as any,
      targetAudience: newCompTarget || `Delegasi santri ${newCompCategory}`,
      deadline: newCompDeadline,
      technicalMeeting: '12 Oktober 2026',
      location: 'Kompleks Pesantren Poncokusumo',
      contactPerson: '0812-XXXX-XXXX (Panitia)',
      registrationFee: 'Gratis',
      iconName: 'Trophy',
      description: `Perlombaan ${newCompTitle} yang diselenggarakan secara sportif dan kompetitif bagi generasi santri.`,
      rules: [
        'Peserta merupakan utusan sah dari lembaga terkait.',
        'Wajib melampirkan surat mandat resmi.',
        'Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.',
      ],
      prizes: {
        first: 'Trofi Juara I + Piagam + Dana Pembinaan',
        second: 'Trofi Juara II + Piagam + Dana Pembinaan',
        third: 'Trofi Juara III + Piagam + Dana Pembinaan',
      },
    };

    onAddCompetition(created);
    setShowAddCompModal(false);
    setNewCompTitle('');
    setNewCompTarget('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-lg animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Admin Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#006B4F]/50 via-[#031525] to-[#008F72]/30 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2C96D]/20 border border-[#D9B45B]/40 flex items-center justify-center text-[#F2C96D]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg sm:text-xl font-black text-white">
                  CMS PANITIA HSN 2026
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  DEMO AKTIF
                </span>
              </div>
              <span className="text-[11px] text-[#DDE7E8]/70">
                Sistem Manajemen Peserta & Konten MWC NU Poncokusumo
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Tutup CMS Admin"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Nav Tabs */}
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-3 pb-2 border-b border-white/10 bg-[#020e19]">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'participants'
                ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/50 shadow'
                : 'text-[#DDE7E8] hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Peserta Terdaftar ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('competitions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'competitions'
                ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/50 shadow'
                : 'text-[#DDE7E8] hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Cabang Lomba ({competitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/50 shadow'
                : 'text-[#DDE7E8] hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistik Ringkas</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'documents'
                ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/50 shadow'
                : 'text-[#DDE7E8] hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Berkas Arsip ({documents.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: PARTICIPANTS */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              {/* Toolbar: Search, Filter, Export */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      placeholder="Cari peserta / no reg / lembaga..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#020e19] border border-white/20 text-white focus:outline-none focus:border-[#00D9F5]"
                    />
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-[#020e19] border border-white/20 text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="PAUD/TK">PAUD/TK</option>
                    <option value="SD/MI">SD/MI</option>
                    <option value="SMP/MTs">SMP/MTs</option>
                    <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                    <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                    <option value="FATAYAT">FATAYAT</option>
                    <option value="MUSLIMAT">MUSLIMAT</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-[#020e19] border border-white/20 text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Menunggu">Menunggu</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#031525] bg-[#F2C96D] hover:bg-[#D9B45B] transition-all flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Table of Participants */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020e19]">
                <table className="w-full text-left text-xs text-[#DDE7E8]">
                  <thead className="bg-white/5 border-b border-white/10 font-bold text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">No. Reg</th>
                      <th className="p-3">Nama & Lembaga</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Cabang Lomba</th>
                      <th className="p-3">Kontak WA</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#F2C96D] whitespace-nowrap">
                          {p.registrationNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{p.fullName}</div>
                          <div className="text-[11px] text-white/60">{p.institution}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D9F5]/10 text-[#00D9F5] border border-[#00D9F5]/30">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 text-white/90">{p.competitionTitle}</td>
                        <td className="p-3 font-mono">{p.whatsapp}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'Terverifikasi'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : p.status === 'Menunggu'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => onUpdateParticipantStatus(p.id, 'Terverifikasi')}
                            title="Setujui Verifikasi"
                            className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onUpdateParticipantStatus(p.id, 'Menunggu')}
                            title="Set Menunggu"
                            className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onUpdateParticipantStatus(p.id, 'Ditolak')}
                            title="Tolak Verifikasi"
                            className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: COMPETITIONS MANAGEMENT */}
          {activeTab === 'competitions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    Daftar Cabang Perlombaan
                  </h3>
                  <p className="text-xs text-[#DDE7E8]/70">
                    Kelola perlombaan yang tampil pada portal publik dan form pendaftaran.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCompModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 transition-all flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Lomba Baru</span>
                </button>
              </div>

              {/* Competitions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitions.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-[#F2C96D] px-2 py-0.5 rounded bg-[#D9B45B]/20">
                          {comp.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5]">
                          {comp.category}
                        </span>
                      </div>
                      <h4 className="font-heading text-sm font-bold text-white mb-1">
                        {comp.title}
                      </h4>
                      <p className="text-xs text-[#DDE7E8]/80 mb-3 line-clamp-2">
                        {comp.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#DDE7E8]/70">
                      <span>Batas: {comp.deadline}</span>
                      <button
                        onClick={() => onDeleteCompetition(comp.id)}
                        className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                        title="Hapus Cabang Lomba"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#006B4F]/30 to-[#031525] border border-white/10">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase">Total Pendaftar</div>
                  <div className="font-mono text-3xl font-black text-white mt-1">
                    {participants.length}
                  </div>
                  <div className="text-xs text-emerald-400 mt-2">
                    {participants.filter((p) => p.status === 'Terverifikasi').length} Terverifikasi
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#D9B45B]/20 to-[#031525] border border-white/10">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase">Cabang Perlombaan</div>
                  <div className="font-mono text-3xl font-black text-[#F2C96D] mt-1">
                    {competitions.length}
                  </div>
                  <div className="text-xs text-[#DDE7E8]/60 mt-2">
                    7 Klaster Generasi Santri
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00D9F5]/20 to-[#031525] border border-white/10">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase">Dokumen Resmi</div>
                  <div className="font-mono text-3xl font-black text-[#00D9F5] mt-1">
                    {documents.length}
                  </div>
                  <div className="text-xs text-[#DDE7E8]/60 mt-2">
                    Proposal, Juknis & Rundown
                  </div>
                </div>
              </div>

              {/* Category Breakdown list */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-4">
                  Distribusi Peserta Berdasarkan Kategori Generasi:
                </h4>
                <div className="space-y-3 text-xs">
                  {['PAUD/TK', 'SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'IPNU/IPPNU', 'FATAYAT', 'MUSLIMAT'].map((c) => {
                    const count = participants.filter((p) => p.category === c).length;
                    const percent = participants.length > 0 ? Math.round((count / participants.length) * 100) : 0;
                    return (
                      <div key={c}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-white">{c}</span>
                          <span className="text-[#00D9F5] font-mono">{count} peserta ({percent}%)</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#006B4F] to-[#00D9F5] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS LIST */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <h3 className="font-heading text-base font-bold text-white">
                  Daftar Berkas & Dokumen Publik
                </h3>
                <p className="text-xs text-[#DDE7E8]/70">
                  Seluruh berkas yang terhubung langsung dengan Download Center HSN 2026.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-[#020e19] border border-white/10 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-xs leading-snug">{doc.title}</h4>
                      <p className="text-[11px] text-white/60 mt-0.5">{doc.category} • {doc.size}</p>
                      <p className="text-[11px] text-[#00D9F5] mt-1">Terakhir update: {doc.lastUpdated}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-MODAL: Tambah Lomba */}
      {showAddCompModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#031525] border border-[#00D9F5]/40 p-6 shadow-2xl">
            <button
              onClick={() => setShowAddCompModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-heading text-lg font-bold text-white mb-4">
              Tambah Cabang Lomba Baru
            </h3>
            <form onSubmit={handleCreateNewComp} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1">Nama Lomba</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Musabaqah Hifdzil Qur'an"
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1">Kategori</label>
                <select
                  value={newCompCategory}
                  onChange={(e) => setNewCompCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none"
                >
                  <option value="PAUD/TK">PAUD/TK</option>
                  <option value="SD/MI">SD/MI</option>
                  <option value="SMP/MTs">SMP/MTs</option>
                  <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                  <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                  <option value="FATAYAT">FATAYAT</option>
                  <option value="MUSLIMAT">MUSLIMAT</option>
                </select>
              </div>

              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1">Target Peserta</label>
                <input
                  type="text"
                  placeholder="Contoh: Siswa jenjang SMP / MTs sederajat"
                  value={newCompTarget}
                  onChange={(e) => setNewCompTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#DDE7E8] font-medium mb-1">Batas Pendaftaran</label>
                <input
                  type="text"
                  value={newCompDeadline}
                  onChange={(e) => setNewCompDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-white/20 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddCompModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] font-bold"
                >
                  Simpan Lomba
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
