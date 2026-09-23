import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, 
  Search, 
  Filter, 
  FileText, 
  ExternalLink, 
  Image as ImageIcon, 
  Printer, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  Download, 
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  Building2,
  Trophy,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { ParticipantRegistration } from '../types';
import { generateWorkSubmissionPDF } from '../lib/pdfGenerator';

interface AdminWorksTabProps {
  participants: ParticipantRegistration[];
  onUpdateParticipantStatus: (id: string, status: 'Menunggu' | 'Terverifikasi' | 'Ditolak') => void;
  onUpdateParticipantWork?: (
    registrationNumber: string,
    workData: {
      workSubmissionType?: 'file' | 'drive';
      workFileName?: string;
      workFileUrl?: string;
      workDriveUrl?: string;
      workNotes?: string;
      workSubmittedAt?: string;
    }
  ) => void;
  onOpenWorkModalForParticipant?: (regNumber: string) => void;
  canVerifyParticipants?: boolean;
}

export const AdminWorksTab: React.FC<AdminWorksTabProps> = ({
  participants,
  onUpdateParticipantStatus,
  onUpdateParticipantWork,
  onOpenWorkModalForParticipant,
  canVerifyParticipants = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'file' | 'drive'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Terverifikasi' | 'Menunggu' | 'Ditolak'>('ALL');
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ url: string; title: string } | null>(null);

  // Filter participants who have submitted works, or show all with works status
  const worksList = useMemo(() => {
    return participants.filter((p) => {
      // Must have work submitted
      const hasWork = !!(p.workSubmissionType || p.workFileUrl || p.workDriveUrl || p.workSubmittedAt);
      if (!hasWork) return false;

      // Type filter
      if (typeFilter !== 'ALL') {
        const pType = p.workSubmissionType || (p.workFileUrl ? 'file' : p.workDriveUrl ? 'drive' : '');
        if (pType !== typeFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const pStatus = p.status || 'Menunggu';
        if (statusFilter === 'Terverifikasi' && !pStatus.toLowerCase().includes('terverifikasi')) return false;
        if (statusFilter === 'Menunggu' && !pStatus.toLowerCase().includes('menunggu')) return false;
        if (statusFilter === 'Ditolak' && !pStatus.toLowerCase().includes('ditolak')) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.fullName || '').toLowerCase().includes(q);
        const matchReg = (p.registrationNumber || '').toLowerCase().includes(q);
        const matchInst = (p.institution || '').toLowerCase().includes(q);
        const matchComp = (p.competitionTitle || '').toLowerCase().includes(q);
        const matchNotes = (p.workNotes || '').toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchInst && !matchComp && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [participants, typeFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalWithWork = participants.filter(
      (p) => !!(p.workSubmissionType || p.workFileUrl || p.workDriveUrl || p.workSubmittedAt)
    ).length;
    const fileCount = participants.filter(
      (p) => (p.workSubmissionType === 'file' || !!p.workFileUrl)
    ).length;
    const driveCount = participants.filter(
      (p) => (p.workSubmissionType === 'drive' || (!p.workFileUrl && !!p.workDriveUrl))
    ).length;
    const verifiedCount = participants.filter(
      (p) => (p.status || '').toLowerCase() === 'terverifikasi'
    ).length;

    return { totalWithWork, fileCount, driveCount, verifiedCount };
  }, [participants]);

  // Export to CSV
  const handleExportCSV = () => {
    if (worksList.length === 0) return;

    const headers = [
      'No. Registrasi',
      'Nama Peserta',
      'Asal Lembaga',
      'Cabang Lomba',
      'Kategori',
      'Status Pendaftaran',
      'Metode Unggah',
      'File Gambar',
      'Link Google Drive',
      'Catatan Karya',
      'Waktu Submit',
    ];

    const rows = worksList.map((p) => [
      `"${p.registrationNumber || ''}"`,
      `"${(p.fullName || '').replace(/"/g, '""')}"`,
      `"${(p.institution || '').replace(/"/g, '""')}"`,
      `"${(p.competitionTitle || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      `"${p.status || 'Menunggu'}"`,
      `"${p.workSubmissionType === 'drive' ? 'Google Drive' : 'File JPG/PNG'}"`,
      `"${p.workFileName || p.workFileUrl || ''}"`,
      `"${p.workDriveUrl || ''}"`,
      `"${(p.workNotes || '').replace(/"/g, '""')}"`,
      `"${p.workSubmittedAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Karya_Peserta_HSN2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset or delete a participant's work
  const handleDeleteWork = (p: ParticipantRegistration) => {
    if (window.confirm(`Hapus berkas karya dari peserta ${p.fullName} (${p.registrationNumber})?`)) {
      if (onUpdateParticipantWork) {
        onUpdateParticipantWork(p.registrationNumber, {
          workSubmissionType: undefined,
          workFileName: undefined,
          workFileUrl: undefined,
          workDriveUrl: undefined,
          workNotes: undefined,
          workSubmittedAt: undefined,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#006B4F]/30 via-[#031525] to-black/60 border border-[#00D9F5]/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#00D9F5]">Total Karya Masuk</span>
            <UploadCloud className="w-4 h-4 text-[#00D9F5]" />
          </div>
          <div className="text-2xl font-black font-heading text-white mt-2">
            {stats.totalWithWork}
          </div>
          <span className="text-[11px] text-white/50">Karya telah diserahkan</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#008F72]/20 via-[#031525] to-black/60 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">File JPG / PNG</span>
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-heading text-white mt-2">
            {stats.fileCount}
          </div>
          <span className="text-[11px] text-emerald-300/70">Berkas gambar langsung</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D9B45B]/20 via-[#031525] to-black/60 border border-[#D9B45B]/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#F2C96D]">Link Google Drive</span>
            <LinkIcon className="w-4 h-4 text-[#F2C96D]" />
          </div>
          <div className="text-2xl font-black font-heading text-white mt-2">
            {stats.driveCount}
          </div>
          <span className="text-[11px] text-[#F2C96D]/70">Tautan penyimpanan cloud</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/20 via-[#031525] to-black/60 border border-cyan-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-300">Status Terverifikasi</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="text-2xl font-black font-heading text-white mt-2">
            {stats.verifiedCount}
          </div>
          <span className="text-[11px] text-cyan-200/70">Peserta siap unggah</span>
        </div>
      </div>

      {/* 2. Controls, Filters, Search Bar & Actions */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan No. Reg, nama peserta, instansi, atau lomba..."
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white/5 border border-white/10 focus:border-[#00D9F5] focus:outline-none text-white text-xs placeholder:text-white/40"
          />
          <Search className="w-4 h-4 text-[#00D9F5] absolute left-3 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-white/40 hover:text-white bg-white/10 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tipe */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#031525] border border-white/15 text-xs text-white focus:border-[#00D9F5] focus:outline-none"
          >
            <option value="ALL">Semua Jenis Karya</option>
            <option value="file">File JPG/PNG</option>
            <option value="drive">Link Google Drive</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#031525] border border-white/15 text-xs text-white focus:border-[#00D9F5] focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="Terverifikasi">Terverifikasi</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Ditolak">Ditolak</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={worksList.length === 0}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Table of Submitted Works */}
      {worksList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.01] border border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/40">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Belum Ada Karya yang Sesuai</h4>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Tidak ditemukan karya yang cocok dengan kata kunci pencarian atau filter yang dipilih.'
              : 'Belum ada peserta yang mengunggah karya. Peserta terverifikasi dapat mengunggah melalui menu APLOUD KARYA di website.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020e19]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#031525] text-white/70 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">No. Registrasi & Peserta</th>
                <th className="py-3 px-4">Cabang Lomba & Kategori</th>
                <th className="py-3 px-4">Jenis & Berkas Karya</th>
                <th className="py-3 px-4">Status & Waktu</th>
                <th className="py-3 px-4 text-right">Aksi Panitia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[#DDE7E8]">
              {worksList.map((participant) => {
                const isVerified = (participant.status || '').toLowerCase() === 'terverifikasi';
                const isDrive = participant.workSubmissionType === 'drive' || (!participant.workFileUrl && !!participant.workDriveUrl);
                const hasImage = !!participant.workFileUrl;

                return (
                  <tr key={participant.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Peserta Info */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="font-mono font-bold text-xs text-[#00D9F5]">
                        {participant.registrationNumber}
                      </div>
                      <div className="font-bold text-white text-xs">
                        {participant.fullName}
                      </div>
                      <div className="text-[11px] text-white/60 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#F2C96D]" />
                        <span className="truncate max-w-[200px]">{participant.institution}</span>
                      </div>
                    </td>

                    {/* Cabang Lomba */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="font-semibold text-white text-xs flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-[#D9B45B] shrink-0" />
                        <span className="truncate max-w-[180px]">{participant.competitionTitle}</span>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F]/40 border border-[#00D9F5]/30 text-[#00D9F5]">
                        {participant.category}
                      </span>
                    </td>

                    {/* Berkas Karya */}
                    <td className="py-3.5 px-4 space-y-1.5">
                      {isDrive ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F2C96D] bg-[#F2C96D]/10 px-2 py-0.5 rounded-md border border-[#F2C96D]/20">
                            <LinkIcon className="w-3 h-3" /> Google Drive
                          </span>
                          {participant.workDriveUrl && (
                            <a
                              href={participant.workDriveUrl.startsWith('http') ? participant.workDriveUrl : `https://${participant.workDriveUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00D9F5] hover:underline text-[11px] flex items-center gap-1 font-semibold max-w-[190px] truncate"
                            >
                              <span>Buka Tautan Drive</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasImage ? (
                            <button
                              type="button"
                              onClick={() => setSelectedImagePreview({
                                url: participant.workFileUrl!,
                                title: `${participant.fullName} - ${participant.competitionTitle}`,
                              })}
                              className="group relative rounded-lg overflow-hidden border border-white/20 hover:border-[#00D9F5] transition-all"
                            >
                              <img
                                src={participant.workFileUrl}
                                alt="Karya"
                                className="w-11 h-11 object-cover bg-black/40 group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[11px] font-semibold text-white truncate block max-w-[130px]">
                              {participant.workFileName || 'File Gambar JPG/PNG'}
                            </span>
                            {participant.workFileUrl && (
                              <button
                                onClick={() => setSelectedImagePreview({
                                  url: participant.workFileUrl!,
                                  title: `${participant.fullName} - ${participant.competitionTitle}`,
                                })}
                                className="text-[10px] text-[#00D9F5] hover:underline flex items-center gap-0.5"
                              >
                                <Eye className="w-2.5 h-2.5" /> Pratinjau
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {participant.workNotes && (
                        <div className="text-[10px] text-white/60 italic bg-white/[0.02] p-1.5 rounded border border-white/5 max-w-[220px] truncate">
                          "{participant.workNotes}"
                        </div>
                      )}
                    </td>

                    {/* Status & Waktu */}
                    <td className="py-3.5 px-4 space-y-1">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> TERVERIFIKASI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" /> {participant.status || 'MENUNGGU'}
                        </span>
                      )}

                      <div className="text-[10px] text-white/50">
                        {participant.workSubmittedAt || 'Waktu tidak tercatat'}
                      </div>
                    </td>

                    {/* Aksi Panitia */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Cetak Formulir Karya PDF */}
                        <button
                          title="Cetak Formulir Tanda Terima Karya"
                          onClick={() => generateWorkSubmissionPDF(participant, true)}
                          className="p-1.5 rounded-lg bg-[#00D9F5]/10 hover:bg-[#00D9F5]/20 border border-[#00D9F5]/30 text-[#00D9F5] transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit di Modal Peserta */}
                        {onOpenWorkModalForParticipant && (
                          <button
                            title={canVerifyParticipants ? "Edit / Ganti Berkas Karya Peserta" : "Aksi dinonaktifkan (Khusus Super Admin & Divisi Regristrasi & Verifikator)"}
                            disabled={!canVerifyParticipants}
                            onClick={() => canVerifyParticipants && onOpenWorkModalForParticipant(participant.registrationNumber)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              canVerifyParticipants 
                                ? "bg-[#F2C96D]/10 hover:bg-[#F2C96D]/20 border-[#F2C96D]/30 text-[#F2C96D]" 
                                : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-40"
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Hapus / Reset Karya */}
                        <button
                          title={canVerifyParticipants ? "Hapus / Reset Berkas Karya" : "Aksi dinonaktifkan (Khusus Super Admin & Divisi Regristrasi & Verifikator)"}
                          disabled={!canVerifyParticipants}
                          onClick={() => canVerifyParticipants && handleDeleteWork(participant)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            canVerifyParticipants 
                              ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400" 
                              : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-40"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox Modal untuk Preview Gambar Karya */}
      {selectedImagePreview && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImagePreview(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-[#031525] border border-white/20 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold text-xs text-white truncate">
                {selectedImagePreview.title}
              </span>
              <button
                onClick={() => setSelectedImagePreview(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2">
              <img 
                src={selectedImagePreview.url} 
                alt="Pratinjau Karya Penuh" 
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href={selectedImagePreview.url}
                download="karya_peserta.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/40 hover:bg-[#00D9F5]/30 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Gambar Asli
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
