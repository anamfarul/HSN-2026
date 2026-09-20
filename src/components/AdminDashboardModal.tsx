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
import { deleteParticipantFromSupabase } from '../lib/supabaseClient';
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
  Database,
  Gift,
  MapPin,
  Award,
  Eye,
  Calendar,
  Info,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantRegistration[];
  onUpdateParticipantStatus: (id: string, status: 'Terverifikasi' | 'Menunggu' | 'Ditolak') => void;
  onDeleteParticipant?: (id: string) => void;
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
  onDeleteParticipant,
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

  // Super Admin Delete Participant State
  const [participantToDelete, setParticipantToDelete] = useState<ParticipantRegistration | null>(null);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);

  const handleConfirmDeleteParticipant = async () => {
    if (!participantToDelete) return;
    setIsDeletingParticipant(true);
    const target = participantToDelete;

    try {
      if (onDeleteParticipant) {
        onDeleteParticipant(target.id);
      } else if (onRefreshParticipants) {
        onRefreshParticipants(participants.filter((p) => p.id !== target.id));
      }

      await deleteParticipantFromSupabase(target.registrationNumber || target.id).catch(console.warn);

      setFeedbackToast(`Data peserta "${target.fullName}" (${target.registrationNumber}) berhasil dihapus permanen oleh Super Admin.`);
      setTimeout(() => setFeedbackToast(''), 4500);
    } catch (err: any) {
      setFeedbackToast(`Gagal menghapus peserta: ${err?.message || 'Terjadi kesalahan'}`);
      setTimeout(() => setFeedbackToast(''), 4500);
    } finally {
      setIsDeletingParticipant(false);
      setParticipantToDelete(null);
    }
  };

  // Filters for competition participant stats
  const [statsCompSearch, setStatsCompSearch] = useState('');
  const [statsCategoryFilter, setStatsCategoryFilter] = useState('ALL');

  // Wewenang Kelola Lomba: Koordinator Teknis Lomba & Super Admin
  const canManageCompetitions =
    isSuperAdmin ||
    adminRole === 'Koordinator Teknis Lomba' ||
    adminRole.toLowerCase().includes('koordinator') ||
    adminRole.toLowerCase().includes('lomba');

  // State untuk Filter, Pencarian, Mode Tampilan, & Pratinjau Lomba (Sesuai Komponen Website)
  const [compCategoryFilter, setCompCategoryFilter] = useState<string>('SEMUA');
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compViewMode, setCompViewMode] = useState<'table' | 'grid'>('table');
  const [previewCompModal, setPreviewCompModal] = useState<Competition | null>(null);

  // State untuk Edit Cabang Lomba (Komponen Lengkap: Rules, Hadiah I-III, Technical Meeting, dll)
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [showEditCompModal, setShowEditCompModal] = useState<Competition | null>(null);
  const [editFormTab, setEditFormTab] = useState<'all' | 'basic' | 'technical' | 'rules' | 'prizes'>('all');
  const [editCompTitle, setEditCompTitle] = useState('');
  const [editCompCategory, setEditCompCategory] = useState<any>('SMP/MTs');
  const [editCompDeadline, setEditCompDeadline] = useState('');
  const [editCompDescription, setEditCompDescription] = useState('');
  const [editCompTarget, setEditCompTarget] = useState('');
  const [editCompFee, setEditCompFee] = useState('');
  const [editCompLocation, setEditCompLocation] = useState('');
  const [editCompContact, setEditCompContact] = useState('');
  const [editCompTm, setEditCompTm] = useState('');

  // Rules State
  const [editCompRules, setEditCompRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [rulesEditMode, setRulesEditMode] = useState<'list' | 'bulk'>('list');
  const [bulkRulesText, setBulkRulesText] = useState('');

  // Prizes State (Juara I, II, III, & Apresiasi Tambahan)
  const [editCompPrizeFirst, setEditCompPrizeFirst] = useState('');
  const [editCompPrizeSecond, setEditCompPrizeSecond] = useState('');
  const [editCompPrizeThird, setEditCompPrizeThird] = useState('');
  const [editCompPrizeAll, setEditCompPrizeAll] = useState('');

  // State untuk Upload Juknis Lomba
  const [uploadJuknisComp, setUploadJuknisComp] = useState<Competition | null>(null);
  const [juknisInputMode, setJuknisInputMode] = useState<'file' | 'link'>('file');
  const [uploadedJuknisFile, setUploadedJuknisFile] = useState<File | null>(null);
  const [juknisLinkUrl, setJuknisLinkUrl] = useState('');
  const [feedbackToast, setFeedbackToast] = useState('');

  const handleStartEditComp = (
    comp: Competition,
    initialTab: 'all' | 'basic' | 'technical' | 'rules' | 'prizes' = 'all'
  ) => {
    setEditingCompId(comp.id);
    setShowEditCompModal(comp);
    setEditFormTab(initialTab);
    setEditCompTitle(comp.title);
    setEditCompCategory(comp.category);
    setEditCompDeadline(comp.deadline);
    setEditCompDescription(comp.description);
    setEditCompTarget(comp.targetAudience || '');
    setEditCompFee(comp.registrationFee || 'Gratis');
    setEditCompLocation(comp.location || 'Kompleks Pesantren Poncokusumo');
    setEditCompContact(comp.contactPerson || '0812-XXXX-XXXX (Panitia)');
    setEditCompTm(comp.technicalMeeting || '12 Oktober 2026');

    // Rules initialization
    const currentRules = comp.rules && comp.rules.length > 0 
      ? [...comp.rules]
      : [
          'Peserta merupakan utusan sah dari lembaga/sekolah terkait.',
          'Wajib melampirkan surat mandat resmi dan kartu pelajar/santri.',
          'Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.'
        ];
    setEditCompRules(currentRules);
    setBulkRulesText(currentRules.join('\n'));
    setNewRuleInput('');
    setRulesEditMode('list');

    // Prizes initialization
    setEditCompPrizeFirst(comp.prizes?.first || 'Trofi Juara I + Piagam + Uang Pembinaan');
    setEditCompPrizeSecond(comp.prizes?.second || 'Trofi Juara II + Piagam + Uang Pembinaan');
    setEditCompPrizeThird(comp.prizes?.third || 'Trofi Juara III + Piagam + Uang Pembinaan');
    setEditCompPrizeAll(comp.prizes?.all || '');
  };

  const handleCancelEditComp = () => {
    setEditingCompId(null);
    setShowEditCompModal(null);
  };

  const handleSaveEditComp = (comp: Competition) => {
    if (!editCompTitle.trim()) return;

    // Resolve rules depending on mode
    let finalRules: string[] = [];
    if (rulesEditMode === 'bulk') {
      finalRules = bulkRulesText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    } else {
      finalRules = editCompRules.map((r) => r.trim()).filter((r) => r.length > 0);
    }

    if (finalRules.length === 0) {
      finalRules = [
        'Peserta merupakan utusan sah dari lembaga terkait.',
        'Wajib melampirkan surat mandat resmi.',
        'Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.',
      ];
    }

    const updated: Competition = {
      ...comp,
      title: editCompTitle.trim(),
      category: editCompCategory,
      deadline: editCompDeadline.trim() || comp.deadline,
      description: editCompDescription.trim() || comp.description,
      targetAudience: editCompTarget.trim() || comp.targetAudience,
      registrationFee: editCompFee.trim() || comp.registrationFee,
      location: editCompLocation.trim() || comp.location,
      contactPerson: editCompContact.trim() || comp.contactPerson,
      technicalMeeting: editCompTm.trim() || comp.technicalMeeting || '12 Oktober 2026',
      rules: finalRules,
      prizes: {
        first: editCompPrizeFirst.trim() || comp.prizes?.first || 'Trofi Juara I + Piagam + Uang Pembinaan',
        second: editCompPrizeSecond.trim() || comp.prizes?.second || 'Trofi Juara II + Piagam + Uang Pembinaan',
        third: editCompPrizeThird.trim() || comp.prizes?.third || 'Trofi Juara III + Piagam + Uang Pembinaan',
        all: editCompPrizeAll.trim() || undefined,
      },
    };

    if (onUpdateCompetition) {
      onUpdateCompetition(updated);
    }

    // Perbarui juga data di modal pratinjau jika sedang aktif
    if (previewCompModal && previewCompModal.id === comp.id) {
      setPreviewCompModal(updated);
    }

    setEditingCompId(null);
    setShowEditCompModal(null);
    setFeedbackToast(`Rincian lomba "${updated.title}" (aturan, hadiah, & TM) berhasil diperbarui!`);
    setTimeout(() => setFeedbackToast(''), 4500);
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

  // New Competition Form State (Matching Website fields)
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompCategory, setNewCompCategory] = useState<CategoryGeneration>('SMP/MTs');
  const [newCompDeadline, setNewCompDeadline] = useState('10 Oktober 2026');
  const [newCompDescription, setNewCompDescription] = useState('');
  const [newCompTarget, setNewCompTarget] = useState('');
  const [newCompFee, setNewCompFee] = useState('Gratis');
  const [newCompLocation, setNewCompLocation] = useState('Kompleks Pesantren Poncokusumo');
  const [newCompContact, setNewCompContact] = useState('0812-XXXX-XXXX (Panitia)');
  const [newCompTm, setNewCompTm] = useState('12 Oktober 2026');
  const [newCompRules, setNewCompRules] = useState<string[]>([
    'Peserta merupakan utusan sah dari lembaga/sekolah terkait.',
    'Wajib melampirkan surat mandat resmi dan kartu pelajar/santri.',
    'Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.',
  ]);
  const [newCompPrizeFirst, setNewCompPrizeFirst] = useState('Trofi Juara I + Piagam + Uang Pembinaan');
  const [newCompPrizeSecond, setNewCompPrizeSecond] = useState('Trofi Juara II + Piagam + Uang Pembinaan');
  const [newCompPrizeThird, setNewCompPrizeThird] = useState('Trofi Juara III + Piagam + Uang Pembinaan');
  const [newCompPrizeAll, setNewCompPrizeAll] = useState('E-Sertifikat Nasional ber-barcode');

  // Helper untuk generate kode lomba otomatis sesuai kategori dan nomor urut
  const getNextCompCode = (category: string) => {
    const prefixMap: Record<string, string> = {
      'PAUD/RA/TK': 'LMB-PAUD',
      'PAUD/TK': 'LMB-PAUD',
      'SD/MI': 'LMB-SD',
      'SMP/MTs': 'LMB-SMP',
      'SMA/MA/SMK': 'LMB-SMA',
      'IPNU/IPPNU': 'LMB-IPNU',
      'FATAYAT': 'LMB-FTY',
      'MUSLIMAT': 'LMB-MSL',
      'PAGAR NUSA': 'LMB-PN',
      'GURU': 'LMB-GRU',
      'ANSOR': 'LMB-ANS',
      'UMUM': 'LMB-UMUM',
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
      targetAudience: newCompTarget.trim() || `Peserta kategori ${newCompCategory}`,
      deadline: newCompDeadline.trim() || '10 Oktober 2026',
      technicalMeeting: newCompTm.trim() || '12 Oktober 2026',
      location: newCompLocation.trim() || 'Kompleks Pesantren Poncokusumo',
      contactPerson: newCompContact.trim() || '0812-XXXX-XXXX (Panitia)',
      registrationFee: newCompFee.trim() || 'Gratis',
      iconName: 'Trophy',
      description:
        newCompDescription.trim() ||
        `Perlombaan ${newCompTitle.trim()} yang diselenggarakan secara sportif dan kompetitif bagi generasi santri.`,
      rules: newCompRules.filter((r) => r.trim().length > 0),
      prizes: {
        first: newCompPrizeFirst.trim() || 'Trofi Juara I + Piagam + Uang Pembinaan',
        second: newCompPrizeSecond.trim() || 'Trofi Juara II + Piagam + Uang Pembinaan',
        third: newCompPrizeThird.trim() || 'Trofi Juara III + Piagam + Uang Pembinaan',
        all: newCompPrizeAll.trim() || undefined,
      },
    };

    onAddCompetition(created);
    setShowAddCompModal(false);
    setNewCompTitle('');
    setNewCompDescription('');
    setNewCompTarget('');
    setNewCompFee('Gratis');
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
                    <option value="PAUD/RA/TK">PAUD/RA/TK</option>
                    <option value="SD/MI">SD/MI</option>
                    <option value="SMP/MTs">SMP/MTs</option>
                    <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                    <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                    <option value="FATAYAT">FATAYAT</option>
                    <option value="MUSLIMAT">MUSLIMAT</option>
                    <option value="PAGAR NUSA">PAGAR NUSA</option>
                    <option value="GURU">GURU</option>
                    <option value="ANSOR">ANSOR</option>
                    <option value="UMUM">UMUM</option>
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
                      <th className="p-3 text-right">
                        {isSuperAdmin ? 'Aksi & Kelola' : 'Aksi Verifikasi'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-white/50 italic">
                          Tidak ada data peserta terdaftar yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p) => (
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
                            {isSuperAdmin && (
                              <button
                                onClick={() => setParticipantToDelete(p)}
                                title="Hapus Data Peserta (Khusus Super Admin)"
                                className="p-1 rounded bg-rose-500/20 hover:bg-rose-600/40 text-rose-400 hover:text-rose-200 border border-rose-500/30 transition-all ml-1 shadow-sm active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
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

              {/* Main Competitions Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#008F72] text-[#F2C96D] shadow-md shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                      <span>Tabel & Katalog Cabang Perlombaan</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30">
                        {competitions.length} Lomba
                      </span>
                    </h3>
                    <p className="text-xs text-[#DDE7E8]/70">
                      Kelola informasi lomba, sasaran peserta, juknis resmi, biaya pendaftaran, dan hadiah kejuaraan.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* View Mode Toggle: Tabel vs Kartu Web */}
                  <div className="flex items-center p-1 bg-[#020e19] border border-white/15 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setCompViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        compViewMode === 'table'
                          ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] shadow-sm'
                          : 'text-[#DDE7E8]/70 hover:text-white'
                      }`}
                      title="Tampilan Tabel Data Lengkap"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Tabel Lomba</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        compViewMode === 'grid'
                          ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] shadow-sm'
                          : 'text-[#DDE7E8]/70 hover:text-white'
                      }`}
                      title="Tampilan Kartu seperti di Website"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Kartu Web</span>
                    </button>
                  </div>

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

                  {canManageCompetitions && (
                    <button
                      onClick={() => setShowAddCompModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 transition-all flex items-center gap-1.5 shadow active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Lomba Baru</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter and Search Toolbar (Matching CompetitionsSection on Website) */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#020e19] border border-white/10">
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
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
                  ].map((cat) => {
                    const count =
                      cat === 'SEMUA'
                        ? competitions.length
                        : competitions.filter((c) => c.category === cat).length;
                    const isSelected = compCategoryFilter === cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setCompCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B]/60 shadow-lg shadow-[#006B4F]/40 scale-105'
                            : 'bg-white/5 text-[#DDE7E8] hover:bg-white/10 border border-white/10 hover:border-[#00D9F5]/30'
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-black/30 text-white'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-72 shrink-0">
                  <input
                    type="text"
                    placeholder="Cari nama lomba, sasaran, kode..."
                    value={compSearchQuery}
                    onChange={(e) => setCompSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-7 py-2 rounded-xl text-xs bg-black/40 border border-white/20 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none transition-colors"
                  />
                  <Search className="w-4 h-4 text-[#DDE7E8]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  {compSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCompSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              {(() => {
                const filteredAdminComps = competitions.filter((comp) => {
                  const matchesCategory =
                    compCategoryFilter === 'SEMUA' || comp.category === compCategoryFilter;
                  const q = compSearchQuery.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    comp.title.toLowerCase().includes(q) ||
                    comp.code.toLowerCase().includes(q) ||
                    (comp.targetAudience && comp.targetAudience.toLowerCase().includes(q)) ||
                    (comp.description && comp.description.toLowerCase().includes(q));
                  return matchesCategory && matchesSearch;
                });

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#DDE7E8]/70 px-1">
                      <span>
                        Menampilkan <strong className="text-white">{filteredAdminComps.length}</strong> dari{' '}
                        <strong className="text-[#F2C96D]">{competitions.length}</strong> cabang lomba
                        {compCategoryFilter !== 'SEMUA' && (
                          <>
                            {' '}pada kategori <strong className="text-[#00D9F5]">{compCategoryFilter}</strong>
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {competitions.filter((c) => c.juknisUrl || c.juknisFileName).length} Juknis Resmi Terunggah
                        </span>
                      </span>
                    </div>

                    {/* TABLE VIEW */}
                    {compViewMode === 'table' && (
                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020e19] shadow-xl">
                        <table className="w-full text-left text-xs text-[#DDE7E8]">
                          <thead className="bg-white/5 border-b border-white/10 font-bold text-white uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="p-3.5 whitespace-nowrap">Kode Lomba</th>
                              <th className="p-3.5 min-w-[220px]">Cabang Lomba & Sasaran</th>
                              <th className="p-3.5 whitespace-nowrap">Kategori</th>
                              <th className="p-3.5 whitespace-nowrap">Biaya & Batas</th>
                              <th className="p-3.5 min-w-[180px]">Juknis & Hadiah</th>
                              <th className="p-3.5 text-right whitespace-nowrap">Aksi Panitia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {filteredAdminComps.map((comp) => (
                              <tr key={comp.id} className="hover:bg-white/5 transition-colors group">
                                {/* 1. Kode Lomba */}
                                <td className="p-3.5 whitespace-nowrap align-top">
                                  <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-1 rounded-lg bg-[#D9B45B]/20 border border-[#D9B45B]/30 block w-fit shadow-sm">
                                    {comp.code}
                                  </span>
                                </td>

                                {/* 2. Cabang Lomba & Sasaran */}
                                <td className="p-3.5 align-top">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewCompModal(comp)}
                                    className="font-heading text-sm font-bold text-white hover:text-[#F2C96D] text-left transition-colors block"
                                  >
                                    {comp.title}
                                  </button>
                                  <div className="text-[11px] text-[#00D9F5] font-semibold mt-0.5 flex items-center gap-1">
                                    <span>Sasaran: {comp.targetAudience || `Kategori ${comp.category}`}</span>
                                  </div>
                                  <p className="text-[11px] text-[#DDE7E8]/70 mt-1 line-clamp-2 leading-relaxed">
                                    {comp.description}
                                  </p>
                                </td>

                                {/* 3. Kategori */}
                                <td className="p-3.5 whitespace-nowrap align-top">
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30 uppercase tracking-wider block w-fit">
                                    {comp.category}
                                  </span>
                                </td>

                                {/* 4. Biaya & Batas */}
                                <td className="p-3.5 whitespace-nowrap align-top space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Gift className="w-3.5 h-3.5 text-[#00D9F5] shrink-0" />
                                    <span className="font-bold text-emerald-400">
                                      {comp.registrationFee || 'Gratis'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#DDE7E8]/80">
                                    <Clock className="w-3.5 h-3.5 text-[#F2C96D] shrink-0" />
                                    <span>{comp.deadline}</span>
                                  </div>
                                </td>

                                {/* 5. Juknis & Hadiah */}
                                <td className="p-3.5 align-top space-y-2">
                                  {comp.juknisFileName || comp.juknisUrl ? (
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium max-w-[140px] truncate"
                                        title={comp.juknisFileName || 'Juknis Resmi'}
                                      >
                                        <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span className="truncate">{comp.juknisFileName || 'Juknis.pdf'}</span>
                                      </span>
                                      {comp.juknisUrl && (
                                        <a
                                          href={comp.juknisUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded text-[#00D9F5] hover:text-white hover:bg-white/10 transition-colors"
                                          title="Buka File Juknis"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    canManageCompetitions && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUploadJuknisComp(comp);
                                          setJuknisLinkUrl(comp.juknisUrl || '');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#F2C96D]/40 text-[#F2C96D] text-[10px] font-medium hover:bg-[#D9B45B]/10 transition-colors"
                                      >
                                        <FileUp className="w-3 h-3" />
                                        <span>+ Upload Juknis</span>
                                      </button>
                                    )
                                  )}

                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewCompModal(comp)}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F2C96D] hover:underline"
                                    >
                                      <Award className="w-3 h-3 text-[#F2C96D]" />
                                      <span>Hadiah & Aturan</span>
                                    </button>
                                  </div>
                                </td>

                                {/* 6. Aksi Panitia */}
                                <td className="p-3.5 text-right whitespace-nowrap align-top">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Preview Website Modal */}
                                    <button
                                      type="button"
                                      onClick={() => setPreviewCompModal(comp)}
                                      title="Lihat Pratinjau Detail Lomba & Hadiah"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[#00D9F5] hover:text-white transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Upload Juknis */}
                                    {canManageCompetitions && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUploadJuknisComp(comp);
                                          setJuknisLinkUrl(comp.juknisUrl || '');
                                        }}
                                        title="Upload / Ganti Juknis Resmi (.pdf)"
                                        className="p-1.5 rounded-lg bg-[#D9B45B]/15 hover:bg-[#D9B45B]/30 text-[#F2C96D] transition-colors"
                                      >
                                        <FileUp className="w-4 h-4" />
                                      </button>
                                    )}

                                    {/* Edit Lomba */}
                                    {canManageCompetitions && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditComp(comp)}
                                        title="Edit Cabang Lomba"
                                        className="p-1.5 rounded-lg bg-[#00D9F5]/15 hover:bg-[#00D9F5]/30 text-[#00D9F5] transition-colors"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                    )}

                                    {/* Delete Lomba */}
                                    <button
                                      type="button"
                                      onClick={() => onDeleteCompetition(comp.id)}
                                      title="Hapus Cabang Lomba"
                                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* GRID CARD VIEW (Matching Website CompetitionsSection) */}
                    {compViewMode === 'grid' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAdminComps.map((comp) => (
                          <div
                            key={comp.id}
                            className="rounded-2xl p-5 bg-[#020e19] border border-white/10 hover:border-[#00D9F5]/40 transition-all flex flex-col justify-between shadow-lg group"
                          >
                            <div>
                              {/* Header: Code & Category Badge */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-0.5 rounded bg-[#D9B45B]/20 border border-[#D9B45B]/30">
                                  {comp.code}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30 uppercase tracking-wider">
                                  {comp.category}
                                </span>
                              </div>

                              <h4 className="font-heading text-base font-bold text-white group-hover:text-[#F2C96D] transition-colors mb-1">
                                {comp.title}
                              </h4>

                              <p className="text-xs text-[#00D9F5] font-medium mb-2.5">
                                Sasaran: {comp.targetAudience}
                              </p>

                              <p className="text-xs text-[#DDE7E8]/80 leading-relaxed mb-4 line-clamp-3">
                                {comp.description}
                              </p>

                              {/* Info Pills */}
                              <div className="space-y-1.5 py-2.5 border-y border-white/10 mb-4 text-xs text-[#DDE7E8]/90">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-[#F2C96D]" />
                                  <span>
                                    Batas Pendaftaran: <strong className="text-white">{comp.deadline}</strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Gift className="w-3.5 h-3.5 text-[#00D9F5]" />
                                  <span>
                                    Biaya: <strong className="text-emerald-400">{comp.registrationFee || 'Gratis'}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Juknis Status Badge */}
                              {comp.juknisFileName || comp.juknisUrl ? (
                                <div className="mb-4 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px]">
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
                                    className="mb-4 w-full py-1.5 px-2.5 rounded-xl border border-dashed border-white/20 hover:border-[#F2C96D]/60 hover:bg-white/5 flex items-center justify-center gap-1.5 text-[11px] text-[#DDE7E8]/70 hover:text-[#F2C96D] transition-all"
                                  >
                                    <FileUp className="w-3.5 h-3.5 text-[#F2C96D]" />
                                    <span>+ Upload Juknis Lomba (.pdf)</span>
                                  </button>
                                )
                              )}
                            </div>

                            {/* Card Footer: Detail & Actions */}
                            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewCompModal(comp)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#DDE7E8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#00D9F5]" />
                                <span>Juknis & Hadiah</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {canManageCompetitions && (
                                  <button
                                    onClick={() => {
                                      setUploadJuknisComp(comp);
                                      setJuknisLinkUrl(comp.juknisUrl || '');
                                    }}
                                    className="p-1.5 rounded-lg text-[#F2C96D] hover:text-white hover:bg-[#D9B45B]/20 transition-all"
                                    title="Upload / Ganti Juknis Lomba"
                                  >
                                    <FileUp className="w-4 h-4" />
                                  </button>
                                )}
                                {canManageCompetitions && (
                                  <button
                                    onClick={() => handleStartEditComp(comp)}
                                    className="p-1.5 rounded-lg text-[#00D9F5] hover:text-white hover:bg-[#00D9F5]/20 transition-all"
                                    title="Edit Cabang Lomba"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteCompetition(comp.id)}
                                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg p-1.5 transition-colors"
                                  title="Hapus Cabang Lomba"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {filteredAdminComps.length === 0 && (
                      <div className="text-center py-12 px-4 rounded-2xl bg-[#020e19] border border-white/10 text-[#DDE7E8]/70">
                        <Trophy className="w-10 h-10 mx-auto text-white/20 mb-2" />
                        <p className="text-sm font-semibold text-white">Tidak ada cabang lomba yang cocok</p>
                        <p className="text-xs text-[#DDE7E8]/60 mt-1">
                          Coba atur ulang kata kunci pencarian atau filter kategori tingkatan.
                        </p>
                        <button
                          onClick={() => {
                            setCompCategoryFilter('SEMUA');
                            setCompSearchQuery('');
                          }}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-[#00D9F5] hover:bg-white/20 transition-colors"
                        >
                          Reset Filter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                      <option value="PAUD/RA/TK">PAUD/RA/TK</option>
                      <option value="SD/MI">SD/MI</option>
                      <option value="SMP/MTs">SMP/MTs</option>
                      <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                      <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                      <option value="FATAYAT">FATAYAT</option>
                      <option value="MUSLIMAT">MUSLIMAT</option>
                      <option value="PAGAR NUSA">PAGAR NUSA</option>
                      <option value="GURU">GURU</option>
                      <option value="ANSOR">ANSOR</option>
                      <option value="UMUM">UMUM</option>
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
                  {['PAUD/RA/TK', 'SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'IPNU/IPPNU', 'FATAYAT', 'MUSLIMAT', 'PAGAR NUSA', 'GURU', 'ANSOR', 'UMUM'].map((c) => {
                    const count = participants.filter((p) => p.category === c || (c === 'PAUD/RA/TK' && p.category === 'PAUD/TK')).length;
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
              participants={participants}
              onRefreshCompetitions={onRefreshCompetitions}
              onRefreshParticipants={onRefreshParticipants}
              setFeedbackToast={setFeedbackToast}
            />
          )}
        </div>
      </div>

      {/* SUB-MODAL: Tambah Lomba */}
      {showAddCompModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#031525] border border-[#00D9F5]/40 p-6 sm:p-7 shadow-2xl space-y-4">
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
                  Formulir cabang lomba lengkap sesuai komponen tabel & katalog website
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
                    Kategori Tingkatan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newCompCategory}
                    onChange={(e) => setNewCompCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-bold text-[#00D9F5] focus:outline-none focus:border-[#00D9F5] transition-all cursor-pointer"
                  >
                    <option value="PAUD/RA/TK">PAUD/RA/TK</option>
                    <option value="SD/MI">SD/MI</option>
                    <option value="SMP/MTs">SMP/MTs</option>
                    <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                    <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                    <option value="FATAYAT">FATAYAT</option>
                    <option value="MUSLIMAT">MUSLIMAT</option>
                    <option value="PAGAR NUSA">PAGAR NUSA</option>
                    <option value="GURU">GURU</option>
                    <option value="ANSOR">ANSOR</option>
                    <option value="UMUM">UMUM</option>
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

              {/* 5. SASARAN PESERTA & 6. BIAYA PENDAFTARAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Sasaran Peserta
                  </label>
                  <input
                    type="text"
                    placeholder={`Contoh: Santri / Siswa ${newCompCategory}`}
                    value={newCompTarget}
                    onChange={(e) => setNewCompTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Biaya Pendaftaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gratis / Rp 50.000"
                    value={newCompFee}
                    onChange={(e) => setNewCompFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-medium text-emerald-400 focus:outline-none focus:border-[#00D9F5] transition-all"
                  />
                </div>
              </div>

              {/* 7. LOKASI PELAKSANAAN & 8. NARAHUBUNG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Lokasi / Media Pelaksanaan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Aula Pesantren / Online"
                    value={newCompLocation}
                    onChange={(e) => setNewCompLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[#DDE7E8] font-bold mb-1">
                    Narahubung Teknis
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812-XXXX-XXXX (Ustadz A)"
                    value={newCompContact}
                    onChange={(e) => setNewCompContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                  />
                </div>
              </div>

              {/* 9. DESKRIPSI PERLOMBAAN */}
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

      {/* SUB-MODAL: Edit Cabang Lomba (Komponen Lengkap Sesuai Website: Aturan, Hadiah I-III, Technical Meeting) */}
      {showEditCompModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#031525] border border-[#00D9F5]/40 p-5 sm:p-7 shadow-2xl space-y-5">
            <button
              onClick={handleCancelEditComp}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all z-10"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00D9F5]/20 to-[#D9B45B]/20 border border-[#00D9F5]/40 flex items-center justify-center text-[#00D9F5] shrink-0 shadow-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
                      Edit Cabang Lomba
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F2C96D]/20 text-[#F2C96D] border border-[#F2C96D]/40">
                      {showEditCompModal.code}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30">
                      {showEditCompModal.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#DDE7E8]/70 mt-0.5">
                    Kelola seluruh rincian lomba: aturan perlombaan, hadiah kejuaraan, TM, & info teknis
                  </p>
                </div>
              </div>
            </div>

            {/* Navigasi Cepat Tab/Kategori Form */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-white/10">
              <button
                type="button"
                onClick={() => setEditFormTab('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  editFormTab === 'all'
                    ? 'bg-[#00D9F5] text-[#031525] font-bold shadow-md shadow-[#00D9F5]/20'
                    : 'bg-white/5 text-[#DDE7E8]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>Semua Rincian</span>
              </button>
              <button
                type="button"
                onClick={() => setEditFormTab('rules')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  editFormTab === 'rules'
                    ? 'bg-[#F2C96D] text-[#031525] font-bold shadow-md shadow-[#F2C96D]/20'
                    : 'bg-white/5 text-[#DDE7E8]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ketentuan & Aturan ({editCompRules.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditFormTab('prizes')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  editFormTab === 'prizes'
                    ? 'bg-amber-400 text-[#031525] font-bold shadow-md shadow-amber-400/20'
                    : 'bg-white/5 text-[#DDE7E8]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Hadiah Kejuaraan (I, II, III)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditFormTab('technical')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  editFormTab === 'technical'
                    ? 'bg-cyan-400 text-[#031525] font-bold shadow-md shadow-cyan-400/20'
                    : 'bg-white/5 text-[#DDE7E8]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Info Teknis & TM</span>
              </button>
              <button
                type="button"
                onClick={() => setEditFormTab('basic')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  editFormTab === 'basic'
                    ? 'bg-emerald-400 text-[#031525] font-bold shadow-md shadow-emerald-400/20'
                    : 'bg-white/5 text-[#DDE7E8]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Data Pokok</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditComp(showEditCompModal);
              }}
              className="space-y-6 text-xs"
            >
              {/* SECTION 1: KETENTUAN & ATURAN PERLOMBAAN */}
              {(editFormTab === 'all' || editFormTab === 'rules') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#020e19] border border-[#F2C96D]/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#D9B45B]/20 text-[#F2C96D]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                          <span>Ketentuan & Aturan Perlombaan</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#D9B45B]/20 text-[#F2C96D]">
                            {editCompRules.length} Butir
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#DDE7E8]/70">
                          Rincian syarat, petunjuk teknis pelaksanaan, dan tata tertib lomba
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (rulesEditMode === 'bulk') {
                            const parsed = bulkRulesText
                              .split('\n')
                              .map((l) => l.trim())
                              .filter((l) => l.length > 0);
                            setEditCompRules(parsed);
                          }
                          setRulesEditMode('list');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          rulesEditMode === 'list'
                            ? 'bg-[#F2C96D] text-[#031525] font-bold shadow'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Mode Daftar Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkRulesText(editCompRules.join('\n'));
                          setRulesEditMode('bulk');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          rulesEditMode === 'bulk'
                            ? 'bg-[#F2C96D] text-[#031525] font-bold shadow'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Mode Paste Banyak
                      </button>
                    </div>
                  </div>

                  {rulesEditMode === 'list' ? (
                    <div className="space-y-2.5">
                      {editCompRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 group focus-within:border-[#F2C96D]/50 transition-all"
                        >
                          <span className="font-mono font-bold text-[#F2C96D] text-[11px] mt-2 px-2 py-0.5 rounded bg-[#D9B45B]/15 shrink-0">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={rule}
                            onChange={(e) => {
                              const updated = [...editCompRules];
                              updated[idx] = e.target.value;
                              setEditCompRules(updated);
                            }}
                            className="flex-1 bg-transparent text-white text-xs py-1.5 focus:outline-none"
                            placeholder="Tuliskan butir aturan lomba..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editCompRules.filter((_, i) => i !== idx);
                              setEditCompRules(updated);
                            }}
                            title="Hapus butir aturan ini"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors mt-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Input Tambah Aturan Baru */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newRuleInput}
                          onChange={(e) => setNewRuleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newRuleInput.trim()) {
                                setEditCompRules([...editCompRules, newRuleInput.trim()]);
                                setNewRuleInput('');
                              }
                            }
                          }}
                          placeholder="Ketik butir aturan baru lalu tekan Enter atau klik Tambah..."
                          className="flex-1 px-3 py-2 rounded-xl bg-[#031525] border border-white/20 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#F2C96D] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newRuleInput.trim()) {
                              setEditCompRules([...editCompRules, newRuleInput.trim()]);
                              setNewRuleInput('');
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#D9B45B]/20 hover:bg-[#D9B45B]/30 text-[#F2C96D] border border-[#D9B45B]/40 font-bold flex items-center gap-1.5 transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Butir</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={6}
                        value={bulkRulesText}
                        onChange={(e) => setBulkRulesText(e.target.value)}
                        placeholder="Tempel / tuliskan aturan lomba di sini (1 baris = 1 butir aturan)..."
                        className="w-full p-3 rounded-xl bg-[#031525] border border-white/20 text-xs text-[#DDE7E8] font-mono leading-relaxed focus:outline-none focus:border-[#F2C96D] transition-all"
                      />
                      <div className="flex items-center justify-between text-[11px] text-[#DDE7E8]/70">
                        <span>*Setiap baris baru akan dikonversi menjadi butir aturan tersendiri.</span>
                        <button
                          type="button"
                          onClick={() => {
                            const parsed = bulkRulesText
                              .split('\n')
                              .map((l) => l.trim())
                              .filter((l) => l.length > 0);
                            setEditCompRules(parsed);
                            setRulesEditMode('list');
                          }}
                          className="px-3 py-1 rounded-lg bg-[#F2C96D] text-[#031525] font-bold hover:brightness-110 transition-all"
                        >
                          Terapkan ke Daftar Aturan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: RINCIAN HADIAH KEJUARAAN (JUARA I, II, III) */}
              {(editFormTab === 'all' || editFormTab === 'prizes') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#020e19] border border-amber-500/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                        <span>Rincian Hadiah Kejuaraan</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          Juara I, II, III
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#DDE7E8]/70">
                        Apresiasi dan penghargaan resmi bagi para pemenang cabang lomba
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* JUARA I */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2 relative group focus-within:border-amber-400">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <span>🥇 Juara I</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                            Utama
                          </span>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={editCompPrizeFirst}
                        onChange={(e) => setEditCompPrizeFirst(e.target.value)}
                        placeholder="Contoh: Trofi Juara I + Piagam + Uang Pembinaan Rp 1.500.000"
                        className="w-full p-2 rounded-xl bg-[#031525] border border-amber-500/30 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 leading-snug"
                      />
                    </div>

                    {/* JUARA II */}
                    <div className="p-3.5 rounded-2xl bg-slate-400/10 border border-slate-400/40 space-y-2 relative group focus-within:border-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                          <span>🥈 Juara II</span>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={editCompPrizeSecond}
                        onChange={(e) => setEditCompPrizeSecond(e.target.value)}
                        placeholder="Contoh: Trofi Juara II + Piagam + Uang Pembinaan Rp 1.000.000"
                        className="w-full p-2 rounded-xl bg-[#031525] border border-slate-400/30 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-slate-300 leading-snug"
                      />
                    </div>

                    {/* JUARA III */}
                    <div className="p-3.5 rounded-2xl bg-amber-700/10 border border-amber-700/40 space-y-2 relative group focus-within:border-amber-500">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                          <span>🥉 Juara III</span>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={editCompPrizeThird}
                        onChange={(e) => setEditCompPrizeThird(e.target.value)}
                        placeholder="Contoh: Trofi Juara III + Piagam + Uang Pembinaan Rp 500.000"
                        className="w-full p-2 rounded-xl bg-[#031525] border border-amber-700/30 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500 leading-snug"
                      />
                    </div>
                  </div>

                  {/* APRESIASI TAMBAHAN / SELURUH PESERTA */}
                  <div>
                    <label className="block text-[#DDE7E8] font-bold mb-1">
                      Apresiasi Seluruh Peserta / Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={editCompPrizeAll}
                      onChange={(e) => setEditCompPrizeAll(e.target.value)}
                      placeholder="Contoh: E-Sertifikat Nasional Ber-barcode untuk seluruh peserta terdaftar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs text-[#00D9F5] focus:outline-none focus:border-[#00D9F5] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: INFORMASI TEKNIS & TECHNICAL MEETING */}
              {(editFormTab === 'all' || editFormTab === 'technical') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#020e19] border border-[#00D9F5]/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#00D9F5]/20 text-[#00D9F5]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                        <span>Informasi Teknis & Pelaksanaan</span>
                      </h4>
                      <p className="text-[11px] text-[#DDE7E8]/70">
                        Technical meeting, lokasi penyelenggaraan, dan narahubung panitia
                      </p>
                    </div>
                  </div>

                  {/* TECHNICAL MEETING (Sorotan Khusus) */}
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Informasi Teknis: Jadwal Technical Meeting (TM)</span>
                        <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                        Wajib Diikuti Peserta
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={editCompTm}
                      onChange={(e) => setEditCompTm(e.target.value)}
                      placeholder="Contoh: 12 Oktober 2026 - Pukul 09.00 WIB (Aula Pesantren / Zoom Meeting)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-cyan-400/40 text-xs font-semibold text-white focus:outline-none focus:border-cyan-300 transition-all shadow-inner"
                    />
                    <p className="text-[10px] text-cyan-200/70">
                      *Jadwal pengarahan teknis, ketentuan nomor urut undian panggung, dan media tatap muka.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Batas Akhir Pendaftaran <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editCompDeadline}
                        onChange={(e) => setEditCompDeadline(e.target.value)}
                        placeholder="Contoh: 10 Oktober 2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Biaya Pendaftaran
                      </label>
                      <input
                        type="text"
                        value={editCompFee}
                        onChange={(e) => setEditCompFee(e.target.value)}
                        placeholder="Contoh: Gratis / Rp 50.000,-"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-semibold text-emerald-400 focus:outline-none focus:border-[#00D9F5] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Lokasi / Media Pelaksanaan
                      </label>
                      <input
                        type="text"
                        value={editCompLocation}
                        onChange={(e) => setEditCompLocation(e.target.value)}
                        placeholder="Contoh: Kompleks Pesantren Poncokusumo / Online"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Narahubung Teknis
                      </label>
                      <input
                        type="text"
                        value={editCompContact}
                        onChange={(e) => setEditCompContact(e.target.value)}
                        placeholder="Contoh: 0812-3456-7890 (Panitia Teknis)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: DATA POKOK LOMBA */}
              {(editFormTab === 'all' || editFormTab === 'basic') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#020e19] border border-white/10 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/10 text-white">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
                        <span>Data Pokok Lomba</span>
                      </h4>
                      <p className="text-[11px] text-[#DDE7E8]/70">
                        Judul, kategori generasi sasaran, dan ringkasan deskripsi
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#DDE7E8] font-bold mb-1">
                      Nama Cabang Lomba <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCompTitle}
                      onChange={(e) => setEditCompTitle(e.target.value)}
                      placeholder="Contoh: Musabaqah Hifdzil Qur'an (MHQ)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Kategori Tingkatan <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={editCompCategory}
                        onChange={(e) => setEditCompCategory(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-bold text-[#00D9F5] focus:outline-none focus:border-[#00D9F5] transition-all cursor-pointer"
                      >
                        <option value="PAUD/RA/TK">PAUD/RA/TK</option>
                        <option value="SD/MI">SD/MI</option>
                        <option value="SMP/MTs">SMP/MTs</option>
                        <option value="SMA/MA/SMK">SMA/MA/SMK</option>
                        <option value="IPNU/IPPNU">IPNU/IPPNU</option>
                        <option value="FATAYAT">FATAYAT</option>
                        <option value="MUSLIMAT">MUSLIMAT</option>
                        <option value="PAGAR NUSA">PAGAR NUSA</option>
                        <option value="GURU">GURU</option>
                        <option value="ANSOR">ANSOR</option>
                        <option value="UMUM">UMUM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#DDE7E8] font-bold mb-1">
                        Sasaran Peserta
                      </label>
                      <input
                        type="text"
                        value={editCompTarget}
                        onChange={(e) => setEditCompTarget(e.target.value)}
                        placeholder="Contoh: Santri / Siswa SMP & MTs sederajat"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs font-medium text-white focus:outline-none focus:border-[#00D9F5] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#DDE7E8] font-bold mb-1">
                      Deskripsi Perlombaan
                    </label>
                    <textarea
                      rows={3}
                      value={editCompDescription}
                      onChange={(e) => setEditCompDescription(e.target.value)}
                      placeholder="Ringkasan penjelasan cabang lomba..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/20 text-xs text-[#DDE7E8] focus:outline-none focus:border-[#00D9F5] transition-all leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 sticky bottom-0 bg-[#031525] py-2">
                <button
                  type="button"
                  onClick={handleCancelEditComp}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-semibold transition-all"
                >
                  Batal
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B45B] via-emerald-500 to-[#00D9F5] text-[#031525] text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#00D9F5]/20 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4 text-[#031525]" />
                    <span>Simpan Seluruh Rincian Lomba</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Pratinjau Juknis & Detail Lomba Website (100% Identik dengan Website) */}
      {previewCompModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#020e19] border border-[#D9B45B]/50 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setPreviewCompModal(null)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-[#F2C96D] px-2.5 py-0.5 rounded bg-[#D9B45B]/20 border border-[#D9B45B]/30">
                  {previewCompModal.code}
                </span>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/30">
                  {previewCompModal.category}
                </span>
                <span className="text-xs text-[#DDE7E8]/70 font-semibold ml-auto">
                  Pratinjau Tampilan Web
                </span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-white">
                {previewCompModal.title}
              </h3>
              <p className="text-xs text-[#00D9F5] font-semibold mt-1">
                Sasaran: {previewCompModal.targetAudience || `Peserta Kategori ${previewCompModal.category}`}
              </p>
            </div>

            {/* Deskripsi */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Deskripsi Perlombaan
              </h4>
              <p className="text-xs text-[#DDE7E8]/90 leading-relaxed">
                {previewCompModal.description}
              </p>
            </div>

            {/* Ketentuan & Aturan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F2C96D] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ketentuan & Aturan Lomba</span>
                  {previewCompModal.rules && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F2C96D]/20 text-[#F2C96D]">
                      {previewCompModal.rules.length}
                    </span>
                  )}
                </h4>
                {canManageCompetitions && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = previewCompModal;
                      setPreviewCompModal(null);
                      handleStartEditComp(c, 'rules');
                    }}
                    className="text-[11px] font-bold text-[#F2C96D] hover:underline flex items-center gap-1 bg-[#F2C96D]/10 px-2 py-0.5 rounded-lg border border-[#F2C96D]/20 transition-all hover:bg-[#F2C96D]/20"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Aturan</span>
                  </button>
                )}
              </div>
              {previewCompModal.rules && previewCompModal.rules.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#DDE7E8]/90">
                  {previewCompModal.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[#00D9F5] font-bold">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/50 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
                  Belum ada ketentuan khusus yang ditambahkan.
                </p>
              )}
            </div>

            {/* Hadiah Kejuaraan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>Apresiasi & Hadiah Kejuaraan</span>
                </h4>
                {canManageCompetitions && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = previewCompModal;
                      setPreviewCompModal(null);
                      handleStartEditComp(c, 'prizes');
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:underline flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 transition-all hover:bg-amber-500/20"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Hadiah</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30">
                  <span className="font-bold text-amber-300 block text-[11px]">Juara I</span>
                  <span className="text-white text-xs mt-1 block font-medium">
                    {previewCompModal.prizes?.first || 'Trofi Juara I + Piagam + Pembinaan'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-400/10 to-slate-500/5 border border-slate-400/30">
                  <span className="font-bold text-slate-300 block text-[11px]">Juara II</span>
                  <span className="text-white text-xs mt-1 block font-medium">
                    {previewCompModal.prizes?.second || 'Trofi Juara II + Piagam + Pembinaan'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-700/10 to-amber-800/5 border border-amber-700/30">
                  <span className="font-bold text-amber-400 block text-[11px]">Juara III</span>
                  <span className="text-white text-xs mt-1 block font-medium">
                    {previewCompModal.prizes?.third || 'Trofi Juara III + Piagam + Pembinaan'}
                  </span>
                </div>
              </div>
              {previewCompModal.prizes?.all && (
                <div className="p-2.5 rounded-xl bg-[#00D9F5]/10 border border-[#00D9F5]/20 text-[11px] text-[#00D9F5]">
                  <span className="font-bold">Apresiasi Peserta: </span>
                  <span>{previewCompModal.prizes.all}</span>
                </div>
              )}
            </div>

            {/* Info Teknis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00D9F5] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Informasi Teknis & Jadwal</span>
                </h4>
                {canManageCompetitions && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = previewCompModal;
                      setPreviewCompModal(null);
                      handleStartEditComp(c, 'technical');
                    }}
                    className="text-[11px] font-bold text-[#00D9F5] hover:underline flex items-center gap-1 bg-[#00D9F5]/10 px-2 py-0.5 rounded-lg border border-[#00D9F5]/20 transition-all hover:bg-[#00D9F5]/20"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Info Teknis / TM</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <span className="text-cyan-300 block text-[11px] font-bold">Technical Meeting (TM)</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00D9F5]" />
                    <span>{previewCompModal.technicalMeeting || '12 Oktober 2026'}</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/60 block text-[11px]">Batas Pendaftaran</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F2C96D]" />
                    <span>{previewCompModal.deadline}</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/60 block text-[11px]">Lokasi / Media Pelaksanaan</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{previewCompModal.location || 'Kompleks Pesantren Poncokusumo'}</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/60 block text-[11px]">Narahubung Teknis</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>{previewCompModal.contactPerson || '0812-XXXX-XXXX (Panitia)'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Juknis Download Link */}
            {previewCompModal.juknisUrl && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Petunjuk Teknis (Juknis) Resmi</span>
                    <span className="text-[11px] text-[#DDE7E8]/70">
                      {previewCompModal.juknisFileName || `${previewCompModal.code}_Juknis.pdf`}
                    </span>
                  </div>
                </div>
                <a
                  href={previewCompModal.juknisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Juknis</span>
                </a>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {canManageCompetitions && (
                  <button
                    type="button"
                    onClick={() => {
                      const comp = previewCompModal;
                      setPreviewCompModal(null);
                      handleStartEditComp(comp);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 text-[#00D9F5] border border-[#00D9F5]/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Data Lomba</span>
                  </button>
                )}
                {canManageCompetitions && (
                  <button
                    type="button"
                    onClick={() => {
                      const comp = previewCompModal;
                      setPreviewCompModal(null);
                      setUploadJuknisComp(comp);
                      setJuknisLinkUrl(comp.juknisUrl || '');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#D9B45B]/20 hover:bg-[#D9B45B]/30 text-[#F2C96D] border border-[#D9B45B]/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload Juknis</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewCompModal(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all ml-auto"
              >
                Tutup
              </button>
            </div>
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

      {/* SUB-MODAL: Konfirmasi Hapus Data Peserta (Khusus Super Admin) */}
      {participantToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#031525] border border-rose-500/50 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => !isDeletingParticipant && setParticipantToDelete(null)}
              disabled={isDeletingParticipant}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
              title="Batal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-white">
                    Hapus Data Peserta
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-rose-300/80">
                  Konfirmasi penghapusan data pendaftaran
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[#DDE7E8]/70">No. Registrasi:</span>
                <span className="font-mono font-bold text-[#F2C96D]">
                  {participantToDelete.registrationNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[#DDE7E8]/70">Nama Lengkap:</span>
                <span className="font-bold text-white">
                  {participantToDelete.fullName}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[#DDE7E8]/70">Lembaga / Sekolah:</span>
                <span className="text-white/90 text-right truncate max-w-[200px]" title={participantToDelete.institution}>
                  {participantToDelete.institution}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[#DDE7E8]/70">Cabang Lomba:</span>
                <span className="text-[#00D9F5] font-semibold text-right">
                  {participantToDelete.competitionTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#DDE7E8]/70">Kategori:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D9F5]/15 text-[#00D9F5] border border-[#00D9F5]/30">
                  {participantToDelete.category}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 leading-relaxed flex items-start gap-2">
              <span className="text-rose-400 font-bold text-sm leading-none shrink-0">⚠️</span>
              <span>
                Data peserta ini akan dihapus secara permanen dari sistem CMS panitia serta dari tabel database Supabase jika tersinkron. Tindakan ini tidak dapat dibatalkan.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingParticipant}
                onClick={() => setParticipantToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingParticipant}
                onClick={handleConfirmDeleteParticipant}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingParticipant ? 'Menghapus...' : 'Hapus Permanen'}</span>
              </button>
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
