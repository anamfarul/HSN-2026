import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ParticipantRegistration, Competition, DownloadDoc, CategoryGeneration } from '../types';
import { AdminLoginView } from './AdminLoginView';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminDeploymentTab } from './AdminDeploymentTab';
import { AdminSupabaseTab } from './AdminSupabaseTab';
import { generateParticipantReportPDF, printElementSafely } from '../lib/pdfGenerator';
import { ROLE_DEFINITIONS } from '../data/rolesPermissions';
import { 
  X, 
  ShieldCheck, 
  Users, 
  Trophy, 
  FileText, 
  Search, 
  Download, 
  FileDown,
  Printer,
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus, 
  Edit, 
  Edit3,
  Save,
  Check,
  FileUp,
  UploadCloud,
  ExternalLink, 
  Trash2, 
  BarChart3,
  Lock,
  LogOut,
  Sparkles,
  ArrowUpDown,
  UserCheck,
  UserPlus,
  Globe,
  Receipt,
  Database
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantRegistration[];
  onUpdateParticipantStatus: (id: string, status: 'Terverifikasi' | 'Menunggu' | 'Ditolak') => void;
  competitions: Competition[];
  onAddCompetition: (comp: Competition) => void;
  onUpdateCompetition?: (comp: Competition) => void;
  onDeleteCompetition: (id: string) => void;
  onRefreshCompetitions?: (comps: Competition[]) => void;
  onRefreshParticipants?: (parts: ParticipantRegistration[]) => void;
  documents: DownloadDoc[];
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  participants,
  onUpdateParticipantStatus,
  competitions,
  onAddCompetition,
  onUpdateCompetition,
  onDeleteCompetition,
  onRefreshCompetitions,
  onRefreshParticipants,
  documents,
}) => {
  // Authentication state - check stored session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return (
      localStorage.getItem('hsn2026_admin_auth') === 'true' ||
      sessionStorage.getItem('hsn2026_admin_auth') === 'true'
    );
  });

  const [adminUser, setAdminUser] = useState<string>(() => {
    return (
      localStorage.getItem('hsn2026_admin_user') ||
      sessionStorage.getItem('hsn2026_admin_user') ||
      'admin'
    );
  });

  const [adminRole, setAdminRole] = useState<string>(() => {
    return (
      localStorage.getItem('hsn2026_admin_role') ||
      sessionStorage.getItem('hsn2026_admin_role') ||
      'Sekretariat Utama HSN 2026'
    );
  });

  // Cek apakah akun yang sedang login adalah Super Admin (Sekretariat Utama)
  const isSuperAdmin = 
    adminRole === 'Sekretariat Utama HSN 2026' ||
    adminRole.toLowerCase().includes('sekretariat utama') ||
    adminRole.toLowerCase().includes('super admin') ||
    adminUser.toLowerCase() === 'admin';

  const [activeTab, setActiveTab] = useState<'participants' | 'competitions' | 'documents' | 'stats' | 'users' | 'deployment' | 'supabase'>('participants');
  const [pdfReportBlobUrl, setPdfReportBlobUrl] = useState<string | null>(null);
  
  // Jika login selain super admin, pastikan tidak dapat mengakses tab users atau deployment
  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'users' || activeTab === 'deployment')) {
      setActiveTab('participants');
    }
  }, [isSuperAdmin, activeTab]);

  // Filters for participants
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters for competition participant stats
  const [statsCompSearch, setStatsCompSearch] = useState('');
  const [statsCategoryFilter, setStatsCategoryFilter] = useState('ALL');

  // Wewenang Kelola Lomba: Koordinator Teknis Lomba & Super Admin
  const canManageCompetitions =
    isSuperAdmin ||
    adminRole === 'Koordinator Teknis Lomba' ||
    adminRole.toLowerCase().includes('koordinator') ||
    adminRole.toLowerCase().includes('lomba');

  // State untuk Inline Edit Cabang Lomba
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompTitle, setEditCompTitle] = useState('');
  const [editCompCategory, setEditCompCategory] = useState<any>('SMP/MTs');
  const [editCompDeadline, setEditCompDeadline] = useState('');
  const [editCompDescription, setEditCompDescription] = useState('');
  const [editCompTarget, setEditCompTarget] = useState('');

  // State untuk Upload Juknis Lomba
  const [uploadJuknisComp, setUploadJuknisComp] = useState<Competition | null>(null);
  const [juknisInputMode, setJuknisInputMode] = useState<'file' | 'link'>('file');
  const [uploadedJuknisFile, setUploadedJuknisFile] = useState<File | null>(null);
  const [juknisLinkUrl, setJuknisLinkUrl] = useState('');
  const [feedbackToast, setFeedbackToast] = useState('');

  const handleStartEditComp = (comp: Competition) => {
    setEditingCompId(comp.id);
    setEditCompTitle(comp.title);
    setEditCompCategory(comp.category);
    setEditCompDeadline(comp.deadline);
    setEditCompDescription(comp.description);
    setEditCompTarget(comp.targetAudience || '');
  };

  const handleCancelEditComp = () => {
    setEditingCompId(null);
  };

  const handleSaveEditComp = (comp: Competition) => {
    if (!editCompTitle.trim()) return;
    const updated: Competition = {
      ...comp,
      title: editCompTitle.trim(),
      category: editCompCategory,
      deadline: editCompDeadline.trim() || comp.deadline,
      description: editCompDescription.trim() || comp.description,
      targetAudience: editCompTarget.trim() || comp.targetAudience,
    };
    if (onUpdateCompetition) {
      onUpdateCompetition(updated);
    }
    setEditingCompId(null);
    setFeedbackToast(`Perubahan lomba "${updated.title}" berhasil disimpan!`);
    setTimeout(() => setFeedbackToast(''), 4000);
  };

  const handleSaveUploadedJuknis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadJuknisComp) return;

    let finalFileName = uploadJuknisComp.juknisFileName;
    let finalUrl = uploadJuknisComp.juknisUrl;

    if (juknisInputMode === 'file' && uploadedJuknisFile) {
      finalFileName = uploadedJuknisFile.name;
      finalUrl = URL.createObjectURL(uploadedJuknisFile);
    } else if (juknisInputMode === 'link' && juknisLinkUrl.trim()) {
      finalUrl = juknisLinkUrl.trim();
      finalFileName = `Juknis_${uploadJuknisComp.code}.pdf`;
    }

    const updated: Competition = {
      ...uploadJuknisComp,
      juknisUrl: finalUrl,
      juknisFileName: finalFileName,
    };

    if (onUpdateCompetition) {
      onUpdateCompetition(updated);
    }

    setUploadJuknisComp(null);
    setUploadedJuknisFile(null);
    setJuknisLinkUrl('');
    setFeedbackToast(`Juknis resmi untuk "${updated.title}" berhasil diunggah!`);
    setTimeout(() => setFeedbackToast(''), 4500);
  };

  // New Competition Form State
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompCategory, setNewCompCategory] = useState<CategoryGeneration>('SMP/MTs');
  const [newCompDeadline, setNewCompDeadline] = useState('10 Oktober 2026');
  const [newCompDescription, setNewCompDescription] = useState('');

  // Helper untuk generate kode lomba otomatis sesuai kategori dan nomor urut
  const getNextCompCode = (category: string) => {
    const prefixMap: Record<string, string> = {
      'PAUD/TK': 'LMB-PAUD',
      'SD/MI': 'LMB-SD',
      'SMP/MTs': 'LMB-SMP',
      'SMA/MA/SMK': 'LMB-SMA',
      'IPNU/IPPNU': 'LMB-IPNU',
      'FATAYAT': 'LMB-FTY',
      'MUSLIMAT': 'LMB-MSL',
    };
    const prefix = prefixMap[category] || 'LMB';
    const matching = competitions.filter((c) => c.code.startsWith(prefix));
    const nextNum = matching.length + 1;
    return `${prefix}-${nextNum < 10 ? '0' : ''}${nextNum}`;
  };

  // Logout Confirmation State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('hsn2026_admin_auth');
    sessionStorage.removeItem('hsn2026_admin_auth');
    localStorage.removeItem('hsn2026_admin_user');
    sessionStorage.removeItem('hsn2026_admin_user');
    localStorage.removeItem('hsn2026_admin_role');
    sessionStorage.removeItem('hsn2026_admin_role');
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
  };

  if (!isOpen) return null;

  // If not authenticated, display the dedicated Admin Login Screen first!
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg animate-fade-in overflow-y-auto">
        <AdminLoginView
          onLoginSuccess={({ username, role }) => {
            setAdminUser(username);
            setAdminRole(role);
            setIsAuthenticated(true);
          }}
          onClose={onClose}
        />
      </div>
    );
  }

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
    const code = getNextCompCode(newCompCategory);
    const created: Competition = {
      id: randomId,
      code,
      title: newCompTitle.trim(),
      category: newCompCategory as any,
      targetAudience: `Peserta kategori ${newCompCategory}`,
      deadline: newCompDeadline.trim() || '10 Oktober 2026',
      technicalMeeting: '12 Oktober 2026',
      location: 'Kompleks Pesantren Poncokusumo',
      contactPerson: '0812-XXXX-XXXX (Panitia)',
      registrationFee: 'Gratis',
      iconName: 'Trophy',
      description:
        newCompDescription.trim() ||
        `Perlombaan ${newCompTitle.trim()} yang diselenggarakan secara sportif dan kompetitif bagi generasi santri.`,
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
    setNewCompDescription('');
    setFeedbackToast(`Cabang lomba [${code}] "${created.title}" berhasil ditambahkan!`);
    setTimeout(() => setFeedbackToast(''), 4000);
  };

  // Generate & Download Authentic PDF File using pdfGenerator.ts (100% Reliable in all browsers & iframes)
  const handleDownloadPDF = () => {
    try {
      const result = generateParticipantReportPDF(
        filteredParticipants,
        categoryFilter,
        statusFilter
      );
      if (result.success) {
        if (result.url) setPdfReportBlobUrl(result.url);
        setFeedbackToast(`Dokumen PDF "${result.filename}" berhasil dibuat & diunduh!`);
        setTimeout(() => setFeedbackToast(''), 4000);
        return true;
      } else {
        setFeedbackToast('Gagal memproses dokumen PDF. Silakan coba lagi.');
        setTimeout(() => setFeedbackToast(''), 4000);
        return false;
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      setFeedbackToast('Gagal memproses dokumen PDF. Silakan coba lagi.');
      setTimeout(() => setFeedbackToast(''), 4000);
      return false;
    }
  };

  // Handle Browser Print Direct
  const handlePrintDocument = () => {
    // 1. Jalankan download PDF agar berkas tersimpan
    handleDownloadPDF();

    // 2. Cetak dokumen secara terisolasi tanpa terpengaruh gaya tema gelap
    printElementSafely('printable-participant-report');
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
                  SESI AKTIF
                </span>
              </div>
              <span className="text-[11px] text-[#DDE7E8]/70">
                Sistem Manajemen Peserta & Konten MWC NU Poncokusumo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Active Admin Profile Chip */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-semibold capitalize">{adminUser}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ROLE_DEFINITIONS[adminRole]?.badgeColor || 'text-[#F2C96D]'}`}>
                {ROLE_DEFINITIONS[adminRole]?.shortTitle || adminRole}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Keluar dari Portal Admin"
              aria-label="Keluar dari Portal Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="inline">Keluar</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup CMS Admin"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

          {/* Tab Khusus Super Admin: Kelola Panitia */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/50 shadow'
                  : 'text-[#DDE7E8] hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Kelola Panitia (Users)</span>
            </button>
          )}

          {/* Tab Khusus Super Admin: Deploy ke Vercel */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('deployment')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'deployment'
                  ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#00D9F5] border border-[#00D9F5]/60 shadow'
                  : 'text-[#00D9F5]/80 hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#00D9F5]" />
              <span>Deploy ke Vercel</span>
            </button>
          )}

          {/* Tab Database Supabase CMS */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('supabase')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'supabase'
                  ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-emerald-300 border border-emerald-400/60 shadow'
                  : 'text-emerald-400/80 hover:bg-white/5'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database Supabase</span>
            </button>
          )}
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Cetak Tabel Rekapitulasi Peserta Terdaftar"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#F2C96D]" />
                    <span>Cetak</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#031525] bg-[#F2C96D] hover:bg-[#D9B45B] transition-all flex items-center gap-1.5 shadow active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
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
                          {p.paymentProofName ? (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              <Receipt className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[130px]" title={p.paymentProofName}>
                                Bukti: {p.paymentProofName}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                              <span>Tanpa Bukti Bayar</span>
                            </div>
                          )}
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
              {/* Feedback Toast */}
              {feedbackToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feedbackToast}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                  <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#F2C96D]" />
                    <span>Daftar Cabang Perlombaan ({competitions.length})</span>
                  </h3>
                  <p className="text-xs text-[#DDE7E8]/70">
                    Kelola data perlombaan, upload juknis resmi, dan atur batas pendaftaran.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <button
                      onClick={() => setActiveTab('supabase')}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Buka Panel Database Supabase CMS"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Database Supabase</span>
                      <span className="sm:hidden">Supabase</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddCompModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 transition-all flex items-center gap-1.5 shadow active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Lomba Baru</span>
                  </button>
                </div>
              </div>

              {/* Competitions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitions.map((comp) => {
                  const isEditing = editingCompId === comp.id;

                  if (isEditing) {
                    return (
                      <div
                        key={comp.id}
                        className="p-5 rounded-2xl bg-[#020e19] border-2 border-[#00D9F5]/70 flex flex-col justify-between shadow-xl shadow-[#00D9F5]/10 space-y-3 animate-fade-in"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#00D9F5] px-2 py-0.5 rounded bg-[#00D9F5]/20 border border-[#00D9F5]/40">
                              {comp.code} (Mode Edit)
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Save Icon Button */}
                              <button
                                type="button"
                                onClick={() => handleSaveEditComp(comp)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 hover:scale-105 active:scale-95 transition-all shadow"
                                title="Simpan Perubahan Lomba (Save)"
                                aria-label="Simpan Perubahan Lomba"
                              >
                                <Save className="w-4 h-4 text-emerald-400" />
                              </button>
                              {/* Cancel Icon Button */}
                              <button
                                type="button"
                                onClick={handleCancelEditComp}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#DDE7E8] transition-all"
                                title="Batal Edit"
                                aria-label="Batal Edit"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-white/70 font-semibold mb-1 uppercase tracking-wider">
                              Nama Cabang Lomba
                            </label>
                            <input
                              type="text"
                              value={editCompTitle}
                              onChange={(e) => setEditCompTitle(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-xs font-bold text-white focus:outline-none focus:border-[#00D9F5]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-white/70 font-semibold mb-1 uppercase tracking-wider">
                                Kategori
                              </label>
                              <select
                                value={editCompCategory}
                                onChange={(e) => setEditCompCategory(e.target.value as any)}
                                className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-[#00D9F5] font-semibold focus:outline-none focus:border-[#00D9F5]"
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
                              <label className="block text-[10px] text-white/70 font-semibold mb-1 uppercase tracking-wider">
                                Batas Pendaftaran
                              </label>
                              <input
                                type="text"
                                value={editCompDeadline}
                                onChange={(e) => setEditCompDeadline(e.target.value)}
                                className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
                                placeholder="15 Oktober 2026"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-white/70 font-semibold mb-1 uppercase tracking-wider">
                              Deskripsi Perlombaan
                            </label>
                            <textarea
                              rows={2}
                              value={editCompDescription}
                              onChange={(e) => setEditCompDescription(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-[#DDE7E8] focus:outline-none focus:border-[#00D9F5]"
                            />
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[#00D9F5] font-semibold flex items-center gap-1">
                            Klik icon Save di kanan atas atau tombol simpan
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSaveEditComp(comp)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={comp.id}
                      className="p-5 rounded-2xl bg-[#020e19] border border-white/10 flex flex-col justify-between hover:border-white/25 transition-all group"
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

                        {/* Juknis Status Badge */}
                        {comp.juknisFileName || comp.juknisUrl ? (
                          <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 text-emerald-300 font-medium truncate">
                              <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{comp.juknisFileName || 'Juknis Lomba Resmi'}</span>
                            </span>
                            {comp.juknisUrl && (
                              <a
                                href={comp.juknisUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00D9F5] hover:underline flex items-center gap-1 text-[10px] shrink-0 font-bold ml-2"
                              >
                                <span>Buka File</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          canManageCompetitions && (
                            <button
                              onClick={() => {
                                setUploadJuknisComp(comp);
                                setJuknisLinkUrl(comp.juknisUrl || '');
                              }}
                              className="mb-3 w-full py-1.5 px-2.5 rounded-xl border border-dashed border-white/20 hover:border-[#F2C96D]/60 hover:bg-white/5 flex items-center justify-center gap-1.5 text-[11px] text-[#DDE7E8]/70 hover:text-[#F2C96D] transition-all"
                            >
                              <FileUp className="w-3.5 h-3.5 text-[#F2C96D]" />
                              <span>+ Upload Juknis Lomba (.pdf)</span>
                            </button>
                          )
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#DDE7E8]/70">
                        <span>Batas: {comp.deadline}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Upload Juknis Icon */}
                          {canManageCompetitions && (
                            <button
                              onClick={() => {
                                setUploadJuknisComp(comp);
                                setJuknisLinkUrl(comp.juknisUrl || '');
                              }}
                              className="p-1.5 rounded-lg text-[#F2C96D] hover:text-white hover:bg-[#D9B45B]/20 transition-all"
                              title="Upload / Ganti Juknis Lomba"
                              aria-label="Upload Juknis Lomba"
                            >
                              <FileUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Icon */}
                          {canManageCompetitions && (
                            <button
                              onClick={() => handleStartEditComp(comp)}
                              className="p-1.5 rounded-lg text-[#00D9F5] hover:text-white hover:bg-[#00D9F5]/20 transition-all"
                              title="Edit Cabang Lomba"
                              aria-label="Edit Cabang Lomba"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Icon */}
                          <button
                            onClick={() => onDeleteCompetition(comp.id)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg p-1.5 transition-colors"
                            title="Hapus Cabang Lomba"
                            aria-label="Hapus Cabang Lomba"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Summary Cards: 100% Focused on Participants (Removed Cabang Perlombaan & Dokumen Resmi) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#006B4F]/35 to-[#031525] border border-emerald-500/20 shadow-lg">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase tracking-wider">
                    Total Seluruh Pendaftar
                  </div>
                  <div className="font-mono text-3xl sm:text-4xl font-black text-white mt-1.5">
                    {participants.length}
                  </div>
                  <div className="text-xs text-[#00D9F5] mt-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Total pendaftar yang masuk ke sistem</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#031525] border border-emerald-500/30 shadow-lg">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase tracking-wider">
                    Pendaftar Terverifikasi
                  </div>
                  <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 mt-1.5">
                    {participants.filter((p) => p.status === 'Terverifikasi').length}
                  </div>
                  <div className="text-xs text-emerald-300 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Berkas & syarat telah tervalidasi</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#D9B45B]/20 to-[#031525] border border-[#D9B45B]/30 shadow-lg">
                  <div className="text-xs text-[#DDE7E8]/70 font-semibold uppercase tracking-wider">
                    Menunggu Verifikasi
                  </div>
                  <div className="font-mono text-3xl sm:text-4xl font-black text-[#F2C96D] mt-1.5">
                    {participants.filter((p) => p.status === 'Menunggu Verifikasi' || p.status === 'Menunggu').length}
                  </div>
                  <div className="text-xs text-[#F2C96D]/80 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F2C96D]" />
                    <span>Dalam antrean verifikasi panitia</span>
                  </div>
                </div>
              </div>

              {/* REKAP JUMLAH PESERTA MASING-MASING CABANG PERLOMBAAN */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h3 className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-[#F2C96D]" />
                      <span>Rekap Jumlah Peserta per Cabang Perlombaan</span>
                    </h3>
                    <p className="text-xs text-[#DDE7E8]/70 mt-0.5">
                      Rincian kuantitas peserta pendaftar dan status verifikasi di setiap cabang lomba
                    </p>
                  </div>

                  {/* Filter & Cari Lomba */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                      <input
                        type="text"
                        placeholder="Cari cabang lomba..."
                        value={statsCompSearch}
                        onChange={(e) => setStatsCompSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-[#020e19] border border-white/20 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#00D9F5]"
                      />
                    </div>
                    <select
                      value={statsCategoryFilter}
                      onChange={(e) => setStatsCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[#020e19] border border-white/20 text-xs text-[#00D9F5] font-semibold focus:outline-none focus:border-[#00D9F5]"
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
                  </div>
                </div>

                {/* Grid Kartu Rekap Lomba */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {competitions
                    .filter((comp) => {
                      const matchesSearch =
                        comp.title.toLowerCase().includes(statsCompSearch.toLowerCase()) ||
                        comp.code.toLowerCase().includes(statsCompSearch.toLowerCase());
                      const matchesCategory =
                        statsCategoryFilter === 'ALL' || comp.category === statsCategoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map((comp) => {
                      const compParticipants = participants.filter(
                        (p) =>
                          p.competitionId === comp.id ||
                          p.competitionId === comp.code ||
                          p.competitionTitle?.toLowerCase().trim() === comp.title?.toLowerCase().trim()
                      );
                      const totalComp = compParticipants.length;
                      const verifiedComp = compParticipants.filter((p) => p.status === 'Terverifikasi').length;
                      const pendingComp = compParticipants.filter(
                        (p) => p.status === 'Menunggu Verifikasi' || p.status === 'Menunggu'
                      ).length;
                      const percent =
                        participants.length > 0 ? Math.round((totalComp / participants.length) * 100) : 0;

                      return (
                        <div
                          key={comp.id}
                          className="p-4 rounded-2xl bg-[#020e19]/90 border border-white/10 hover:border-[#00D9F5]/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                        >
                          <div>
                            {/* Badges */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#D9B45B]/20 text-[#F2C96D] border border-[#D9B45B]/30">
                                {comp.code}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5]">
                                {comp.category}
                              </span>
                            </div>

                            {/* Nama Lomba */}
                            <h4 className="font-heading text-sm font-bold text-white group-hover:text-[#00D9F5] transition-colors line-clamp-2 mb-2">
                              {comp.title}
                            </h4>

                            {/* Total Jumlah Peserta */}
                            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/10">
                              <span className="text-xs text-[#DDE7E8]/70">Jumlah Peserta:</span>
                              <div className="text-right">
                                <span className="font-mono text-2xl font-black text-[#F2C96D]">
                                  {totalComp}
                                </span>
                                <span className="text-xs text-[#DDE7E8]/80 ml-1 font-semibold">
                                  Peserta
                                </span>
                              </div>
                            </div>

                            {/* Rincian Status Peserta */}
                            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <span className="block text-[10px] text-emerald-400 font-medium">Terverifikasi</span>
                                <span className="font-mono font-bold text-emerald-300">{verifiedComp}</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                                <span className="block text-[10px] text-amber-400 font-medium">Menunggu</span>
                                <span className="font-mono font-bold text-amber-300">{pendingComp}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar porsi lomba */}
                          <div className="mt-3 pt-2.5 border-t border-white/5">
                            <div className="flex justify-between text-[10px] text-[#DDE7E8]/60 mb-1">
                              <span>Porsi pendaftar festival:</span>
                              <span className="font-mono font-bold text-[#00D9F5]">{percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            {/* Tombol Lihat Peserta Cabang Ini */}
                            <button
                              onClick={() => {
                                setCategoryFilter(comp.category);
                                setSearchQuery(comp.title);
                                setActiveTab('participants');
                              }}
                              className="mt-3 w-full py-1.5 rounded-xl bg-white/5 hover:bg-[#00D9F5]/20 border border-white/10 hover:border-[#00D9F5]/40 text-[11px] font-semibold text-white/80 hover:text-[#00D9F5] transition-all flex items-center justify-center gap-1.5"
                            >
                              <Users className="w-3 h-3" />
                              <span>Lihat Daftar Peserta Lomba Ini</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Info jika pencarian kosong */}
                {competitions.filter((comp) => {
                  const matchesSearch =
                    comp.title.toLowerCase().includes(statsCompSearch.toLowerCase()) ||
                    comp.code.toLowerCase().includes(statsCompSearch.toLowerCase());
                  const matchesCategory =
                    statsCategoryFilter === 'ALL' || comp.category === statsCategoryFilter;
                  return matchesSearch && matchesCategory;
                }).length === 0 && (
                  <div className="py-8 text-center text-xs text-white/60 bg-[#020e19] rounded-2xl border border-white/10">
                    Tidak ditemukan cabang lomba dengan kata kunci "{statsCompSearch}".
                  </div>
                )}
              </div>

              {/* Category Breakdown list */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-xl">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#00D9F5]" />
                  <span>Distribusi Peserta Berdasarkan Kategori Generasi:</span>
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

          {/* TAB 5: KELOLA PANITIA / USERS (KHUSUS SUPER ADMIN) */}
          {activeTab === 'users' && isSuperAdmin && <AdminUsersTab />}

          {/* TAB 6: DEPLOYMENT KE VERCEL & SUPABASE (KHUSUS SUPER ADMIN) */}
          {activeTab === 'deployment' && isSuperAdmin && <AdminDeploymentTab />}

          {/* TAB 7: DATABASE SUPABASE CMS (KHUSUS SUPER ADMIN) */}
          {activeTab === 'supabase' && isSuperAdmin && (
            <AdminSupabaseTab
              competitions={competitions}
              onRefreshCompetitions={onRefreshCompetitions}
              onRefreshParticipants={onRefreshParticipants}
            />
          )}
        </div>
      </div>

      {/* SUB-MODAL: Tambah Lomba */}
      {showAddCompModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#031525] border border-[#00D9F5]/40 p-6 sm:p-7 shadow-2xl space-y-4">
            <button
              onClick={() => setShowAddCompModal(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00D9F5]/20 border border-[#00D9F5]/40 flex items-center justify-center text-[#00D9F5] shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Tambah Cabang Lomba Baru
                </h3>
                <p className="text-xs text-[#DDE7E8]/70">
                  Formulir cabang lomba terintegrasi dengan kartu informasi lomba
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateNewComp} className="space-y-3.5 text-xs">
              {/* 1. KODE LOMBA (Terisi Otomatis) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#DDE7E8] font-bold">
                    Kode Lomba
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Terisi Secara Otomatis
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={getNextCompCode(newCompCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-[#F2C96D]/40 text-sm font-mono font-black text-[#F2C96D] cursor-not-allowed select-none shadow-inner"
                />
                <p className="text-[10px] text-white/50 mt-1">
                  *Kode lomba diperbarui otomatis menyesuaikan kategori lomba yang Anda pilih.
                </p>
              </div>

              {/* 2. NAMA CABANG LOMBA */}
              <div>
                <label className="block text-[#DDE7E8] font-bold mb-1">
                  Nama Cabang Lomba <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Musabaqah Hifdzil Qur'an (MHQ)"
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                />
              </div>

              {/* 3. KATEGORI & 4. BATAS PENDAFTARAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Kategori <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newCompCategory}
                    onChange={(e) => setNewCompCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-bold text-[#00D9F5] focus:outline-none focus:border-[#00D9F5] transition-all cursor-pointer"
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
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Batas Pendaftaran <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 10 Oktober 2026"
                    value={newCompDeadline}
                    onChange={(e) => setNewCompDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                  />
                </div>
              </div>

              {/* 5. DESKRIPSI PERLOMBAAN */}
              <div>
                <label className="block text-[#DDE7E8] font-bold mb-1">
                  Deskripsi Perlombaan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tuliskan gambaran ringkas dan ketentuan umum perlombaan yang akan tampil di kartu..."
                  value={newCompDescription}
                  onChange={(e) => setNewCompDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs text-[#DDE7E8] focus:outline-none focus:border-[#00D9F5] transition-all leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddCompModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Cabang Lomba</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Upload Juknis Lomba */}
      {uploadJuknisComp && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#031525] border border-[#F2C96D]/60 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => {
                setUploadJuknisComp(null);
                setUploadedJuknisFile(null);
                setJuknisLinkUrl('');
              }}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D9B45B]/20 border border-[#D9B45B]/40 flex items-center justify-center text-[#F2C96D] shrink-0">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-white">
                  Upload Juknis Lomba
                </h3>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  Petunjuk Teknis & Ketentuan Cabang Lomba
                </p>
              </div>
            </div>

            {/* Target Lomba Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-[#DDE7E8] mb-1">
                Cabang Lomba Target
              </label>
              <select
                value={uploadJuknisComp.id}
                onChange={(e) => {
                  const target = competitions.find((c) => c.id === e.target.value);
                  if (target) {
                    setUploadJuknisComp(target);
                    setJuknisLinkUrl(target.juknisUrl || '');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-white/20 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.title} - {c.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Switch Mode: Upload File vs Input Link */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#020e19] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setJuknisInputMode('file')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  juknisInputMode === 'file'
                    ? 'bg-[#006B4F] text-[#F2C96D] shadow-sm'
                    : 'text-[#DDE7E8]/70 hover:text-white'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload File Dokumen</span>
              </button>
              <button
                type="button"
                onClick={() => setJuknisInputMode('link')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  juknisInputMode === 'link'
                    ? 'bg-[#006B4F] text-[#00D9F5] shadow-sm'
                    : 'text-[#DDE7E8]/70 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Link Google Drive / PDF</span>
              </button>
            </div>

            <form onSubmit={handleSaveUploadedJuknis} className="space-y-4">
              {juknisInputMode === 'file' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-[#DDE7E8] mb-1.5">
                    Pilih File Juknis (.pdf / .docx)
                  </label>
                  <label className="border-2 border-dashed border-white/20 hover:border-[#F2C96D] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-black/40 hover:bg-black/50 transition-all text-center group">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadedJuknisFile(e.target.files[0]);
                        }
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-[#F2C96D] group-hover:scale-110 transition-transform mb-2" />
                    {uploadedJuknisFile ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-emerald-400 block truncate max-w-xs">
                          ✓ {uploadedJuknisFile.name}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {(uploadedJuknisFile.size / 1024 / 1024).toFixed(2)} MB • Siap disimpan
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-white">
                          Pilih atau Drag berkas Juknis ke sini
                        </span>
                        <span className="text-[10px] text-white/50 block">
                          Format yang didukung: PDF, DOC, DOCX
                        </span>
                      </div>
                    )}
                  </label>
                  {uploadJuknisComp.juknisFileName && !uploadedJuknisFile && (
                    <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>File saat ini: {uploadJuknisComp.juknisFileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-[#DDE7E8] mb-1.5">
                    URL Tautan Juknis (Google Drive / Web PDF)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/file/d/... atau https://..."
                    value={juknisLinkUrl}
                    onChange={(e) => setJuknisLinkUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                  <span className="text-[10px] text-white/50 mt-1 block">
                    Link akan terbuka saat peserta menekan tombol Juknis di portal publik.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setUploadJuknisComp(null);
                    setUploadedJuknisFile(null);
                    setJuknisLinkUrl('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={juknisInputMode === 'file' ? !uploadedJuknisFile : !juknisLinkUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] text-[#031525] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Terapkan Juknis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Konfirmasi Keluar (Logout) Sesi */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#031525] border border-rose-500/50 p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <LogOut className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-heading font-bold text-white text-base">
                Konfirmasi Keluar Sesi
              </h4>
              <p className="text-xs text-[#DDE7E8]/80 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi aktif <strong className="text-white capitalize">{adminUser}</strong>? Anda perlu login kembali untuk mengakses portal CMS.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Cetak Rekapitulasi Peserta Terdaftar */}
      {showPrintModal && (
        <div className="fixed inset-0 z-80 flex flex-col items-center justify-start p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
          {/* Top Control Bar (Non-Printable) */}
          <div className="no-print w-full max-w-5xl mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#006B4F] flex items-center justify-center text-[#F2C96D] shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <span>Pratinjau Cetak Rekapitulasi Peserta</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/30">
                    {filteredParticipants.length} Peserta
                  </span>
                </h4>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  Tabel 8 kolom resmi sesuai filter: {categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter} • {statusFilter === 'ALL' ? 'Semua Status' : statusFilter}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Utama: Cetak / Simpan PDF (Unduh PDF + Trigger Print) */}
              <button
                type="button"
                onClick={handlePrintDocument}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 active:scale-95 transition-all cursor-pointer"
                title="Cetak Halaman atau Simpan sebagai PDF Resmi"
              >
                <Printer className="w-4 h-4 text-[#031525]" />
                <span>Cetak / Simpan PDF</span>
              </button>

              {/* Tombol Khusus Unduh PDF */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="Unduh Langsung Berkas Rekapitulasi PDF A4"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Unduh</span><span>.PDF</span>
              </button>

              {/* Tombol Buka Tab Baru jika blob URL tersedia */}
              {pdfReportBlobUrl && (
                <a
                  href={pdfReportBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-[#00D9F5] text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Buka berkas PDF di tab peramban baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka</span><span> PDF</span>
                </a>
              )}

              {/* Tombol Tutup Modal */}
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Tutup Pratinjau Cetak"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Paper */}
          <div className="w-full max-w-5xl overflow-x-auto pb-8">
            <div
              id="printable-participant-report"
              className="bg-white text-gray-900 p-6 sm:p-10 font-sans min-w-[800px] text-xs shadow-2xl rounded-2xl border border-gray-300"
            >
              {/* KOP SURAT RESMI */}
              <div className="text-center border-b-4 border-double border-gray-950 pb-3 mb-4">
                <div className="flex items-center justify-center gap-3.5 mb-1.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-900 text-[#F2C96D] font-serif font-black text-xl flex items-center justify-center border-2 border-emerald-950 shadow-sm shrink-0">
                    NU
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-wide text-gray-950 uppercase font-serif">
                      PANITIA FESTIVAL HARI SANTRI NASIONAL (HSN) 2026
                    </h2>
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-normal">
                      MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO
                    </h3>
                  </div>
                </div>
                <p className="text-[10.5px] text-gray-700 mt-1 font-medium">
                  Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kabupaten Malang, Jawa Timur 65157 • Narahubung Panitia: 0812-XXXX-XXXX
                </p>
              </div>

              {/* JUDUL DOKUMEN & INFO REKAP */}
              <div className="text-center mb-4">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-950 underline decoration-2 underline-offset-4">
                  DAFTAR REKAPITULASI PESERTA TERDAFTAR
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-700 mt-2 font-medium">
                  <span>
                    <strong>Kategori:</strong> {categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Status:</strong> {statusFilter === 'ALL' ? 'Semua Status' : statusFilter}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Total:</strong> {filteredParticipants.length} Peserta
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Tanggal Cetak:</strong>{' '}
                    {new Date().toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* TABEL 8 KOLOM SESUAI PERMINTAAN USER */}
              <table className="w-full text-left border-collapse border border-gray-950 text-[11px]">
                <thead>
                  <tr className="bg-gray-200 text-gray-950 uppercase font-bold border-b-2 border-gray-950">
                    <th className="border border-gray-950 p-2 text-center w-10">No.</th>
                    <th className="border border-gray-950 p-2 text-center whitespace-nowrap">No. REG</th>
                    <th className="border border-gray-950 p-2">Nama Peserta</th>
                    <th className="border border-gray-950 p-2 text-center whitespace-nowrap">Kategori</th>
                    <th className="border border-gray-950 p-2">Cabang Lomba</th>
                    <th className="border border-gray-950 p-2">Lembaga</th>
                    <th className="border border-gray-950 p-2 text-center whitespace-nowrap">Kontak WA</th>
                    <th className="border border-gray-950 p-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, index) => (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-400 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      {/* 1. No Urut */}
                      <td className="border border-gray-950 p-2 text-center font-medium">
                        {index + 1}
                      </td>
                      {/* 2. No. REG */}
                      <td className="border border-gray-950 p-2 text-center font-mono font-bold whitespace-nowrap text-emerald-950">
                        {p.registrationNumber}
                      </td>
                      {/* 3. Nama Peserta */}
                      <td className="border border-gray-950 p-2 font-bold text-gray-950">
                        {p.fullName}
                      </td>
                      {/* 4. Kategori */}
                      <td className="border border-gray-950 p-2 text-center font-semibold text-gray-800 whitespace-nowrap">
                        {p.category}
                      </td>
                      {/* 5. Cabang Lomba */}
                      <td className="border border-gray-950 p-2 text-gray-900">
                        {p.competitionTitle}
                      </td>
                      {/* 6. Lembaga */}
                      <td className="border border-gray-950 p-2 text-gray-800">
                        {p.institution}
                      </td>
                      {/* 7. Kontak WA */}
                      <td className="border border-gray-950 p-2 text-center font-mono text-gray-900 whitespace-nowrap">
                        {p.whatsapp}
                      </td>
                      {/* 8. Status */}
                      <td className="border border-gray-950 p-2 text-center whitespace-nowrap font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                            p.status === 'Terverifikasi'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                              : p.status === 'Menunggu'
                              ? 'bg-amber-100 text-amber-900 border border-amber-400'
                              : 'bg-rose-100 text-rose-900 border border-rose-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="border border-gray-950 p-6 text-center text-gray-500 italic">
                        Tidak ada data peserta terdaftar yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* REKAPITULASI TOTAL BAWAH */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-700 bg-gray-50 p-2 rounded border border-gray-300">
                <span>
                  <strong>Total Rekap:</strong> {filteredParticipants.length} Peserta
                </span>
                <div className="flex items-center gap-3">
                  <span>
                    Terverifikasi:{' '}
                    <strong>
                      {filteredParticipants.filter((p) => p.status === 'Terverifikasi').length}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Menunggu:{' '}
                    <strong>
                      {filteredParticipants.filter((p) => p.status === 'Menunggu' || p.status === 'Menunggu Verifikasi').length}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Ditolak:{' '}
                    <strong>
                      {filteredParticipants.filter((p) => p.status === 'Ditolak').length}
                    </strong>
                  </span>
                </div>
              </div>

              {/* FOOTER PENGESAHAN / TANDA TANGAN */}
              <div className="mt-8 pt-4 flex items-start justify-between text-[11px] text-gray-950">
                <div className="w-56 text-center">
                  <p>Mengetahui,</p>
                  <p className="font-bold uppercase text-emerald-950">Ketua Panitia HSN 2026</p>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-gray-400 italic">(Tanda Tangan & Stempel)</span>
                  </div>
                  <p className="font-bold underline mt-1 text-gray-950">Ust. H. Ahmad Mustofa, S.Pd.I</p>
                  <p className="text-[10.5px] text-gray-600">MWC NU Poncokusumo</p>
                </div>

                <div className="w-56 text-center">
                  <p>
                    Poncokusumo,{' '}
                    {new Date().toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="font-bold uppercase text-emerald-950">Sekretariat Pelaksana</p>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-gray-400 italic">(Tanda Tangan & Stempel)</span>
                  </div>
                  <p className="font-bold underline mt-1 text-gray-950">M. Wildan Maulana, S.Kom</p>
                  <p className="text-[10.5px] text-gray-600">Koordinator Administrasi & Peserta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-90 px-4 py-2.5 rounded-xl bg-emerald-950/95 text-emerald-200 border border-emerald-500/50 shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md animate-fade-in pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
