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
  FileSpreadsheet,
  MapPin
} from 'lucide-react';
import { ParticipantRegistration } from '../types';
import { MALANG_RAYA_DISTRICTS, extractParticipantLocation } from './AdminAddressStatsSection';
import { generateWorkSubmissionPDF, printElementSafely } from '../lib/pdfGenerator';
import { FileDown, Check } from 'lucide-react';

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
  onRefreshFromSupabase?: () => Promise<void>;
}

export const AdminWorksTab: React.FC<AdminWorksTabProps> = ({
  participants,
  onUpdateParticipantStatus,
  onUpdateParticipantWork,
  onOpenWorkModalForParticipant,
  canVerifyParticipants = true,
  onRefreshFromSupabase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'file' | 'drive'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Terverifikasi' | 'Menunggu' | 'Ditolak'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ url: string; title: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk Pratinjau Cetak & Download Formulir Tanda Terima Karya
  const [selectedParticipantForPrint, setSelectedParticipantForPrint] = useState<ParticipantRegistration | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string>('');
  const [printFeedback, setPrintFeedback] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [showRecapPrintModal, setShowRecapPrintModal] = useState<boolean>(false);

  const handlePrintRecapDirect = () => {
    printElementSafely('printable-works-recap-report');
  };

  const handleOpenPrintModal = (participant: ParticipantRegistration) => {
    setSelectedParticipantForPrint(participant);
    setPrintFeedback('');
    try {
      const res = generateWorkSubmissionPDF(participant, false);
      if (res.success && res.url) {
        setPdfDownloadUrl(res.url);
      }
    } catch (e) {
      console.warn('Persiapan pratinjau PDF:', e);
    }
  };

  const handlePrintDirect = () => {
    printElementSafely('printable-work-submission-form');
    setPrintFeedback('Membuka kotak dialog cetak peramban...');
    setTimeout(() => setPrintFeedback(''), 4000);
  };

  const handleDownloadPdfDirect = () => {
    if (!selectedParticipantForPrint) return;
    setIsGeneratingPdf(true);
    try {
      const res = generateWorkSubmissionPDF(selectedParticipantForPrint, true);
      if (res.success) {
        if (res.url) setPdfDownloadUrl(res.url);
        setPrintFeedback(`Berkas "${res.filename}" berhasil diunduh!`);
      } else {
        setPrintFeedback('Gagal mengunduh PDF langsung, silakan gunakan tombol Cetak Dokumen.');
      }
    } catch (err: any) {
      setPrintFeedback(`Gagal membuat PDF: ${err?.message || 'Kesalahan'}`);
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setPrintFeedback(''), 5000);
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshFromSupabase || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

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

      // Region/Wilayah filter
      if (regionFilter !== 'ALL') {
        const loc = extractParticipantLocation(p);
        const target = regionFilter.toLowerCase().trim();
        const pDist = (p.district || loc.district || '').toLowerCase();
        const pReg = (p.regency || loc.regency || '').toLowerCase();
        const pAddr = (p.address || '').toLowerCase();
        const match =
          pDist === target ||
          pDist.includes(target) ||
          (pDist.length > 3 && target.includes(pDist)) ||
          pReg === target ||
          pReg.includes(target) ||
          (pReg.length > 3 && target.includes(pReg)) ||
          pAddr.includes(target);
        if (!match) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const loc = extractParticipantLocation(p);
        const matchName = (p.fullName || '').toLowerCase().includes(q);
        const matchReg = (p.registrationNumber || '').toLowerCase().includes(q);
        const matchInst = (p.institution || '').toLowerCase().includes(q);
        const matchComp = (p.competitionTitle || '').toLowerCase().includes(q);
        const matchNotes = (p.workNotes || '').toLowerCase().includes(q);
        const matchAddr = (p.address || '').toLowerCase().includes(q);
        const matchDist = (p.district || loc.district || '').toLowerCase().includes(q);
        const matchRegency = (p.regency || loc.regency || '').toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchInst && !matchComp && !matchNotes && !matchAddr && !matchDist && !matchRegency) {
          return false;
        }
      }

      return true;
    });
  }, [participants, typeFilter, statusFilter, regionFilter, searchQuery]);

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

          {/* Filter Daerah / Wilayah */}
          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={`px-3 py-2 pl-7 rounded-xl bg-[#031525] border text-xs focus:outline-none transition-all ${
                regionFilter !== 'ALL'
                  ? 'border-[#00D9F5] text-[#00D9F5] bg-[#00D9F5]/10 font-bold'
                  : 'border-white/15 text-white'
              }`}
              title="Saring karya peserta berdasarkan daerah/wilayah"
            >
              <option value="ALL">Semua Daerah / Wilayah</option>
              <optgroup label="Tingkat Kecamatan">
                {MALANG_RAYA_DISTRICTS.map((dist) => (
                  <option key={`work-dist-${dist}`} value={dist}>
                    Kec. {dist}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tingkat Kabupaten/Kota">
                <option value="Kabupaten Malang">Kabupaten Malang</option>
                <option value="Kota Malang">Kota Malang</option>
                <option value="Kota Batu">Kota Batu</option>
                <option value="Kabupaten Pasuruan">Kabupaten Pasuruan</option>
              </optgroup>
            </select>
            <MapPin className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${
              regionFilter !== 'ALL' ? 'text-[#00D9F5]' : 'text-white/40'
            }`} />
          </div>

          {/* Tombol Reset Filter */}
          {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || regionFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setRegionFilter('ALL');
              }}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
              title="Reset semua filter pencarian karya"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Refresh Button */}
          {onRefreshFromSupabase && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-[#00D9F5]/10 hover:bg-[#00D9F5]/20 border border-[#00D9F5]/30 text-[#00D9F5] text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
              title="Segarkan data karya langsung dari database Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={worksList.length === 0}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Ekspor rekapitulasi karya peserta ke format CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {/* Cetak Rekapitulasi Karya */}
          <button
            onClick={() => setShowRecapPrintModal(true)}
            disabled={worksList.length === 0}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 border border-emerald-500/40 text-[#F2C96D] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Cetak Tabel Rekapitulasi Berkas Karya Peserta Lomba"
          >
            <Printer className="w-3.5 h-3.5 text-[#F2C96D]" />
            <span>Cetak Rekap</span>
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
                          onClick={() => handleOpenPrintModal(participant)}
                          className="p-1.5 rounded-lg bg-[#00D9F5]/10 hover:bg-[#00D9F5]/25 border border-[#00D9F5]/40 text-[#00D9F5] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
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
      {/* Sub-Modal: Pratinjau & Cetak Formulir Tanda Terima Karya Peserta */}
      {selectedParticipantForPrint && (
        <div 
          className="fixed inset-0 z-[90] flex flex-col items-center justify-start p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedParticipantForPrint(null);
          }}
        >
          {/* Top Control Bar (Non-Printable) */}
          <div className="no-print w-full max-w-4xl mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#008F72] flex items-center justify-center text-[#F2C96D] shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <span>Pratinjau Formulir Penyerahan Karya</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/30">
                    {selectedParticipantForPrint.registrationNumber}
                  </span>
                </h4>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  {selectedParticipantForPrint.fullName} • {selectedParticipantForPrint.competitionTitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Cetak Langsung */}
              <button
                type="button"
                onClick={handlePrintDirect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 active:scale-95 transition-all cursor-pointer"
                title="Cetak langsung menggunakan printer fisik atau Simpan sebagai PDF dari browser"
              >
                <Printer className="w-4 h-4 text-[#031525]" />
                <span>Cetak Sekarang</span>
              </button>

              {/* Tombol Unduh PDF Asli */}
              <button
                type="button"
                onClick={handleDownloadPdfDirect}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Unduh berkas PDF resmi tanda terima karya"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh .PDF'}</span>
              </button>

              {/* Buka Tab PDF jika tersedia */}
              {pdfDownloadUrl && (
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-[#00D9F5] text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Buka PDF di tab browser baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka</span><span> Tab</span>
                </a>
              )}

              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={() => setSelectedParticipantForPrint(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Tutup Pratinjau Cetak"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Toast Banner */}
            {printFeedback && (
              <div className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{printFeedback}</span>
              </div>
            )}
          </div>

          {/* Printable Document Paper (A4 Style) */}
          <div className="w-full max-w-4xl overflow-x-auto pb-8">
            <div 
              id="printable-work-submission-form"
              className="w-full max-w-[800px] mx-auto bg-white text-slate-900 rounded-lg shadow-2xl p-6 sm:p-10 border border-slate-300 text-xs sm:text-sm font-sans"
            >
              {/* Top Strip */}
              <div className="h-2 bg-[#006B4F] -mt-6 sm:-mt-10 -mx-6 sm:-mx-10 mb-1 rounded-t-lg" />
              <div className="h-1 bg-[#D9B45B] -mx-6 sm:-mx-10 mb-6" />

              {/* Kop Surat Resmi */}
              <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900">
                <div className="w-16 h-16 rounded-full bg-[#006B4F] flex flex-col items-center justify-center text-[#F2C96D] font-serif font-black shadow-md shrink-0">
                  <span className="text-xl leading-none">NU</span>
                  <span className="text-[8px] font-sans tracking-widest text-white">MWC</span>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 tracking-wide uppercase leading-tight">
                    PANITIA FESTIVAL SANTRI NUSANTARA 2026
                  </h3>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#006B4F] leading-tight">
                    MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO
                  </h4>
                  <p className="text-[11px] italic text-slate-600 mt-0.5">
                    "Mengawal Indonesia Merdeka Menuju Peradaban Dunia"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kab. Malang, Jawa Timur 65157 • Narahubung: 0857-3119-4085
                  </p>
                </div>
              </div>
              <div className="h-0.5 bg-slate-900 mt-1 mb-6" />

              {/* Judul Dokumen */}
              <div className="text-center mb-6">
                <h2 className="text-base sm:text-lg font-black uppercase text-[#006B4F] tracking-wide">
                  BUKTI FORMULIR APLOUD KARYA PESERTA
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Tanda Terima Penyerahan Karya & Lembar Berkas Peserta Resmi
                </p>
              </div>

              {/* Box Nomor Registrasi */}
              <div className="bg-slate-50 border-2 border-[#006B4F] rounded-xl p-4 text-center mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  NOMOR REGISTRASI PESERTA
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-[#006B4F] tracking-wider block">
                  {selectedParticipantForPrint.registrationNumber}
                </span>
              </div>

              {/* Tabel Data Peserta & Karya */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                <div className="bg-[#006B4F] text-[#F2C96D] px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>RINCIAN DATA</span>
                  <span>INFORMASI KARYA PESERTA</span>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-1/3 p-2.5 font-bold bg-slate-50 text-slate-700">Nama Lengkap Peserta</td>
                      <td className="p-2.5 font-semibold text-slate-900">: {selectedParticipantForPrint.fullName}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Asal Lembaga / Instansi</td>
                      <td className="p-2.5 text-slate-900">: {selectedParticipantForPrint.institution}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Cabang Perlombaan</td>
                      <td className="p-2.5 font-semibold text-[#006B4F]">: {selectedParticipantForPrint.competitionTitle}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Kategori Perlombaan</td>
                      <td className="p-2.5 text-slate-900">: {selectedParticipantForPrint.category}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Status Pendaftaran</td>
                      <td className="p-2.5 text-emerald-700 font-bold">: {selectedParticipantForPrint.status || 'Terverifikasi'} (SAH & TERVERIFIKASI)</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Metode Pengunggahan Karya</td>
                      <td className="p-2.5 text-slate-900">: {
                        selectedParticipantForPrint.workSubmissionType === 'drive' || (!selectedParticipantForPrint.workFileUrl && !!selectedParticipantForPrint.workDriveUrl)
                          ? 'Tautan Cloud (Google Drive)'
                          : 'Berkas Gambar (File JPG/PNG)'
                      }</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Rincian Berkas / Link Karya</td>
                      <td className="p-2.5 text-slate-900 break-all">: {
                        selectedParticipantForPrint.workDriveUrl 
                          ? selectedParticipantForPrint.workDriveUrl 
                          : (selectedParticipantForPrint.workFileName || 'File Gambar Terlampir')
                      }</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Catatan / Keterangan Karya</td>
                      <td className="p-2.5 text-slate-800 italic">: "{selectedParticipantForPrint.workNotes || 'Sesuai dengan ketentuan Juknis HSN 2026'}"</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Waktu Penyerahan Karya</td>
                      <td className="p-2.5 text-slate-900">: {selectedParticipantForPrint.workSubmittedAt || new Date().toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lampiran Gambar Karya jika ada */}
              {selectedParticipantForPrint.workFileUrl && (
                <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-lg text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    LAMPIRAN DOKUMEN VISUAL KARYA
                  </span>
                  <img 
                    src={selectedParticipantForPrint.workFileUrl} 
                    alt="Karya Peserta" 
                    className="max-h-60 max-w-full mx-auto rounded border border-slate-300 object-contain shadow-sm"
                  />
                </div>
              )}

              {/* Ketentuan Keabsahan */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 mb-8">
                <h5 className="font-bold text-xs text-emerald-800 mb-1">
                  VALIDASI & TANDA TERIMA BERKAS KARYA
                </h5>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Dokumen ini adalah bukti resmi penyerahan karya dalam Festival Hari Santri Nasional 2026 MWC NU Poncokusumo. 
                  Dewan juri akan menilai karya sesuai juknis dan kriteria penilaian orisinalitas, kreativitas, dan pesan nilai keislaman. 
                  Simpan dokumen ini sebagai tanda bukti keikutsertaan Anda.
                </p>
              </div>

              {/* Pengesahan & Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 text-center pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 block">Mengetahui & Menyetujui,</span>
                  <span className="text-xs font-bold text-slate-900 block">Ketua Panitia HSN 2026</span>
                  <div className="py-2 flex justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-[#006B4F] flex flex-col items-center justify-center text-[#006B4F] text-[8px] font-bold">
                      <span>PANITIA HSN</span>
                      <span className="text-[6px] tracking-wider">MWC NU 2026</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Far'ul Anam, S.Pd, M.Pd</span>
                  <span className="text-[10px] text-slate-500 block">Panitia HSN 2026</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-600 block">
                    Poncokusumo, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block">Sekretariat Pelaksana</span>
                  <div className="py-2 flex justify-center">
                    <div className="w-16 h-16 flex items-center justify-center text-slate-400 italic text-[10px]">
                      (Tertanda)
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Imam Muhidin, S.Pd</span>
                  <span className="text-[10px] text-slate-500 block">Divisi Sekretariat & Administrasi</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                FESTIVAL SANTRI NUSANTARA 2026 • PERINGATAN HARI SANTRI NASIONAL 2026 • MWC NU PONCOKUSUMO
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Pratinjau & Cetak Rekapitulasi Seluruh Karya Masuk */}
      {showRecapPrintModal && (
        <div 
          className="fixed inset-0 z-[90] flex flex-col items-center justify-start p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecapPrintModal(false);
          }}
        >
          {/* Top Control Bar (Non-Printable) */}
          <div className="no-print w-full max-w-5xl mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#008F72] flex items-center justify-center text-[#F2C96D] shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <span>Pratinjau Rekapitulasi Karya Peserta</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/30">
                    {worksList.length} Karya
                  </span>
                </h4>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  Daftar seluruh berkas karya peserta yang telah diunggah ke sistem festival
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintRecapDirect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#031525]" />
                <span>Cetak Rekap Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRecapPrintModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Paper */}
          <div className="w-full max-w-5xl overflow-x-auto pb-8">
            <div 
              id="printable-works-recap-report"
              className="w-full max-w-[950px] mx-auto bg-white text-slate-900 rounded-lg shadow-2xl p-6 sm:p-10 border border-slate-300 text-xs font-sans"
            >
              {/* Kop Surat Resmi */}
              <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900">
                <div className="w-16 h-16 rounded-full bg-[#006B4F] flex flex-col items-center justify-center text-[#F2C96D] font-serif font-black shadow-md shrink-0">
                  <span className="text-xl leading-none">NU</span>
                  <span className="text-[8px] font-sans tracking-widest text-white">MWC</span>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 tracking-wide uppercase leading-tight">
                    PANITIA FESTIVAL SANTRI NUSANTARA 2026
                  </h3>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#006B4F] leading-tight">
                    MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kab. Malang, Jawa Timur 65157 • Narahubung: 0857-3119-4085
                  </p>
                </div>
              </div>
              <div className="h-0.5 bg-slate-900 mt-1 mb-4" />

              <div className="text-center mb-5">
                <h2 className="text-base font-black uppercase text-[#006B4F] tracking-wide">
                  REKAPITULASI BERKAS PENYERAHAN KARYA PESERTA
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Laporan Resmi Panitia Festival HSN 2026 • Dicetak Pada: {new Date().toLocaleString('id-ID')}
                </p>
              </div>

              {/* Tabel Karya */}
              <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
                <thead>
                  <tr className="bg-[#006B4F] text-[#F2C96D]">
                    <th className="p-2 border border-slate-300 text-center w-8">No</th>
                    <th className="p-2 border border-slate-300">No. Registrasi</th>
                    <th className="p-2 border border-slate-300">Nama Peserta</th>
                    <th className="p-2 border border-slate-300">Lembaga / Instansi</th>
                    <th className="p-2 border border-slate-300">Cabang Lomba</th>
                    <th className="p-2 border border-slate-300">Jenis Karya</th>
                    <th className="p-2 border border-slate-300">Status</th>
                    <th className="p-2 border border-slate-300">Waktu Penyerahan</th>
                  </tr>
                </thead>
                <tbody>
                  {worksList.map((item, idx) => (
                    <tr key={item.id} className="even:bg-slate-50 border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-[#006B4F]">{item.registrationNumber}</td>
                      <td className="p-2 border border-slate-300 font-semibold">{item.fullName}</td>
                      <td className="p-2 border border-slate-300">{item.institution}</td>
                      <td className="p-2 border border-slate-300">{item.competitionTitle}</td>
                      <td className="p-2 border border-slate-300">
                        {item.workSubmissionType === 'drive' || (!item.workFileUrl && !!item.workDriveUrl) ? 'Google Drive' : 'File Gambar'}
                      </td>
                      <td className="p-2 border border-slate-300 font-bold text-emerald-700">
                        {item.status || 'Terverifikasi'}
                      </td>
                      <td className="p-2 border border-slate-300 text-[10px] text-slate-600">
                        {item.workSubmittedAt || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 text-center pt-2">
                <div>
                  <span className="text-xs text-slate-600 block">Mengetahui,</span>
                  <span className="text-xs font-bold text-slate-900 block">Ketua Panitia HSN 2026</span>
                  <div className="h-14 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 italic">(Stempel & Tanda Tangan)</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Far'ul Anam, S.Pd, M.Pd</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 block">Poncokusumo, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="text-xs font-bold text-slate-900 block">Divisi Sekretariat & Administrasi</span>
                  <div className="h-14 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 italic">(Tanda Tangan)</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Imam Muhidin, S.Pd</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
