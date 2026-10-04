import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trophy, 
  Users, 
  User,
  LogIn,
  Key,
  Copy,
  EyeOff,
  ClipboardList, 
  BarChart3, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Award, 
  FileText, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  FileDown, 
  Printer, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  Sparkles, 
  Calendar, 
  Building2, 
  Check, 
  X, 
  FolderOpen, 
  Layers,
  History,
  Info,
  ShieldCheck
} from 'lucide-react';
import { 
  Competition, 
  ParticipantRegistration, 
  UserProfile, 
  JuryAssignment, 
  ScoringCriterion, 
  JuryScore, 
  CompetitionResult, 
  WinnerTitle, 
  JuryAuditLog, 
  JuryScoringProgress 
} from '../../../types';
import { 
  getJuryProfiles, 
  saveJuryProfile, 
  toggleJuryStatus, 
  deleteJuryProfile,
  getJuryAssignments, 
  assignJuryToCompetition, 
  removeJuryAssignment, 
  removeAllAssignmentsForCompetition,
  removeAllAssignmentsForJudge,
  getScoringCriteria, 
  saveScoringCriterion, 
  deleteScoringCriterion, 
  validateCriteriaWeights, 
  getJuryScores, 
  reopenJuryScore, 
  lockCompetitionScores, 
  getCompetitionScoreRecap, 
  determineCompetitionWinners, 
  publishCompetitionResults, 
  getJuryAuditLogs, 
  getScoringProgressSummary,
  resolveCompetition,
  normalizeCompId,
  ParticipantScoreRow
} from '../../../lib/juryService';
import { exportScoreRecapCSV, exportScoreRecapPDF, exportBeritaAcaraPDF } from '../../../lib/juryReportService';

interface AdminJurySectionProps {
  competitions: Competition[];
  participants: ParticipantRegistration[];
  currentAdminName: string;
  isSuperAdmin: boolean;
  adminRole?: string;
  onOpenJuryPortal?: (juryId?: string) => void;
}

export const AdminJurySection: React.FC<AdminJurySectionProps> = ({
  competitions,
  participants,
  currentAdminName,
  isSuperAdmin,
  adminRole = 'Sekretariat Utama HSN 2026',
  onOpenJuryPortal,
}) => {
  // Wewenang Akses Hapus (Super Admin & Divisi Sekretariat & Administrasi / Divisi Sekretarian)
  const isSekretariatAdmin = useMemo(() => {
    const rawRole = (adminRole || '').toLowerCase();
    const rawAdmin = (currentAdminName || '').toLowerCase();
    const storedRole = (
      typeof window !== 'undefined'
        ? (localStorage.getItem('hsn2026_admin_role') || sessionStorage.getItem('hsn2026_admin_role') || '')
        : ''
    ).toLowerCase();
    const storedUser = (
      typeof window !== 'undefined'
        ? (localStorage.getItem('hsn2026_admin_user') || sessionStorage.getItem('hsn2026_admin_user') || '')
        : ''
    ).toLowerCase();

    const checkStr = `${rawRole} ${rawAdmin} ${storedRole} ${storedUser}`;

    // Super Admin wewenang penuh
    const isSuper =
      isSuperAdmin ||
      checkStr.includes('super admin') ||
      checkStr.includes('superadmin') ||
      checkStr.includes('sekretariat utama') ||
      checkStr.includes('gus ahmad') ||
      checkStr.includes('admin');

    // Divisi Sekretariat & Administrasi (atau variasi ejaan Sekretarian & Administrasi)
    const isSekretariat =
      checkStr.includes('sekretariat') ||
      checkStr.includes('sekretarian') ||
      checkStr.includes('administrasi') ||
      checkStr.includes('nabila');

    return isSuper || isSekretariat;
  }, [adminRole, currentAdminName, isSuperAdmin]);

  const canDeleteJuryItems = isSuperAdmin || isSekretariatAdmin || (currentAdminName?.toLowerCase() === 'admin');
  const canManageJuryCredentials = canDeleteJuryItems;

  // Sub-tab Navigation
  const [subTab, setSubTab] = useState<
    'dashboard' | 'judges' | 'assignments' | 'criteria' | 'monitoring' | 'recap' | 'winners' | 'audit'
  >('dashboard');

  // Core Data States
  const [juries, setJuries] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<JuryAssignment[]>([]);
  const [allScores, setAllScores] = useState<JuryScore[]>([]);
  const [auditLogs, setAuditLogs] = useState<JuryAuditLog[]>([]);
  const [progressList, setProgressList] = useState<JuryScoringProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected Competition Filter for tabs like Criteria, Recap, Winners
  const [selectedCompId, setSelectedCompId] = useState<string>(competitions[0]?.id || '');

  // Subtab 2: Manage Judges State & Competition Filter
  const [judgeSearch, setJudgeSearch] = useState('');
  const [judgeCompFilter, setJudgeCompFilter] = useState<string>('ALL');
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Partial<UserProfile> | null>(null);
  const [editingJudgeCompIds, setEditingJudgeCompIds] = useState<string[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [isModalPasswordVisible, setIsModalPasswordVisible] = useState(false);

  // Toggle tampilan sandi per juri
  const togglePasswordVisibility = (juryId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [juryId]: !prev[juryId],
    }));
  };

  // Salin kredensial lengkap juri untuk dikirim via WA / SMS
  const handleCopyCredentials = (jury: UserProfile) => {
    const username = jury.username || (jury.email.includes('@') ? jury.email.split('@')[0] : jury.email);
    const password = jury.password || 'santri2026';
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/juri` : '/juri';

    const textToCopy = `*AKUN RESMI PORTAL PENILAIAN JURI HSN 2026*
Nama Dewan Juri: ${jury.fullName}
Lembaga: ${jury.institution || '-'}
Portal Penilaian: ${portalUrl}
Username / ID Login: ${username}
Email Akun: ${jury.email}
Password: ${password}
---------------------------------
Silakan buka ${portalUrl} dan masuk menggunakan Username/Email dan Password di atas untuk menilai karya peserta.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setFeedbackToast({
          message: `Kredensial login ${jury.fullName} berhasil disalin ke clipboard!`,
          type: 'success',
        });
      }).catch(() => {
        setFeedbackToast({
          message: `User: ${username} | Pass: ${password}`,
          type: 'info',
        });
      });
    } else {
      setFeedbackToast({
        message: `User: ${username} | Pass: ${password}`,
        type: 'info',
      });
    }
  };

  // Subtab 3: Assignments State & Filters
  const [assignCompId, setAssignCompId] = useState<string>(competitions[0]?.id || '');
  const [assignJuryId, setAssignJuryId] = useState<string>('');
  const [assignFilterCompId, setAssignFilterCompId] = useState<string>('ALL');
  const [assignSearch, setAssignSearch] = useState<string>('');
  const [assignViewMode, setAssignViewMode] = useState<'cards' | 'by_judge' | 'matrix'>('cards');

  // Subtab 4: Criteria State
  const [criteriaList, setCriteriaList] = useState<ScoringCriterion[]>([]);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Partial<ScoringCriterion> | null>(null);

  // Subtab 5: Monitoring Penilaian Filter & View State
  const [monitoringCompFilter, setMonitoringCompFilter] = useState<string>('ALL');
  const [monitoringSearch, setMonitoringSearch] = useState<string>('');
  const [monitoringViewMode, setMonitoringViewMode] = useState<'grouped' | 'table'>('grouped');

  // Subtab 6: Recap State
  const [recapData, setRecapData] = useState<{
    rows: ParticipantScoreRow[];
    totalExpectedJuries: number;
    allCompleted: boolean;
    hasTies: boolean;
    divergentParticipantsCount: number;
  } | null>(null);
  const [recapSearch, setRecapSearch] = useState('');
  const [reopenModal, setReopenModal] = useState<{ isOpen: boolean; scoreId: string; participantName: string } | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Subtab 7: Winners State
  const [winnerSelections, setWinnerSelections] = useState<Record<string, WinnerTitle | ''>>({});
  const [winnerNotes, setWinnerNotes] = useState('');
  const [isSavingWinners, setIsSavingWinners] = useState(false);

  // Subtab 8: Detail Modal
  const [viewScoreDetail, setViewScoreDetail] = useState<ParticipantScoreRow | null>(null);

  // In-App Safe Delete Confirmation Modal & Toast State (replaces native window.confirm/alert in iframes)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'judge' | 'assignment' | 'competition_assignments' | 'judge_assignments' | 'criterion';
    id?: string;
    title: string;
    message: string;
    highlightText?: string;
    actionText?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  // Refresh all jury data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [jList, aList, sList, lList, progList] = await Promise.all([
        getJuryProfiles(),
        getJuryAssignments(competitions),
        getJuryScores(),
        getJuryAuditLogs(),
        getScoringProgressSummary(competitions, participants),
      ]);
      setJuries(jList);

      // Strictly ensure that all assignments in state match actual competitions in CMS Panitia
      const strictlyValidAssignments: JuryAssignment[] = [];
      const seenKey = new Set<string>();

      for (const a of aList) {
        if (!a.isActive) continue;
        const comp = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
        if (!comp) continue;

        const key = `${a.juryId}:${comp.id}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);
          strictlyValidAssignments.push({
            ...a,
            competitionId: comp.id,
            competitionTitle: comp.title,
            competitionCategory: comp.category,
          });
        }
      }

      setAssignments(strictlyValidAssignments);
      setAllScores(sList);
      setAuditLogs(lList);
      setProgressList(progList);
    } catch (e) {
      console.warn('Error loading admin jury data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [competitions, participants]);

  // Real-time synchronization listener (connected directly to Portal Penilaian Juri)
  useEffect(() => {
    const handleJuryUpdated = () => {
      loadAllData();
      if (selectedCompId) {
        getScoringCriteria(selectedCompId).then(setCriteriaList);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('hsn2026_jury')) {
        handleJuryUpdated();
      }
    };
    window.addEventListener('hsn2026_jury_data_updated', handleJuryUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hsn2026_jury_data_updated', handleJuryUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [selectedCompId, competitions, participants]);

  // Load criteria when selectedCompId changes
  useEffect(() => {
    if (selectedCompId) {
      getScoringCriteria(selectedCompId).then(setCriteriaList);
    }
  }, [selectedCompId]);

  // Load recap when selectedCompId changes or tab changes
  useEffect(() => {
    if (subTab === 'recap' || subTab === 'winners') {
      const activeComp = competitions.find((c) => c.id === selectedCompId);
      if (activeComp) {
        getScoringCriteria(selectedCompId).then((crit) => {
          const assignedJuryIds = assignments
            .filter((a) => a.competitionId === selectedCompId && a.isActive)
            .map((a) => a.juryId);
          const compJuries = juries.filter((j) => assignedJuryIds.includes(j.id));

          getCompetitionScoreRecap(selectedCompId, participants, compJuries, crit).then((res) => {
            setRecapData(res);
            // Pre-populate winner selections if available
            const initialWinners: Record<string, WinnerTitle | ''> = {};
            res.rows.forEach((r) => {
              if (r.winnerTitle) {
                initialWinners[r.participant.id || r.participant.registrationNumber] = r.winnerTitle;
              }
            });
            setWinnerSelections(initialWinners);
          });
        });
      }
    }
  }, [selectedCompId, subTab, competitions, participants, assignments, juries]);

  // Selected Competition Object
  const currentCompetition = useMemo(() => {
    return competitions.find((c) => c.id === selectedCompId) || competitions[0];
  }, [competitions, selectedCompId]);

  // Weight validation for current competition criteria
  const weightStatus = useMemo(() => {
    return validateCriteriaWeights(criteriaList);
  }, [criteriaList]);

  // Subtab 2 Handlers: Save Judge
  const handleSaveJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJudge?.fullName || !editingJudge.email) return;

    const res = await saveJuryProfile(
      {
        id: editingJudge.id,
        fullName: editingJudge.fullName,
        email: editingJudge.email,
        username: editingJudge.username,
        password: editingJudge.password,
        phone: editingJudge.phone,
        institution: editingJudge.institution,
        isActive: editingJudge.isActive ?? true,
      },
      currentAdminName
    );

    const savedJuryId = res.data?.id || editingJudge.id;
    if (savedJuryId) {
      // Sync competition assignments for this judge
      const currentAssigned = assignments.filter((a) => a.juryId === savedJuryId && a.isActive);

      // 1. Add newly checked competitions
      for (const compId of editingJudgeCompIds) {
        const compObj = competitions.find((c) => c.id === compId);
        if (!compObj) continue;
        const alreadyAssigned = currentAssigned.some((a) => {
          if (a.competitionId === compId) return true;
          const r = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
          return r?.id === compId;
        });
        if (!alreadyAssigned) {
          await assignJuryToCompetition(savedJuryId, compObj.id, currentAdminName, compObj.title, compObj.category, competitions);
        }
      }

      // 2. Remove unchecked competitions
      for (const a of currentAssigned) {
        const resolvedComp = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
        const effId = resolvedComp ? resolvedComp.id : a.competitionId;
        if (!editingJudgeCompIds.includes(effId)) {
          await removeJuryAssignment(a.id, currentAdminName);
        }
      }
    }

    setIsJudgeModalOpen(false);
    setEditingJudge(null);
    setEditingJudgeCompIds([]);
    await loadAllData();
  };

  // Subtab 2 Handlers: Delete Judge (Super Admin & Divisi Sekretariat)
  const handleDeleteJudge = (judgeId: string, judgeName: string) => {
    if (!canDeleteJuryItems) {
      setFeedbackToast({
        message: 'Akses Ditolak: Fitur hapus dewan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
        type: 'error',
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: 'judge',
      id: judgeId,
      title: 'Hapus Akun Dewan Juri',
      message: `Apakah Anda yakin ingin menghapus akun dewan juri "${judgeName}" secara permanen?`,
      highlightText: `Dewan Juri: ${judgeName} • Seluruh data profil dan penugasan juri ini pada cabang lomba akan otomatis dihapus.`,
      actionText: 'Hapus Dewan Juri',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteJuryProfile(judgeId, currentAdminName);
          setJuries((prev) => prev.filter((item) => item.id !== judgeId));
          setAssignments((prev) => prev.filter((item) => item.juryId !== judgeId));
          setIsJudgeModalOpen(false);
          setEditingJudge(null);
          setEditingJudgeCompIds([]);
          setDeleteModal(null);
          setFeedbackToast({
            message: `Akun dewan juri "${judgeName}" berhasil dihapus.`,
            type: 'success',
          });
          await loadAllData();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  // Subtab 3 Handlers: Add & Remove Assignment
  const handleAddAssignment = async (overrideCompId?: string, overrideJuryId?: string) => {
    const cId = overrideCompId || assignCompId;
    const jId = overrideJuryId || assignJuryId;
    if (!jId || !cId) return;
    const targetComp = competitions.find((c) => c.id === cId) || resolveCompetition(competitions, cId);
    const res = await assignJuryToCompetition(
      jId,
      targetComp ? targetComp.id : cId,
      currentAdminName,
      targetComp?.title,
      targetComp?.category,
      competitions
    );
    if (!res.success) {
      setFeedbackToast({ message: res.message || 'Gagal menugaskan juri', type: 'error' });
      return;
    }
    if (!overrideJuryId) setAssignJuryId('');
    setFeedbackToast({ message: `Dewan juri berhasil ditugaskan pada cabang lomba.`, type: 'success' });
    await loadAllData();
  };

  const handleRemoveAssignment = (id: string) => {
    if (!canDeleteJuryItems) {
      setFeedbackToast({
        message: 'Akses Ditolak: Fitur hapus penugasan dewan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
        type: 'error',
      });
      return;
    }

    const target = assignments.find((a) => a.id === id);
    const juryName = target?.juryName || 'Dewan Juri';
    const compTitle = target?.competitionTitle || 'Cabang Lomba';

    setDeleteModal({
      isOpen: true,
      type: 'assignment',
      id,
      title: 'Hapus Penugasan Juri',
      message: `Yakin ingin membatalkan dan menghapus penugasan dewan juri "${juryName}" pada cabang lomba "${compTitle}"?`,
      highlightText: `Dewan Juri: ${juryName} • Lomba: ${compTitle}`,
      actionText: 'Hapus Penugasan',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await removeJuryAssignment(id, currentAdminName);
          setAssignments((prev) => prev.filter((item) => item.id !== id));
          setDeleteModal(null);
          setFeedbackToast({
            message: `Penugasan juri "${juryName}" pada ${compTitle} berhasil dihapus.`,
            type: 'success',
          });
          await loadAllData();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleClearCompetitionAssignments = (comp: Competition) => {
    if (!canDeleteJuryItems) {
      setFeedbackToast({
        message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
        type: 'error',
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: 'competition_assignments',
      id: comp.id,
      title: 'Hapus Semua Penugasan Cabang Lomba',
      message: `Yakin ingin menghapus seluruh penugasan dewan juri pada cabang lomba "[${comp.category}] ${comp.title}"?`,
      highlightText: `Cabang Lomba: [${comp.category}] ${comp.title}`,
      actionText: 'Hapus Semua Penugasan',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await removeAllAssignmentsForCompetition(comp.id, currentAdminName);
          setAssignments((prev) => prev.filter((item) => item.competitionId !== comp.id && normalizeCompId(item.competitionId) !== normalizeCompId(comp.id)));
          setDeleteModal(null);
          setFeedbackToast({
            message: `Seluruh penugasan juri pada cabang "${comp.title}" berhasil dihapus.`,
            type: 'success',
          });
          await loadAllData();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleClearJudgeAssignments = (juryId: string, juryName: string) => {
    if (!canDeleteJuryItems) {
      setFeedbackToast({
        message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
        type: 'error',
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: 'judge_assignments',
      id: juryId,
      title: 'Hapus Semua Penugasan Juri',
      message: `Yakin ingin menghapus seluruh penugasan cabang lomba untuk dewan juri "${juryName}"?`,
      highlightText: `Dewan Juri: ${juryName}`,
      actionText: 'Hapus Semua Penugasan',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await removeAllAssignmentsForJudge(juryId, currentAdminName);
          setAssignments((prev) => prev.filter((item) => item.juryId !== juryId));
          setDeleteModal(null);
          setFeedbackToast({
            message: `Seluruh penugasan untuk dewan juri "${juryName}" berhasil dihapus.`,
            type: 'success',
          });
          await loadAllData();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleToggleAssignment = async (juryId: string, compId: string) => {
    const targetComp = competitions.find((c) => c.id === compId) || resolveCompetition(competitions, compId);
    const effectiveCompId = targetComp ? targetComp.id : compId;

    const existing = assignments.find((a) => {
      if (a.juryId !== juryId || !a.isActive) return false;
      if (a.competitionId === effectiveCompId) return true;
      const res = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
      return res?.id === effectiveCompId;
    });

    if (existing) {
      if (!canDeleteJuryItems) {
        setFeedbackToast({
          message: 'Akses Ditolak: Fitur hapus penugasan dewan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
          type: 'error',
        });
        return;
      }
      handleRemoveAssignment(existing.id);
    } else {
      await assignJuryToCompetition(
        juryId,
        effectiveCompId,
        currentAdminName,
        targetComp?.title,
        targetComp?.category,
        competitions
      );
      setFeedbackToast({
        message: `Dewan juri berhasil ditugaskan pada ${targetComp?.title || compId}.`,
        type: 'success',
      });
      await loadAllData();
    }
  };

  // Subtab 4 Handlers: Criteria
  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCriterion?.criterionName || !selectedCompId) return;

    await saveScoringCriterion(
      {
        id: editingCriterion.id,
        competitionId: selectedCompId,
        criterionName: editingCriterion.criterionName,
        description: editingCriterion.description || '',
        maxScore: Number(editingCriterion.maxScore) || 100,
        weight: Number(editingCriterion.weight) || 0,
        sortOrder: Number(editingCriterion.sortOrder) || criteriaList.length + 1,
        isActive: editingCriterion.isActive ?? true,
      },
      currentAdminName
    );

    setIsCriteriaModalOpen(false);
    setEditingCriterion(null);
    const updated = await getScoringCriteria(selectedCompId);
    setCriteriaList(updated);
    setFeedbackToast({ message: 'Parameter kriteria berhasil disimpan.', type: 'success' });
    loadAllData();
  };

  const handleDeleteCriterion = (id: string, name?: string) => {
    if (!canDeleteJuryItems) {
      setFeedbackToast({
        message: 'Akses Ditolak: Fitur hapus parameter kriteria hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
        type: 'error',
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: 'criterion',
      id,
      title: 'Hapus Parameter Kriteria Penilaian',
      message: `Apakah Anda yakin ingin menghapus parameter kriteria ${name ? `"${name}"` : ''} secara permanen?`,
      highlightText: `Parameter Kriteria: ${name || id} • Tindakan ini tidak dapat dibatalkan.`,
      actionText: 'Hapus Parameter Kriteria',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteScoringCriterion(id, currentAdminName);
          setCriteriaList((prev) => prev.filter((item) => item.id !== id));
          setIsCriteriaModalOpen(false);
          setEditingCriterion(null);
          setDeleteModal(null);
          setFeedbackToast({
            message: `Parameter kriteria ${name ? `"${name}"` : ''} berhasil dihapus.`,
            type: 'success',
          });
          const updated = await getScoringCriteria(selectedCompId);
          setCriteriaList(updated);
          await loadAllData();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  // Subtab 6 Handlers: Reopen Score
  const handleConfirmReopenScore = async () => {
    if (!reopenModal || !reopenReason.trim()) {
      alert('Alasan pembukaan kembali nilai wajib diisi.');
      return;
    }

    const res = await reopenJuryScore(reopenModal.scoreId, reopenReason, currentAdminName);
    if (res.success) {
      setReopenModal(null);
      setReopenReason('');
      loadAllData();
    } else {
      alert(res.message);
    }
  };

  // Lock Competition Scores
  const handleLockScores = async () => {
    if (!currentCompetition) return;
    if (
      !confirm(
        `Kunci seluruh dokumen nilai pada cabang "${currentCompetition.title}"? Setelah dikunci, juri tidak dapat mengubah nilai lagi.`
      )
    ) {
      return;
    }

    const res = await lockCompetitionScores(currentCompetition.id, currentAdminName);
    alert(`Berhasil mengunci ${res.count} dokumen nilai dewan juri.`);
    loadAllData();
  };

  // Subtab 7 Handlers: Save Winners & Publish
  const handleSaveWinners = async () => {
    if (!currentCompetition || !recapData) return;
    setIsSavingWinners(true);

    try {
      const resultsToSave = recapData.rows.map((r) => {
        const pId = r.participant.id || r.participant.registrationNumber;
        return {
          participantId: pId,
          averageScore: r.averageScore,
          finalScore: r.averageScore,
          rank: r.rank,
          winnerTitle: winnerSelections[pId] || null,
        };
      });

      await determineCompetitionWinners({
        competitionId: currentCompetition.id,
        results: resultsToSave,
        adminName: currentAdminName,
        decisionNotes: winnerNotes,
      });

      alert('Ketetapan Juara dan Hasil Akhir berhasil disimpan!');
      loadAllData();
    } finally {
      setIsSavingWinners(false);
    }
  };

  const handleTogglePublish = async (isPub: boolean) => {
    if (!currentCompetition) return;
    const actionLabel = isPub ? 'Mempublikasikan' : 'Menarik kembali ke draf rahasia';
    if (!confirm(`Apakah Anda yakin ingin ${actionLabel} hasil juara untuk ${currentCompetition.title}?`)) return;

    await publishCompetitionResults(currentCompetition.id, isPub, currentAdminName);
    loadAllData();
  };

  return (
    <div className="space-y-6">
      {/* INTEGRASI LANGSUNG: CMS PENILAIAN JURI ⇄ PORTAL PENILAIAN JURI */}
      <div className="rounded-3xl p-5 bg-gradient-to-r from-[#006B4F]/40 via-[#021c27] to-[#031525] border border-emerald-500/40 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006B4F] to-[#00D9F5] flex items-center justify-center text-[#F2C96D] shadow-xl shrink-0 border border-white/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  CMS PENILAIAN JURI TERHUBUNG KE PORTAL JURI
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Sync Aktif
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-[#00D9F5] border border-[#00D9F5]/30">
                  Route: /juri
                </span>
              </div>
              <p className="text-xs text-[#DDE7E8]/85 mt-1 max-w-2xl leading-relaxed">
                Manajemen akun juri, penugasan cabang lomba, dan rubrik kriteria terhubung langsung secara real-time. Setiap skor yang dikirim juri di <strong className="text-white">Portal Penilaian Juri</strong> otomatis terupdate di tab Monitoring & Rekapitulasi CMS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Salin Tautan Portal */}
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/juri` : '/juri';
                navigator.clipboard?.writeText(url).then(() => {
                  setFeedbackToast({
                    message: `Tautan Portal Juri disalin: ${url}`,
                    type: 'success',
                  });
                }).catch(() => {
                  setFeedbackToast({
                    message: 'Akses Portal Juri: /juri',
                    type: 'info',
                  });
                });
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Salin Tautan Portal Juri untuk Diberikan kepada Dewan Juri"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F2C96D]" />
              <span className="hidden sm:inline">Salin Link Portal</span>
              <span className="sm:hidden">Salin Link</span>
            </button>

            {/* Buka Portal Penilaian Juri */}
            <button
              type="button"
              onClick={() => onOpenJuryPortal?.()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] text-[#031525] font-black text-xs uppercase tracking-wider shadow-xl hover:shadow-[#00D9F5]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/30"
              title="Buka Portal Penilaian Juri (/juri)"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Buka Portal Juri</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 text-xs">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { key: 'judges', label: 'Kelola Juri', icon: Users },
          { key: 'assignments', label: 'Penugasan Juri', icon: ClipboardList },
          { key: 'criteria', label: 'Kriteria & Bobot', icon: Layers },
          { key: 'monitoring', label: 'Monitoring Penilaian', icon: Eye },
          { key: 'recap', label: 'Rekap Nilai', icon: FileText },
          { key: 'winners', label: 'Penetapan Juara', icon: Trophy },
          { key: 'audit', label: 'Audit Log Juri', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================================== */}
      {/* SUBTAB 1: DASHBOARD PENILAIAN */}
      {/* ============================================================================== */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10">
              <span className="text-[10px] text-white/50 block font-bold uppercase">Juri Aktif</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {juries.filter((j) => j.isActive).length}
              </span>
              <span className="text-[10px] text-[#00D9F5]">Dewan Juri Terdaftar</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10">
              <span className="text-[10px] text-white/50 block font-bold uppercase">Cabang Lomba</span>
              <span className="text-2xl font-black text-[#F2C96D] mt-1 block">
                {competitions.length}
              </span>
              <span className="text-[10px] text-white/60">Total Perlombaan</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10">
              <span className="text-[10px] text-white/50 block font-bold uppercase">Penilaian Masuk</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {allScores.filter((s) => s.status === 'submitted' || s.status === 'locked').length}
              </span>
              <span className="text-[10px] text-emerald-300/80">Dokumen Skor Final</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#020e19] border border-white/10">
              <span className="text-[10px] text-white/50 block font-bold uppercase">Juara Ditetapkan</span>
              <span className="text-2xl font-black text-[#00D9F5] mt-1 block">
                {progressList.filter((p) => p.hasWinner).length} / {competitions.length}
              </span>
              <span className="text-[10px] text-[#00D9F5]/80">Cabang Selesai Pleno</span>
            </div>
          </div>

          {/* Progress per Competition */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#F2C96D]" />
                  <span>Progres Penilaian Per Cabang Lomba:</span>
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Rumus: Total Penilaian Diharapkan = Jumlah Peserta × Jumlah Juri Ditugaskan
                </p>
              </div>
              <button
                type="button"
                onClick={loadAllData}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="space-y-4">
              {progressList.map((item) => (
                <div
                  key={item.competitionId}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-xs font-bold text-white">
                        {item.competitionTitle}
                      </span>
                      <span className="text-[11px] text-white/50 block">
                        Kategori: {item.category} | {item.totalParticipants} Peserta | {item.totalAssignedJuries} Juri Bertugas
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isLocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          🔒 Terkunci
                        </span>
                      )}
                      {item.hasWinner && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F2C96D]/20 text-[#F2C96D] border border-[#F2C96D]/40">
                          👑 Juara Ditetapkan
                        </span>
                      )}
                      {item.isPublished && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🌐 Publik
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-[#00D9F5]">
                        {item.progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#006B4F] to-[#00D9F5] transition-all duration-500"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>
                      Masuk: <strong>{item.completedScores}</strong> dari {item.expectedScores} berkas skor yang diharapkan
                    </span>
                    <span>Draf juri: {item.draftScores}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 2: KELOLA JURI (JURY MANAGEMENT) */}
      {/* ============================================================================== */}
      {subTab === 'judges' && (
        <div className="space-y-4">
          {/* Authorization Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {canDeleteJuryItems ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Otoritas Kredensial & Hapus Juri: Aktif ({adminRole})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Akses Terbatas (Khusus Super Admin & Divisi Sekretariat & Administrasi)</span>
                </span>
              )}
              <span className="text-white/70 text-[11px]">
                Akses kredensial login (Username & Password) serta wewenang kelola akun dewan juri aktif untuk <strong>Super Admin</strong> dan <strong>Divisi Sekretariat & Administrasi</strong> (termasuk variasi ejaan Divisi Sekretarian & Administrasi).
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, username, email, atau lembaga juri..."
                  value={judgeSearch}
                  onChange={(e) => setJudgeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
                />
              </div>

              {/* Filter Cabang Lomba (Exact same competitions list) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] font-bold text-white/60 shrink-0">Cabang Lomba:</label>
                <select
                  value={judgeCompFilter}
                  onChange={(e) => setJudgeCompFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none max-w-[240px] truncate"
                >
                  <option value="ALL">Semua Cabang Lomba ({competitions.length})</option>
                  <option value="UNASSIGNED">Belum Ditugaskan</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.category}] {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingJudge({
                  fullName: '',
                  email: '',
                  username: '',
                  password: 'santri2026',
                  phone: '',
                  institution: 'MWC NU Poncokusumo',
                  isActive: true,
                });
                setEditingJudgeCompIds([]);
                setIsModalPasswordVisible(false);
                setIsJudgeModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 w-fit shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Dewan Juri</span>
            </button>
          </div>

          {/* Judges Table */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-[#DDE7E8]">
              <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5">Nama Dewan Juri</th>
                  {canManageJuryCredentials && (
                    <th className="p-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Key className="w-3.5 h-3.5 text-[#F2C96D]" />
                        <span>Username & Password Login</span>
                      </div>
                    </th>
                  )}
                  <th className="p-3.5">Email & Kontak</th>
                  <th className="p-3.5">Lembaga / Instansi</th>
                  <th className="p-3.5">Penugasan Lomba ({competitions.length} Cabang)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {juries
                  .filter((j) => {
                    if (judgeSearch) {
                      const q = judgeSearch.toLowerCase();
                      const match =
                        j.fullName.toLowerCase().includes(q) ||
                        j.email.toLowerCase().includes(q) ||
                        (j.institution || '').toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    if (judgeCompFilter === 'UNASSIGNED') {
                      const myActive = assignments.filter((a) => a.juryId === j.id && a.isActive);
                      return myActive.length === 0;
                    }
                    if (judgeCompFilter !== 'ALL') {
                      const myActive = assignments.filter((a) => a.juryId === j.id && a.isActive);
                      const isAssigned = myActive.some((a) => {
                        if (a.competitionId === judgeCompFilter) return true;
                        const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                        return r?.id === judgeCompFilter;
                      });
                      return isAssigned;
                    }
                    return true;
                  })
                  .map((j) => {
                    const myAssigns = assignments.filter((a) => a.juryId === j.id && a.isActive);

                    return (
                      <tr key={j.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{j.fullName}</div>
                          <span className="text-[10px] text-white/40 font-mono">ID: {j.id}</span>
                        </td>
                        {canManageJuryCredentials && (
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 min-w-[230px]">
                              {/* Username */}
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Username:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-emerald-300 font-bold selection:bg-emerald-500/30">
                                    {j.username || (j.email.includes('@') ? j.email.split('@')[0] : j.email)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const u = j.username || (j.email.includes('@') ? j.email.split('@')[0] : j.email);
                                      navigator.clipboard?.writeText(u);
                                      setFeedbackToast({ message: `Username "${u}" disalin!`, type: 'success' });
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    title="Salin Username"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Password */}
                              <div className="flex items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-white/5">
                                <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Password:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[#F2C96D] font-bold">
                                    {revealedPasswords[j.id] ? (j.password || 'santri2026') : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(j.id)}
                                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    title={revealedPasswords[j.id] ? 'Sembunyikan Password' : 'Lihat Password'}
                                  >
                                    {revealedPasswords[j.id] ? <EyeOff className="w-3 h-3 text-[#F2C96D]" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const p = j.password || 'santri2026';
                                      navigator.clipboard?.writeText(p);
                                      setFeedbackToast({ message: 'Password juri disalin!', type: 'success' });
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    title="Salin Password"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Tombol Salin Seluruh Akun */}
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(j)}
                                className="w-full mt-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-100 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all border border-emerald-500/25 active:scale-95 cursor-pointer shadow-sm"
                                title="Salin Lengkap Username, Password & Tautan Portal untuk Dikirimkan ke Dewan Juri"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Salin Akun Login Juri</span>
                              </button>
                            </div>
                          </td>
                        )}
                        <td className="p-3.5">
                          <div className="font-mono text-white/80">{j.email}</div>
                          <div className="text-[11px] text-[#00D9F5]">{j.phone || '-'}</div>
                        </td>
                        <td className="p-3.5 text-white/80">{j.institution || '-'}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              // Only display assignments strictly matching valid competitions in CMS Panitia (deduplicated)
                              const seenCompIds = new Set<string>();
                              const validAssigns: { assignment: JuryAssignment; comp: Competition }[] = [];

                              for (const a of myAssigns) {
                                const compObj = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                if (compObj && !seenCompIds.has(compObj.id)) {
                                  seenCompIds.add(compObj.id);
                                  validAssigns.push({ assignment: a, comp: compObj });
                                }
                              }

                              if (validAssigns.length === 0) {
                                return <span className="text-white/30 text-[11px] italic">Belum ditugaskan</span>;
                              }

                              return validAssigns.map(({ assignment, comp }) => (
                                <span
                                  key={assignment.id}
                                  className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#006B4F]/30 border border-emerald-500/40 text-emerald-300 font-semibold truncate max-w-[220px]"
                                  title={`[${comp.category}] ${comp.title}`}
                                >
                                  [{comp.category}] {comp.title}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              j.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {j.isActive ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Tombol Buka Portal Juri & Masuk Langsung sbg Juri Ini */}
                          <button
                            type="button"
                            onClick={() => onOpenJuryPortal?.(j.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            title={`Buka Portal Penilaian Juri dan Masuk Otomatis sebagai: ${j.fullName}`}
                          >
                            <LogIn className="w-3.5 h-3.5 text-[#F2C96D]" />
                            <span className="hidden xl:inline">Masuk Portal Juri</span>
                            <span className="xl:hidden">Portal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJudge({
                                ...j,
                                username: j.username || (j.email.includes('@') ? j.email.split('@')[0] : j.email),
                                password: j.password || 'santri2026',
                              });
                              const myActiveCompIds = Array.from(new Set(
                                assignments
                                  .filter((a) => a.juryId === j.id && a.isActive)
                                  .map((a) => {
                                    const resolved = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                    return resolved ? resolved.id : null;
                                  })
                                  .filter((id): id is string => id !== null)
                              ));
                              setEditingJudgeCompIds(myActiveCompIds);
                              setIsModalPasswordVisible(false);
                              setIsJudgeModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                            title="Edit Data Juri & Cabang Lomba"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await toggleJuryStatus(j.id, !j.isActive, currentAdminName);
                              loadAllData();
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              j.isActive
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                            }`}
                            title={j.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {j.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Icon Menu Hapus Juri */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!canDeleteJuryItems) {
                                setFeedbackToast({
                                  message: 'Akses Ditolak: Fitur hapus dewan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                                  type: 'error',
                                });
                                return;
                              }
                              handleDeleteJudge(j.id, j.fullName);
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              canDeleteJuryItems
                                ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-sm active:scale-95 cursor-pointer'
                                : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                            }`}
                            title={
                              canDeleteJuryItems
                                ? `Hapus Data Juri "${j.fullName}" (Wewenang Super Admin & Divisi Sekretariat & Administrasi)`
                                : 'Hapus juri khusus untuk Super Admin dan Divisi Sekretariat & Administrasi'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Modal Form Tambah / Edit Juri via Portal */}
          {typeof document !== 'undefined' && isJudgeModalOpen && editingJudge && createPortal(
            <div className="fixed inset-0 z-[99990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99990 }}>
              <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-white/20 p-6 shadow-2xl space-y-4 animate-scale-up text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-[#00D9F5]" />
                    <span>{editingJudge.id ? 'Edit Profil & Penugasan Juri' : 'Tambah Dewan Juri Baru'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsJudgeModalOpen(false)}
                    className="p-1 rounded-lg text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveJudge} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      required
                      value={editingJudge.fullName || ''}
                      onChange={(e) => setEditingJudge({ ...editingJudge, fullName: e.target.value })}
                      placeholder="Contoh: Ust. Ahmad Fauzan, M.Pd."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Email Resmi (Untuk Login)</label>
                    <input
                      type="email"
                      required
                      value={editingJudge.email || ''}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        const prevEmail = editingJudge.email || '';
                        const currentUsername = editingJudge.username || '';
                        // Auto-fill username if empty or matching previous email prefix
                        const nextUsername = (!currentUsername || currentUsername === prevEmail.split('@')[0])
                          ? (newEmail.includes('@') ? newEmail.split('@')[0] : newEmail)
                          : currentUsername;
                        setEditingJudge({ ...editingJudge, email: newEmail, username: nextUsername });
                      }}
                      placeholder="juri.nama@hsnponcokusumo.nu"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  {/* USERNAME & PASSWORD LOGIN DEWAN JURI */}
                  {(canManageJuryCredentials || !editingJudge.id) && (
                    <div className="p-3.5 rounded-2xl bg-[#006B4F]/15 border border-emerald-500/35 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-[#F2C96D]" />
                          <span>Kredensial Login Dewan Juri</span>
                        </span>
                        <span className="text-[10px] font-bold text-[#F2C96D] bg-[#F2C96D]/15 px-2 py-0.5 rounded-md border border-[#F2C96D]/30">
                          {editingJudge.id ? 'Kelola Kredensial' : 'Wajib Diisi'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-[11px] font-semibold mb-1">
                            Username Login Juri
                          </label>
                          <input
                            type="text"
                            value={editingJudge.username || ''}
                            onChange={(e) => setEditingJudge({ ...editingJudge, username: e.target.value })}
                            placeholder="Contoh: juri.fauzan"
                            className="w-full px-3 py-2 rounded-xl bg-[#020e19] border border-emerald-500/40 text-emerald-200 text-xs font-mono focus:border-[#00D9F5] outline-none"
                          />
                          <span className="text-[10px] text-white/40 block mt-0.5">Dapat digunakan login juri selain email</span>
                        </div>

                        <div>
                          <label className="block text-white/80 text-[11px] font-semibold mb-1">
                            Password Login Juri
                          </label>
                          <div className="relative">
                            <input
                              type={isModalPasswordVisible ? 'text' : 'password'}
                              value={editingJudge.password || ''}
                              onChange={(e) => setEditingJudge({ ...editingJudge, password: e.target.value })}
                              placeholder="Default: santri2026"
                              className="w-full px-3 py-2 pr-9 rounded-xl bg-[#020e19] border border-emerald-500/40 text-[#F2C96D] text-xs font-mono focus:border-[#00D9F5] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setIsModalPasswordVisible(!isModalPasswordVisible)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                              title={isModalPasswordVisible ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
                            >
                              {isModalPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-[#F2C96D]" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-white/40 block mt-0.5">Default sandi juri: santri2026</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Nomor WhatsApp</label>
                    <input
                      type="text"
                      value={editingJudge.phone || ''}
                      onChange={(e) => setEditingJudge({ ...editingJudge, phone: e.target.value })}
                      placeholder="0857-xxxx-xxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Asal Lembaga / Instansi</label>
                    <input
                      type="text"
                      value={editingJudge.institution || ''}
                      onChange={(e) => setEditingJudge({ ...editingJudge, institution: e.target.value })}
                      placeholder="LP Ma’arif NU / Pesantren / Universitas"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  {/* Penugasan Cabang Lomba (Sinkron dengan CMS Lomba) */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-white/80 font-bold">
                        Tugaskan ke Cabang Lomba ({editingJudgeCompIds.length} Dipilih)
                      </label>
                      <span className="text-[10px] text-[#F2C96D] font-mono">
                        {competitions.length} Cabang Tersedia
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#020e19] border border-white/15">
                      {competitions.map((comp) => {
                        const isChecked = editingJudgeCompIds.includes(comp.id);
                        return (
                          <label
                            key={comp.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-[#006B4F]/25 border border-emerald-500/40 text-white'
                                : 'hover:bg-white/5 text-white/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingJudgeCompIds([...editingJudgeCompIds, comp.id]);
                                } else {
                                  setEditingJudgeCompIds(editingJudgeCompIds.filter((id) => id !== comp.id));
                                }
                              }}
                              className="mt-0.5 w-3.5 h-3.5 accent-[#006B4F] shrink-0"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-white block">
                                [{comp.category}] {comp.title}
                              </span>
                              <span className="text-[10px] text-white/50 block">
                                {comp.targetAudience || 'Peserta Terdaftar'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="judge_active_chk"
                      checked={editingJudge.isActive ?? true}
                      onChange={(e) => setEditingJudge({ ...editingJudge, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[#006B4F]"
                    />
                    <label htmlFor="judge_active_chk" className="text-white font-medium cursor-pointer">
                      Akun juri berstatus Aktif
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/60">
                    Sandi default juri: <strong className="text-[#00D9F5]">santri2026</strong>. Juri dapat menggunakan sandi tersebut atau menggunakan tautan reset resmi.
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                    {editingJudge.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canDeleteJuryItems) {
                            setFeedbackToast({
                              message: 'Akses Ditolak: Fitur hapus dewan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                              type: 'error',
                            });
                            return;
                          }
                          setIsJudgeModalOpen(false);
                          handleDeleteJudge(editingJudge.id!, editingJudge.fullName || 'Dewan Juri');
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canDeleteJuryItems
                            ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 active:scale-95 cursor-pointer'
                            : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                        }`}
                        title={
                          canDeleteJuryItems
                            ? 'Hapus akun dewan juri ini secara permanen'
                            : 'Hapus juri khusus untuk Super Admin & Divisi Sekretariat & Administrasi'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Juri</span>
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-2">
                      {editingJudge.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsJudgeModalOpen(false);
                            onOpenJuryPortal?.(editingJudge.id);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                          title="Buka Portal Penilaian Juri dan Masuk Otomatis sebagai Dewan Juri ini"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Masuk Portal Juri</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsJudgeModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold shadow-md"
                      >
                        Simpan Data Juri
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 3: PENUGASAN JURI (ASSIGNMENTS) */}
      {/* ============================================================================== */}
      {subTab === 'assignments' && (() => {
        // Find which juries are already assigned to assignCompId
        const targetSelectedComp = competitions.find((c) => c.id === assignCompId) || resolveCompetition(competitions, assignCompId);
        const effectiveAssignCompId = targetSelectedComp ? targetSelectedComp.id : assignCompId;
        const alreadyAssignedToCurrentForm = assignments
          .filter((a) => {
            if (!a.isActive) return false;
            if (a.competitionId === effectiveAssignCompId) return true;
            const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
            return r?.id === effectiveAssignCompId;
          })
          .map((a) => a.juryId);

        // Filter competitions for list
        const filteredCompetitions = competitions.filter((comp) => {
          if (assignFilterCompId === 'NEED_JURY') {
            const cAss = assignments.filter((a) => {
              if (!a.isActive) return false;
              if (a.competitionId === comp.id) return true;
              const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
              return r?.id === comp.id;
            });
            if (cAss.length >= 3) return false;
          } else if (assignFilterCompId !== 'ALL' && comp.id !== assignFilterCompId) {
            return false;
          }

          if (assignSearch.trim()) {
            const q = assignSearch.toLowerCase();
            const matchComp = comp.title.toLowerCase().includes(q) || comp.category.toLowerCase().includes(q);
            const compAss = assignments.filter((a) => {
              if (!a.isActive) return false;
              if (a.competitionId === comp.id) return true;
              const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
              return r?.id === comp.id;
            });
            const matchJury = compAss.some((a) => {
              const j = juries.find((jur) => jur.id === a.juryId);
              return (j?.fullName || a.juryName || '').toLowerCase().includes(q) ||
                (j?.institution || a.juryInstitution || '').toLowerCase().includes(q);
            });
            if (!matchComp && !matchJury) return false;
          }
          return true;
        });

        // Filter juries for by_judge view
        const filteredJuriesForView = juries.filter((j) => {
          if (!assignSearch.trim()) return true;
          const q = assignSearch.toLowerCase();
          const matchJury = j.fullName.toLowerCase().includes(q) || (j.institution || '').toLowerCase().includes(q);
          const myAss = assignments.filter((a) => a.juryId === j.id && a.isActive);
          const matchComp = myAss.some((a) => {
            const c = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
            return (c?.title || a.competitionTitle || '').toLowerCase().includes(q);
          });
          return matchJury || matchComp;
        });

        return (
          <div className="space-y-6">
            {/* Authorization Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                {canDeleteJuryItems ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Otoritas Hapus Penugasan: Aktif ({adminRole})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Akses Hapus Terbatas (Khusus Super Admin & Divisi Sekretariat & Administrasi)</span>
                  </span>
                )}
                <span className="text-white/60 text-[11px]">
                  Membatalkan dan menghapus penugasan dewan juri aktif untuk Super Admin dan Divisi Sekretariat & Administrasi.
                </span>
              </div>
            </div>

            {/* Top Form: Tugaskan Dewan Juri ke Cabang Perlombaan */}
            <div className="rounded-3xl bg-[#020e19] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#F2C96D]" />
                  <span>Tugaskan Dewan Juri ke Cabang Perlombaan</span>
                </h4>
                <span className="text-xs text-white/50 hidden sm:inline">
                  Tersedia <strong className="text-[#00D9F5]">{competitions.length} Cabang</strong> &{' '}
                  <strong className="text-[#F2C96D]">{juries.filter((j) => j.isActive).length} Juri Aktif</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Pilih Cabang Lomba:
                  </label>
                  <select
                    value={assignCompId}
                    onChange={(e) => setAssignCompId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none"
                  >
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Pilih Dewan Juri:
                  </label>
                  <select
                    value={assignJuryId}
                    onChange={(e) => setAssignJuryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#031525] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none"
                  >
                    <option value="">-- Pilih Dewan Juri --</option>
                    {juries
                      .filter((j) => j.isActive)
                      .map((j) => {
                        const isAlreadyAssigned = alreadyAssignedToCurrentForm.includes(j.id);
                        return (
                          <option key={j.id} value={j.id} disabled={isAlreadyAssigned}>
                            {isAlreadyAssigned ? `✓ ${j.fullName} (Sudah Ditugaskan)` : `${j.fullName} (${j.institution || 'MWC NU'})`}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => handleAddAssignment()}
                    disabled={!assignJuryId || alreadyAssignedToCurrentForm.includes(assignJuryId)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                  >
                    Tugaskan
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar: Filter & View Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                {/* Cabang Lomba Filter */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-xs font-bold text-white/70 shrink-0">Filter Lomba:</label>
                  <select
                    value={assignFilterCompId}
                    onChange={(e) => setAssignFilterCompId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none max-w-[260px] truncate"
                  >
                    <option value="ALL">Semua Cabang Lomba ({competitions.length})</option>
                    <option value="NEED_JURY">Perlu Juri Tambahan (&lt; 3 Juri)</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari dewan juri atau cabang lomba..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#020e19] border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setAssignViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      assignViewMode === 'cards'
                        ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Per Cabang Lomba
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignViewMode('by_judge')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      assignViewMode === 'by_judge'
                        ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Per Dewan Juri
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignViewMode('matrix')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      assignViewMode === 'matrix'
                        ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Matriks Penugasan
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadAllData}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs"
                  title="Segarkan Penugasan"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VIEW MODE 1: CARDS PER CABANG LOMBA */}
            {assignViewMode === 'cards' && (
              <div className="space-y-4">
                {filteredCompetitions.map((comp) => {
                  const compAssigns = assignments.filter((a) => {
                    if (!a.isActive) return false;
                    if (a.competitionId === comp.id) return true;
                    const res = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                    return res?.id === comp.id;
                  });

                  const compParticipantsCount = participants.filter(
                    (p) =>
                      p.competitionId === comp.id ||
                      p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
                  ).length;

                  // Juries who are available to be added to this comp
                  const assignedJuryIds = compAssigns.map((a) => a.juryId);
                  const availableJuries = juries.filter(
                    (j) => j.isActive && !assignedJuryIds.includes(j.id)
                  );

                  return (
                    <div
                      key={comp.id}
                      className="rounded-3xl bg-[#020e19] border border-white/10 p-5 space-y-3.5 shadow-lg transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#006B4F] text-white">
                              {comp.category}
                            </span>
                            <h4 className="text-sm font-extrabold text-white">{comp.title}</h4>
                            <span className="text-[10px] text-white/40 font-mono">({comp.code || comp.id})</span>
                          </div>
                          <span className="text-xs text-white/50 block mt-0.5">
                            Sasaran: <strong className="text-white/80">{comp.targetAudience || 'Santri'}</strong> •{' '}
                            Peserta terdaftar: <strong className="text-[#F2C96D]">{compParticipantsCount} santri</strong> •{' '}
                            Dewan juri bertugas: <strong className="text-[#00D9F5]">{compAssigns.length} orang</strong>
                          </span>
                        </div>

                        {/* Status Quorum Badge & Hapus Semua Penugasan */}
                        <div className="flex items-center gap-2 shrink-0">
                          {compAssigns.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canDeleteJuryItems) {
                                  setFeedbackToast({
                                    message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                                    type: 'error',
                                  });
                                  return;
                                }
                                handleClearCompetitionAssignments(comp);
                              }}
                              className={`p-2 px-3 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                                canDeleteJuryItems
                                  ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-sm active:scale-95 cursor-pointer'
                                  : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                              }`}
                              title={
                                canDeleteJuryItems
                                  ? `Hapus semua penugasan juri pada cabang ${comp.title} (Super Admin & Divisi Sekretariat & Administrasi)`
                                  : 'Hapus penugasan khusus Super Admin & Divisi Sekretariat & Administrasi'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span className="hidden sm:inline">Hapus Semua Penugasan</span>
                            </button>
                          )}

                          {compAssigns.length < 3 ? (
                            <div className="p-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Disarankan minimal 3 juri (saat ini {compAssigns.length})</span>
                            </div>
                          ) : (
                            <div className="p-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Kuorum Terpenuhi ({compAssigns.length} juri)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assigned Judges List */}
                      <div className="space-y-2">
                        {compAssigns.length === 0 ? (
                          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-white/40">
                            Belum ada dewan juri yang ditugaskan pada cabang lomba ini.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {compAssigns.map((a) => {
                              const judgeObj = juries.find((j) => j.id === a.juryId);
                              const juryFullName = judgeObj?.fullName || a.juryName || a.juryId;
                              const juryInst = judgeObj?.institution || a.juryInstitution;

                              return (
                                <div
                                  key={a.id}
                                  className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 flex items-center justify-between gap-2 text-xs transition-all shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#00D9F5]/40 flex items-center justify-center font-bold text-white text-[11px] shrink-0 shadow">
                                      {juryFullName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-white truncate">{juryFullName}</div>
                                      <div className="text-[10px] text-white/50 truncate">
                                        {juryInst || 'MWC NU Poncokusumo'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenJuryPortal?.(a.juryId)}
                                      className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 transition-all shadow-sm active:scale-95 cursor-pointer"
                                      title={`Buka & Uji Penilaian di Portal Juri sebagai: ${juryFullName}`}
                                    >
                                      <LogIn className="w-3.5 h-3.5 text-[#F2C96D]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!canDeleteJuryItems) {
                                          setFeedbackToast({
                                            message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                                            type: 'error',
                                          });
                                          return;
                                        }
                                        handleRemoveAssignment(a.id);
                                      }}
                                      className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                        canDeleteJuryItems
                                          ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-sm active:scale-95 cursor-pointer'
                                          : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                                      }`}
                                      title={
                                        canDeleteJuryItems
                                          ? `Hapus penugasan ${juryFullName} (Wewenang Super Admin & Divisi Sekretariat & Administrasi)`
                                          : 'Hapus penugasan khusus Super Admin & Divisi Sekretariat & Administrasi'
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Inline Quick Add Jury to this Competition */}
                      {availableJuries.length > 0 && (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-[11px] text-white/50 font-semibold shrink-0">Tugaskan Juri Tambahan:</span>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddAssignment(comp.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#031525] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none max-w-xs"
                          >
                            <option value="" disabled>+ Pilih Juri Tersedia...</option>
                            {availableJuries.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.fullName} ({j.institution || 'MWC NU'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 2: PER DEWAN JURI (Identical to Kelola Juri) */}
            {assignViewMode === 'by_judge' && (
              <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-[#DDE7E8]">
                  <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Nama Dewan Juri</th>
                      <th className="p-3.5">Lembaga / Instansi</th>
                      <th className="p-3.5">Cabang Lomba Ditugaskan</th>
                      <th className="p-3.5 text-center">Total Lomba</th>
                      <th className="p-3.5 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredJuriesForView.map((j) => {
                      const myAssigns = assignments.filter((a) => a.juryId === j.id && a.isActive);

                      return (
                        <tr key={j.id} className="hover:bg-white/[0.02]">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{j.fullName}</div>
                            <span className="text-[10px] text-white/40 font-mono">ID: {j.id}</span>
                          </td>
                          <td className="p-3.5 text-white/80">{j.institution || '-'}</td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                const seenCompIds = new Set<string>();
                                const validAssigns: { assignment: JuryAssignment; comp: Competition }[] = [];

                                for (const a of myAssigns) {
                                  const compObj = competitions.find((c) => c.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                  if (compObj && !seenCompIds.has(compObj.id)) {
                                    seenCompIds.add(compObj.id);
                                    validAssigns.push({ assignment: a, comp: compObj });
                                  }
                                }

                                if (validAssigns.length === 0) {
                                  return <span className="text-white/30 text-[11px] italic">Belum ditugaskan</span>;
                                }

                                return validAssigns.map(({ assignment, comp }) => (
                                  <span
                                    key={assignment.id}
                                    className="px-2.5 py-1 rounded-full text-[10px] bg-[#006B4F]/30 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1.5"
                                    title={`[${comp.category}] ${comp.title}`}
                                  >
                                    <span>[{comp.category}] {comp.title}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!canDeleteJuryItems) {
                                          setFeedbackToast({
                                            message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                                            type: 'error',
                                          });
                                          return;
                                        }
                                        handleRemoveAssignment(assignment.id);
                                      }}
                                      className={`p-1 rounded transition-all ${
                                        canDeleteJuryItems
                                          ? 'hover:text-rose-200 hover:bg-rose-500/30 text-rose-300 cursor-pointer active:scale-95'
                                          : 'text-white/30 hover:text-rose-300 cursor-pointer'
                                      }`}
                                      title={
                                        canDeleteJuryItems
                                          ? `Hapus penugasan cabang [${comp.category}] ${comp.title} (Super Admin & Divisi Sekretariat & Administrasi)`
                                          : 'Hapus penugasan khusus Super Admin & Divisi Sekretariat & Administrasi'
                                      }
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-400" />
                                    </button>
                                  </span>
                                ));
                              })()}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-white">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white">
                              {(() => {
                                const seen = new Set<string>();
                                myAssigns.forEach((a) => {
                                  const c = competitions.find((comp) => comp.id === a.competitionId) || resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                  if (c) seen.add(c.id);
                                });
                                return seen.size;
                              })()}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddAssignment(e.target.value, j.id);
                                    e.target.value = '';
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-[#031525] border border-white/15 text-[11px] text-white focus:border-[#00D9F5] outline-none"
                              >
                                <option value="" disabled>+ Tugaskan Lomba...</option>
                                {competitions
                                  .filter((comp) => !myAssigns.some((a) => {
                                    if (a.competitionId === comp.id) return true;
                                    const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                    return r?.id === comp.id;
                                  }))
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      [{c.category}] {c.title}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canDeleteJuryItems) {
                                    setFeedbackToast({
                                      message: 'Akses Ditolak: Fitur hapus penugasan juri hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                                      type: 'error',
                                    });
                                    return;
                                  }
                                  handleClearJudgeAssignments(j.id, j.fullName);
                                }}
                                disabled={myAssigns.length === 0}
                                className={`p-1.5 rounded-xl border transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0 ${
                                  canDeleteJuryItems
                                    ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 active:scale-95 cursor-pointer'
                                    : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                                }`}
                                title={
                                  canDeleteJuryItems
                                    ? `Hapus semua penugasan dewan juri "${j.fullName}" (Wewenang Super Admin & Divisi Sekretariat & Administrasi)`
                                    : 'Hapus penugasan juri khusus Super Admin & Divisi Sekretariat & Administrasi'
                                }
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

            {/* VIEW MODE 3: MATRIKS PENUGASAN (Interactive Juri x Lomba Grid) */}
            {assignViewMode === 'matrix' && (
              <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs text-[#DDE7E8]">
                  <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5 sticky left-0 bg-[#020e19] z-10">Dewan Juri</th>
                      {competitions.map((comp) => (
                        <th key={comp.id} className="p-3.5 text-center min-w-[140px]">
                          <span className="text-[#00D9F5] font-black block">[{comp.category}]</span>
                          <span className="truncate block max-w-[130px] font-bold text-white" title={comp.title}>
                            {comp.title}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {juries
                      .filter((j) => j.isActive)
                      .map((j) => {
                        const myAssigns = assignments.filter((a) => a.juryId === j.id && a.isActive);

                        return (
                          <tr key={j.id} className="hover:bg-white/[0.02]">
                            <td className="p-3.5 sticky left-0 bg-[#020e19] z-10 border-r border-white/5">
                              <div className="font-bold text-white">{j.fullName}</div>
                              <span className="text-[10px] text-white/50">{j.institution || 'MWC NU'}</span>
                            </td>
                            {competitions.map((comp) => {
                              const isAssigned = myAssigns.some((a) => {
                                if (a.competitionId === comp.id) return true;
                                const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                                return r?.id === comp.id;
                              });

                              return (
                                <td key={comp.id} className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAssignment(j.id, comp.id)}
                                    className={`group px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1 mx-auto ${
                                      isAssigned
                                        ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40'
                                        : 'bg-white/5 hover:bg-[#006B4F]/30 text-white/40 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30'
                                    }`}
                                    title={
                                      isAssigned
                                        ? canDeleteJuryItems
                                          ? 'Hapus/batalkan penugasan juri ini (Super Admin & Divisi Sekretariat & Administrasi)'
                                          : 'Hapus penugasan hanya untuk Super Admin & Divisi Sekretariat & Administrasi'
                                        : 'Tugaskan dewan juri ini'
                                    }
                                  >
                                    {isAssigned ? (
                                      <>
                                        <span className="group-hover:hidden flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Bertugas</span>
                                        </span>
                                        <span className="hidden group-hover:flex items-center gap-1 text-rose-300">
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Hapus</span>
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Tugaskan</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ============================================================================== */}
      {/* SUBTAB 4: KRITERIA & BOBOT PENILAIAN */}
      {/* ============================================================================== */}
      {subTab === 'criteria' && (
        <div className="space-y-4">
          {/* Authorization Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              {canDeleteJuryItems ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Otoritas Hapus Kriteria: Aktif ({adminRole})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Akses Hapus Terbatas (Khusus Super Admin & Divisi Sekretariat & Administrasi)</span>
                </span>
              )}
              <span className="text-white/60 text-[11px]">
                Wewenang menghapus parameter kriteria dan bobot penilaian aktif untuk Super Admin dan Divisi Sekretariat & Administrasi.
              </span>
            </div>
          </div>

          {/* Competition Selector & Add Criterion Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white/70 shrink-0">Pilih Lomba:</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.category}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingCriterion({
                  competitionId: selectedCompId,
                  criterionName: '',
                  description: '',
                  maxScore: 100,
                  weight: 20,
                  sortOrder: criteriaList.length + 1,
                  isActive: true,
                });
                setIsCriteriaModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Parameter Kriteria</span>
            </button>
          </div>

          {/* Weight Validation Notice Banner */}
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${
              weightStatus.isValid
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {weightStatus.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{weightStatus.message}</span>
            </div>
            <span className="font-mono font-black text-sm">
              Total: {weightStatus.totalWeight}%
            </span>
          </div>

          {/* Criteria Table */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-[#DDE7E8]">
              <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5 w-12 text-center">Urutan</th>
                  <th className="p-3.5">Nama Parameter Kriteria</th>
                  <th className="p-3.5">Deskripsi Rubrik</th>
                  <th className="p-3.5 text-center">Skor Maks</th>
                  <th className="p-3.5 text-center">Bobot (%)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {criteriaList.map((crit, idx) => (
                  <tr key={crit.id} className="hover:bg-white/[0.02]">
                    <td className="p-3.5 text-center font-mono font-bold text-white/50">
                      {crit.sortOrder || idx + 1}
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {crit.criterionName}
                    </td>
                    <td className="p-3.5 text-white/70 max-w-sm">
                      {crit.description || '-'}
                    </td>
                    <td className="p-3.5 text-center font-mono text-white">
                      {crit.maxScore}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#F2C96D]">
                      {crit.weight}%
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          crit.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {crit.isActive ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCriterion(crit);
                          setIsCriteriaModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                        title="Edit Kriteria"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canDeleteJuryItems) {
                            setFeedbackToast({
                              message: 'Akses Ditolak: Fitur hapus parameter kriteria hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                              type: 'error',
                            });
                            return;
                          }
                          handleDeleteCriterion(crit.id, crit.criterionName);
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          canDeleteJuryItems
                            ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-sm active:scale-95 cursor-pointer'
                            : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                        }`}
                        title={
                          canDeleteJuryItems
                            ? `Hapus Parameter Kriteria "${crit.criterionName}" (Wewenang Super Admin & Divisi Sekretariat & Administrasi)`
                            : 'Hapus parameter kriteria khusus Super Admin & Divisi Sekretariat & Administrasi'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Form Tambah / Edit Kriteria via Portal */}
          {typeof document !== 'undefined' && isCriteriaModalOpen && editingCriterion && createPortal(
            <div className="fixed inset-0 z-[99990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99990 }}>
              <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-white/20 p-6 shadow-2xl space-y-4 animate-scale-up text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#F2C96D]" />
                    <span>{editingCriterion.id ? 'Edit Kriteria Penilaian' : 'Tambah Kriteria Penilaian'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCriteriaModalOpen(false)}
                    className="p-1 rounded-lg text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveCriterion} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Nama Parameter Kriteria</label>
                    <input
                      type="text"
                      required
                      value={editingCriterion.criterionName || ''}
                      onChange={(e) => setEditingCriterion({ ...editingCriterion, criterionName: e.target.value })}
                      placeholder="Contoh: Kesesuaian Tema / Kreativitas"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Deskripsi & Rubrik Petunjuk</label>
                    <textarea
                      rows={2}
                      value={editingCriterion.description || ''}
                      onChange={(e) => setEditingCriterion({ ...editingCriterion, description: e.target.value })}
                      placeholder="Indikator penilaian yang dinilai oleh dewan juri..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/70 font-semibold mb-1">Skor Maksimal</label>
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        required
                        value={editingCriterion.maxScore ?? 100}
                        onChange={(e) => setEditingCriterion({ ...editingCriterion, maxScore: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 font-semibold mb-1">Bobot Persentase (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={editingCriterion.weight ?? 20}
                        onChange={(e) => setEditingCriterion({ ...editingCriterion, weight: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-white font-mono font-bold text-[#F2C96D]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                    {editingCriterion.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canDeleteJuryItems) {
                            setFeedbackToast({
                              message: 'Akses Ditolak: Fitur hapus parameter kriteria hanya dapat dilakukan oleh Super Admin dan Divisi Sekretariat & Administrasi.',
                              type: 'error',
                            });
                            return;
                          }
                          setIsCriteriaModalOpen(false);
                          handleDeleteCriterion(editingCriterion.id!, editingCriterion.criterionName);
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canDeleteJuryItems
                            ? 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-100 active:scale-95 cursor-pointer'
                            : 'bg-white/5 hover:bg-rose-500/10 border-white/10 text-white/30 hover:text-rose-300 cursor-pointer'
                        }`}
                        title={
                          canDeleteJuryItems
                            ? 'Hapus parameter kriteria ini secara permanen'
                            : 'Hapus parameter kriteria khusus untuk Super Admin & Divisi Sekretariat & Administrasi'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Kriteria</span>
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCriteriaModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold shadow-md"
                      >
                        Simpan Kriteria
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 5: MONITORING PENILAIAN JURI */}
      {/* ============================================================================== */}
      {subTab === 'monitoring' && (() => {
        // Filter competitions for monitoring using exact same competitions prop
        const monitoredCompetitions = competitions.filter((c) => {
          if (monitoringCompFilter !== 'ALL' && c.id !== monitoringCompFilter) return false;
          if (monitoringSearch.trim()) {
            const q = monitoringSearch.toLowerCase();
            const matchComp = c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
            const compAss = assignments.filter((a) => {
              if (!a.isActive) return false;
              if (a.competitionId === c.id) return true;
              const r = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
              return r?.id === c.id;
            });
            const matchJury = compAss.some(
              (a) => (a.juryName || '').toLowerCase().includes(q) || (a.juryInstitution || '').toLowerCase().includes(q)
            );
            if (!matchComp && !matchJury) return false;
          }
          return true;
        });

        // Summary calculations
        const totalMonitoredComps = monitoredCompetitions.length;
        const totalActiveJuryInComps = new Set(
          assignments
            .filter((a) => {
              if (!a.isActive) return false;
              return monitoredCompetitions.some(
                (c) => c.id === a.competitionId || resolveCompetition(competitions, a.competitionId, a.competitionTitle)?.id === c.id
              );
            })
            .map((a) => a.juryId)
        ).size;

        const submittedScoresCount = allScores.filter((s) => {
          if (s.status !== 'submitted' && s.status !== 'locked') return false;
          return monitoredCompetitions.some(
            (c) => c.id === s.competitionId || resolveCompetition(competitions, s.competitionId)?.id === c.id
          );
        }).length;

        const draftScoresCount = allScores.filter((s) => {
          if (s.status !== 'draft') return false;
          return monitoredCompetitions.some(
            (c) => c.id === s.competitionId || resolveCompetition(competitions, s.competitionId)?.id === c.id
          );
        }).length;

        return (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                {/* Cabang Lomba Selector (Exact same competitions list) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-xs font-bold text-white/70 shrink-0">Cabang Lomba:</label>
                  <select
                    value={monitoringCompFilter}
                    onChange={(e) => setMonitoringCompFilter(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none max-w-[280px] truncate"
                  >
                    <option value="ALL">Semua Cabang Lomba ({competitions.length} Cabang)</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Filter */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari cabang lomba atau dewan juri..."
                    value={monitoringSearch}
                    onChange={(e) => setMonitoringSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
                  />
                </div>
              </div>

              {/* Action Buttons: View mode toggle & Refresh */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#020e19] border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setMonitoringViewMode('grouped')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      monitoringViewMode === 'grouped'
                        ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Per Cabang Lomba
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitoringViewMode('table')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      monitoringViewMode === 'table'
                        ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Matriks Seluruh Juri
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadAllData}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Segarkan</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#020e19] border border-white/10">
                <span className="text-[10px] text-white/50 block font-bold uppercase">Cabang Terpantau</span>
                <span className="text-xl font-black text-white mt-0.5 block">{totalMonitoredComps} Cabang</span>
                <span className="text-[10px] text-[#00D9F5]">Sesuai data CMS Lomba</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#020e19] border border-white/10">
                <span className="text-[10px] text-white/50 block font-bold uppercase">Juri Bertugas</span>
                <span className="text-xl font-black text-[#F2C96D] mt-0.5 block">{totalActiveJuryInComps} Dewan Juri</span>
                <span className="text-[10px] text-white/60">Aktif dalam cabang</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#020e19] border border-white/10">
                <span className="text-[10px] text-white/50 block font-bold uppercase">Skor Final Masuk</span>
                <span className="text-xl font-black text-emerald-400 mt-0.5 block">{submittedScoresCount} Lembar</span>
                <span className="text-[10px] text-emerald-300/80">Sudah dikirim/terkunci</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#020e19] border border-white/10">
                <span className="text-[10px] text-white/50 block font-bold uppercase">Draf Penilaian</span>
                <span className="text-xl font-black text-amber-400 mt-0.5 block">{draftScoresCount} Lembar</span>
                <span className="text-[10px] text-amber-300/80">Belum disubmit juri</span>
              </div>
            </div>

            {/* VIEW MODE 1: GROUPED PER CABANG LOMBA */}
            {monitoringViewMode === 'grouped' ? (
              <div className="space-y-5">
                {monitoredCompetitions.map((comp) => {
                  const compAssigns = assignments.filter((a) => {
                    if (!a.isActive) return false;
                    if (a.competitionId === comp.id) return true;
                    const res = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                    return res?.id === comp.id;
                  });

                  const compParts = participants.filter(
                    (p) =>
                      p.competitionId === comp.id ||
                      p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
                  );
                  const totalParts = compParts.length;

                  // Overall progress for this competition
                  const expectedCount = totalParts * compAssigns.length;
                  const compScoresList = allScores.filter((s) => {
                    if (s.competitionId === comp.id) return true;
                    const res = resolveCompetition(competitions, s.competitionId);
                    return res?.id === comp.id;
                  });
                  const compFinalCount = compScoresList.filter((s) => s.status === 'submitted' || s.status === 'locked').length;
                  const compProgressPercent = expectedCount > 0 ? Math.min(100, Math.round((compFinalCount / expectedCount) * 100)) : 0;

                  return (
                    <div
                      key={comp.id}
                      className="rounded-3xl bg-[#020e19] border border-white/10 p-5 sm:p-6 space-y-4 shadow-xl"
                    >
                      {/* Competition Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#006B4F] text-white tracking-wider">
                              {comp.category}
                            </span>
                            <h4 className="text-base font-extrabold text-white">{comp.title}</h4>
                            <span className="text-[11px] text-white/40 font-mono">({comp.code || comp.id})</span>
                          </div>
                          <p className="text-xs text-white/60 mt-1">
                            Sasaran: <span className="text-white/80">{comp.targetAudience || 'Peserta Terdaftar'}</span> •{' '}
                            Terdaftar: <strong className="text-[#F2C96D]">{totalParts} santri</strong> •{' '}
                            Dewan Juri: <strong className="text-[#00D9F5]">{compAssigns.length} orang</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Progress Circle / Bar */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-white/50 font-bold uppercase">Progres Pleno</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#00D9F5] to-emerald-400 rounded-full"
                                  style={{ width: `${compProgressPercent}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {compProgressPercent}%
                              </span>
                            </div>
                          </div>

                          {/* Quick Jump to Rekap */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompId(comp.id);
                              setSubTab('recap');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-xs text-white flex items-center gap-1.5 transition-all shadow-sm"
                            title="Buka Rekapitulasi Nilai Cabang Ini"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#F2C96D]" />
                            <span>Rekap Nilai</span>
                          </button>
                        </div>
                      </div>

                      {/* Content: If No Jury Assigned Yet */}
                      {compAssigns.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Cabang lomba ini belum memiliki dewan juri yang ditugaskan.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignCompId(comp.id);
                              setSubTab('assignments');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all w-fit shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tugaskan Juri Sekarang</span>
                          </button>
                        </div>
                      ) : (
                        /* Table of Juries in this Competition */
                        <div className="overflow-x-auto rounded-2xl border border-white/5">
                          <table className="w-full text-left text-xs text-[#DDE7E8]">
                            <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                              <tr>
                                <th className="p-3">Nama Dewan Juri</th>
                                <th className="p-3">Lembaga / Kontak</th>
                                <th className="p-3 text-center">Total Peserta</th>
                                <th className="p-3 text-center">Draf</th>
                                <th className="p-3 text-center">Sudah Dikirim</th>
                                <th className="p-3 text-center">Terkunci</th>
                                <th className="p-3 text-center">Progres Pengisian</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Aksi / Portal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-[#020e19]">
                              {compAssigns.map((a) => {
                                const juryScoresList = allScores.filter(
                                  (s) =>
                                    (s.competitionId === comp.id || resolveCompetition(competitions, s.competitionId)?.id === comp.id) &&
                                    s.juryId === a.juryId
                                );
                                const draftCount = juryScoresList.filter((s) => s.status === 'draft').length;
                                const submittedCount = juryScoresList.filter((s) => s.status === 'submitted').length;
                                const lockedCount = juryScoresList.filter((s) => s.status === 'locked').length;

                                const done = submittedCount + lockedCount;
                                const percent = totalParts > 0 ? Math.round((done / totalParts) * 100) : 0;

                                return (
                                  <tr key={a.id} className="hover:bg-white/[0.02]">
                                    <td className="p-3">
                                      <div className="font-bold text-white">{a.juryName || a.juryId}</div>
                                      <span className="text-[10px] text-white/40 font-mono">ID: {a.juryId}</span>
                                    </td>
                                    <td className="p-3">
                                      <div className="text-white/80">{a.juryInstitution || '-'}</div>
                                      <div className="text-[10px] text-[#00D9F5]">{a.juryEmail || '-'}</div>
                                    </td>
                                    <td className="p-3 text-center font-mono text-white/70 font-semibold">{totalParts}</td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                        {draftCount}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                        {submittedCount}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                        {lockedCount}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-[#00D9F5] to-emerald-400 rounded-full"
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                        <span className={`font-mono font-bold ${percent === 100 ? 'text-emerald-400' : 'text-[#F2C96D]'}`}>
                                          {percent}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          percent === 100
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : done > 0
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-white/10 text-white/50 border border-white/10'
                                        }`}
                                      >
                                        {percent === 100 ? 'Selesai 100%' : done > 0 ? 'Sedang Menilai' : 'Belum Mulai'}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => onOpenJuryPortal?.(a.juryId)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                        title={`Buka Portal Penilaian Juri sebagai: ${a.juryName || a.juryId}`}
                                      >
                                        <LogIn className="w-3 h-3 text-[#F2C96D]" />
                                        <span>Portal Juri</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW MODE 2: FLAT TABLE OF ALL ASSIGNMENTS */
              <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-[#DDE7E8]">
                  <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Cabang Lomba</th>
                      <th className="p-3.5">Nama Dewan Juri</th>
                      <th className="p-3.5 text-center">Total Peserta</th>
                      <th className="p-3.5 text-center">Draf</th>
                      <th className="p-3.5 text-center">Sudah Dikirim</th>
                      <th className="p-3.5 text-center">Terkunci</th>
                      <th className="p-3.5 text-center">Persentase</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {assignments
                      .filter((a) => {
                        if (!a.isActive) return false;
                        const compObj = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                        const effectiveCompId = compObj ? compObj.id : a.competitionId;
                        if (monitoringCompFilter !== 'ALL' && effectiveCompId !== monitoringCompFilter) return false;
                        if (monitoringSearch.trim()) {
                          const q = monitoringSearch.toLowerCase();
                          const matchJury = (a.juryName || '').toLowerCase().includes(q) || (a.juryInstitution || '').toLowerCase().includes(q);
                          const matchComp = (compObj?.title || a.competitionTitle || '').toLowerCase().includes(q);
                          if (!matchJury && !matchComp) return false;
                        }
                        return true;
                      })
                      .map((a) => {
                        const compObj = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
                        const effectiveCompId = compObj ? compObj.id : a.competitionId;
                        const compParts = participants.filter(
                          (p) =>
                            p.competitionId === effectiveCompId ||
                            p.competitionTitle?.toLowerCase() === compObj?.title.toLowerCase()
                        );
                        const totalParts = compParts.length;

                        const juryScoresList = allScores.filter(
                          (s) =>
                            (s.competitionId === effectiveCompId || resolveCompetition(competitions, s.competitionId)?.id === effectiveCompId) &&
                            s.juryId === a.juryId
                        );
                        const draftCount = juryScoresList.filter((s) => s.status === 'draft').length;
                        const submittedCount = juryScoresList.filter((s) => s.status === 'submitted').length;
                        const lockedCount = juryScoresList.filter((s) => s.status === 'locked').length;

                        const done = submittedCount + lockedCount;
                        const percent = totalParts > 0 ? Math.round((done / totalParts) * 100) : 0;

                        return (
                          <tr key={a.id} className="hover:bg-white/[0.02]">
                            <td className="p-3.5 font-bold text-white">
                              {compObj ? (
                                <div>
                                  <span className="text-[10px] text-[#00D9F5] block uppercase font-bold">[{compObj.category}]</span>
                                  <span>{compObj.title}</span>
                                </div>
                              ) : null}
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-white">{a.juryName || a.juryId}</span>
                              <span className="text-[10px] text-white/40 block">{a.juryInstitution}</span>
                            </td>
                            <td className="p-3.5 text-center font-mono text-white/70 font-semibold">{totalParts}</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                {draftCount}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                {submittedCount}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                {lockedCount}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-mono font-bold">
                                <span className={percent === 100 ? 'text-emerald-400' : 'text-[#F2C96D]'}>
                                  {percent}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenJuryPortal?.(a.juryId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                title={`Buka Portal Penilaian Juri sebagai: ${a.juryName || a.juryId}`}
                              >
                                <LogIn className="w-3 h-3 text-[#F2C96D]" />
                                <span>Portal</span>
                              </button>
                              {compObj && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompId(compObj.id);
                                    setSubTab('recap');
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white"
                                  title="Lihat Rekap Nilai"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#F2C96D]" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ============================================================================== */}
      {/* SUBTAB 6: REKAP NILAI (SCORE RECAPITULATION) */}
      {/* ============================================================================== */}
      {subTab === 'recap' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white/70 shrink-0">Cabang Lomba:</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.category}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (recapData && currentCompetition) {
                    const assignedJuryIds = assignments
                      .filter((a) => a.competitionId === selectedCompId && a.isActive)
                      .map((a) => a.juryId);
                    const compJuries = juries.filter((j) => assignedJuryIds.includes(j.id));
                    exportScoreRecapCSV(currentCompetition, recapData.rows, compJuries);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (recapData && currentCompetition) {
                    const assignedJuryIds = assignments
                      .filter((a) => a.competitionId === selectedCompId && a.isActive)
                      .map((a) => a.juryId);
                    const compJuries = juries.filter((j) => assignedJuryIds.includes(j.id));
                    exportScoreRecapPDF(currentCompetition, recapData.rows, compJuries, currentAdminName);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:opacity-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap PDF</span>
              </button>

              <button
                type="button"
                onClick={handleLockScores}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-bold text-purple-300 flex items-center gap-1.5 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci Nilai</span>
              </button>
            </div>
          </div>

          {/* Ties & Divergence Warning Alerts */}
          {recapData?.hasTies && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>PERINGATAN NILAI SERI:</strong> Ditemukan peserta dengan nilai akhir rata-rata sama. Sesuai juknis, gunakan nilai kriteria prioritas atau musyawarah pleno dewan juri untuk memecahkan nilai seri.
              </span>
            </div>
          )}

          {recapData && recapData.divergentParticipantsCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>PERBEDAAN NILAI TINGGI:</strong> Ada peserta dengan perbedaan nilai antar juri melebihi 20 poin. Disarankan sidang dewan juri untuk rekonsiliasi penilaian.
              </span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari peserta dalam rekap..."
              value={recapSearch}
              onChange={(e) => setRecapSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
            />
          </div>

          {/* Recap Table */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-[#DDE7E8]">
              <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5 w-12 text-center">Rank</th>
                  <th className="p-3.5">Peserta</th>
                  <th className="p-3.5">Lembaga</th>
                  {assignments
                    .filter((a) => a.competitionId === selectedCompId && a.isActive)
                    .map((a, idx) => (
                      <th key={a.id} className="p-3.5 text-center">
                        Juri {idx + 1}
                        <span className="text-[9px] block opacity-60 truncate max-w-[80px]">
                          {a.juryName?.split(' ')[0]}
                        </span>
                      </th>
                    ))}
                  <th className="p-3.5 text-center font-bold text-[#F2C96D]">Rata-Rata</th>
                  <th className="p-3.5 text-center">Gelar Juara</th>
                  <th className="p-3.5 text-right">Rincian & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recapData?.rows
                  .filter((r) => {
                    if (!recapSearch) return true;
                    const q = recapSearch.toLowerCase();
                    return (
                      r.participant.fullName?.toLowerCase().includes(q) ||
                      r.participant.registrationNumber?.toLowerCase().includes(q) ||
                      r.participant.institution?.toLowerCase().includes(q)
                    );
                  })
                  .map((r) => {
                    const assignedJuries = assignments.filter(
                      (a) => a.competitionId === selectedCompId && a.isActive
                    );

                    return (
                      <tr key={r.participant.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 text-center font-mono font-bold text-sm">
                          {r.rank ? (
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center ${
                                r.rank === 1
                                  ? 'bg-[#F2C96D] text-black font-black'
                                  : r.rank === 2
                                  ? 'bg-slate-300 text-black font-black'
                                  : r.rank === 3
                                  ? 'bg-amber-700 text-white font-black'
                                  : 'text-white/60'
                              }`}
                            >
                              {r.rank}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{r.participant.fullName}</div>
                          <span className="text-[10px] font-mono text-[#00D9F5]">
                            {r.participant.registrationNumber}
                          </span>
                        </td>
                        <td className="p-3.5 text-white/80">{r.participant.institution}</td>

                        {/* Jury Scores */}
                        {assignedJuries.map((a) => {
                          const val = r.juryScores[a.juryId];
                          const stat = r.juryStatuses[a.juryId];

                          return (
                            <td key={a.id} className="p-3.5 text-center font-mono">
                              {val !== undefined ? (
                                <span
                                  className={`font-semibold ${
                                    stat === 'submitted' || stat === 'locked'
                                      ? 'text-white'
                                      : 'text-amber-400/80 italic'
                                  }`}
                                  title={`Status: ${stat}`}
                                >
                                  {val.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-white/20">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Average */}
                        <td className="p-3.5 text-center font-mono font-bold text-sm text-[#F2C96D]">
                          {r.averageScore > 0 ? r.averageScore.toFixed(2) : '-'}
                        </td>

                        {/* Winner Title */}
                        <td className="p-3.5 text-center">
                          {r.winnerTitle ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F2C96D]/20 text-[#F2C96D] border border-[#F2C96D]/40">
                              {r.winnerTitle}
                            </span>
                          ) : r.isTie ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              Nilai Seri
                            </span>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>

                        {/* Action Details / Reopen */}
                        <td className="p-3.5 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => setViewScoreDetail(r)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Modal Rincian Nilai & Buka Draf Kembali */}
          {viewScoreDetail && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-2xl w-full rounded-3xl bg-[#031525] border border-white/20 p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Rincian Nilai: {viewScoreDetail.participant.fullName}
                    </h4>
                    <span className="text-xs text-[#00D9F5] font-mono">
                      No. Reg: {viewScoreDetail.participant.registrationNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewScoreDetail(null)}
                    className="p-1 rounded-lg text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {assignments
                    .filter((a) => a.competitionId === selectedCompId && a.isActive)
                    .map((a) => {
                      const sc = allScores.find(
                        (s) =>
                          s.competitionId === selectedCompId &&
                          s.juryId === a.juryId &&
                          (s.participantId === viewScoreDetail.participant.id ||
                            s.participantId === viewScoreDetail.participant.registrationNumber)
                      );

                      return (
                        <div key={a.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{a.juryName || a.juryId}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sc?.status === 'submitted' || sc?.status === 'locked'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {sc?.status || 'Belum Menilai'}
                              </span>
                              <span className="font-mono font-bold text-sm text-[#F2C96D]">
                                {sc ? sc.totalScore.toFixed(2) : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Scores breakdown per criterion */}
                          {sc && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                              {criteriaList.map((crit) => (
                                <div key={crit.id} className="flex items-center justify-between text-white/70">
                                  <span>{crit.criterionName}:</span>
                                  <span className="font-mono text-white">
                                    {sc.scores[crit.id] ?? 0} / {crit.maxScore}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {sc?.notes && (
                            <div className="pt-2 text-[11px] text-white/60 italic">
                              Catatan Juri: "{sc.notes}"
                            </div>
                          )}

                          {/* Reopen Button if submitted or locked */}
                          {sc && (
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setReopenModal({
                                    isOpen: true,
                                    scoreId: sc.id,
                                    participantName: viewScoreDetail.participant.fullName,
                                  });
                                  setViewScoreDetail(null);
                                }}
                                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Buka Kembali Jadi Draf</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi Pembukaan Kembali Nilai dengan Alasan */}
          {reopenModal?.isOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-amber-500/40 p-6 shadow-2xl space-y-4 animate-scale-up">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Buka Kembali Dokumen Nilai Peserta</span>
                </h4>
                <p className="text-xs text-white/70">
                  Membuka nilai untuk peserta: <strong>{reopenModal.participantName}</strong>. Juri akan dapat merevisi kembali nilai tersebut.
                </p>

                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Alasan Pembukaan Kembali (Wajib untuk Audit Log):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Contoh: Kesalahan input kriteria orisinalitas atas permohonan dewan juri..."
                    className="w-full p-2.5 rounded-xl bg-[#020e19] border border-white/20 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReopenModal(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReopenScore}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-md"
                  >
                    Buka Draf Nilai
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 7: PENETAPAN JUARA & PUBLIKASI HASIL */}
      {/* ============================================================================== */}
      {subTab === 'winners' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white/70 shrink-0">Cabang Lomba:</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:border-[#00D9F5] outline-none"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.category}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Berita Acara & Publish Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (recapData && currentCompetition) {
                    const winnersList = recapData.rows
                      .filter((r) => {
                        const pId = r.participant.id || r.participant.registrationNumber;
                        return !!winnerSelections[pId];
                      })
                      .map((r) => {
                        const pId = r.participant.id || r.participant.registrationNumber;
                        return {
                          winnerTitle: winnerSelections[pId] || `Peringkat ${r.rank}`,
                          participant: r.participant,
                          averageScore: r.averageScore,
                          rank: r.rank,
                        };
                      });

                    const assignedJuryIds = assignments
                      .filter((a) => a.competitionId === selectedCompId && a.isActive)
                      .map((a) => a.juryId);
                    const compJuries = juries.filter((j) => assignedJuryIds.includes(j.id));

                    exportBeritaAcaraPDF(
                      currentCompetition,
                      winnersList,
                      compJuries,
                      winnerNotes,
                      currentAdminName
                    );
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-[#F2C96D]" />
                <span>Cetak Berita Acara PDF</span>
              </button>

              {/* Publish Toggle Button */}
              {progressList.find((p) => p.competitionId === selectedCompId)?.isPublished ? (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(false)}
                  className="px-4 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center gap-1.5 transition-all"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Tarik Hasil dari Publik</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Publikasikan Hasil Juara</span>
                </button>
              )}
            </div>
          </div>

          {/* Winner Assignment Table */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-[#DDE7E8]">
              <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5 w-14 text-center">Rank</th>
                  <th className="p-3.5">Nama Peserta / Tim Santri</th>
                  <th className="p-3.5">Asal Lembaga</th>
                  <th className="p-3.5 text-center font-mono">Skor Akhir</th>
                  <th className="p-3.5">Tetapkan Gelar Juara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recapData?.rows.map((r) => {
                  const pId = r.participant.id || r.participant.registrationNumber;
                  const currentTitle = winnerSelections[pId] || '';

                  return (
                    <tr key={pId} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 text-center font-mono font-bold text-sm">
                        {r.rank}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{r.participant.fullName}</div>
                        <span className="text-[10px] font-mono text-[#00D9F5]">
                          {r.participant.registrationNumber}
                        </span>
                      </td>
                      <td className="p-3.5 text-white/80">{r.participant.institution}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-sm text-[#F2C96D]">
                        {r.averageScore.toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <select
                          value={currentTitle}
                          onChange={(e) => {
                            setWinnerSelections({
                              ...winnerSelections,
                              [pId]: e.target.value as WinnerTitle,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold outline-none border ${
                            currentTitle
                              ? 'bg-[#006B4F] text-white border-emerald-400'
                              : 'bg-[#031525] text-white/70 border-white/15'
                          }`}
                        >
                          <option value="">-- Bukan Juara --</option>
                          <option value="Juara 1">Juara 1</option>
                          <option value="Juara 2">Juara 2</option>
                          <option value="Juara 3">Juara 3</option>
                          <option value="Harapan 1">Harapan 1</option>
                          <option value="Harapan 2">Harapan 2</option>
                          <option value="Juara Favorit">Juara Favorit</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Decision Notes & Save Button */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 p-5 space-y-3">
            <label className="block text-xs font-bold text-white">
              Catatan Sidang Pleno Penetapan Pemenang:
            </label>
            <textarea
              rows={2}
              value={winnerNotes}
              onChange={(e) => setWinnerNotes(e.target.value)}
              placeholder="Tuliskan catatan konsideran sidang juri atau ketetapan khusus dewan juri..."
              className="w-full p-3 rounded-xl bg-[#031525] border border-white/15 text-xs text-white outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveWinners}
                disabled={isSavingWinners}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Ketetapan Pemenang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 8: AUDIT LOG JURI (JURY AUDIT LOGS) */}
      {/* ============================================================================== */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#F2C96D]" />
              <span>Log Aktivitas & Jejak Audit Penjurian</span>
            </h4>
            <button
              type="button"
              onClick={loadAllData}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan Log</span>
            </button>
          </div>

          <div className="rounded-3xl bg-[#020e19] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-[#DDE7E8]">
              <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5">Waktu</th>
                  <th className="p-3.5">Aksi</th>
                  <th className="p-3.5">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-white/40 italic">
                      Belum ada catatan log aktivitas penjurian.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 text-white/60 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 font-bold text-[#00D9F5]">
                        {log.action}
                      </td>
                      <td className="p-3.5 text-white/90">
                        {log.notes || JSON.stringify(log.newValue || log.oldValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-App Feedback Toast Notification via Portal */}
      {typeof document !== 'undefined' && feedbackToast && createPortal(
        <div className="fixed top-6 right-6 z-[999999] animate-bounce-short pointer-events-auto" style={{ zIndex: 999999 }}>
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold backdrop-blur-md ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : feedbackToast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                : 'bg-cyan-950/95 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedbackToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="ml-2 text-white/50 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Safe Delete Confirmation Modal via Portal */}
      {typeof document !== 'undefined' && deleteModal && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          style={{ zIndex: 999999 }}
          onClick={() => !isDeleting && setDeleteModal(null)}
        >
          <div 
            className="max-w-md w-full rounded-3xl bg-[#031525] border border-rose-500/40 p-6 shadow-2xl space-y-4 animate-scale-up text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">
                  {deleteModal.title}
                </h4>
                <span className="text-[11px] text-rose-300 font-semibold block">
                  Konfirmasi Wewenang Super Admin & Sekretariat
                </span>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeleteModal(null)}
                disabled={isDeleting}
                className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-white/80">
              <p className="leading-relaxed">{deleteModal.message}</p>
              {deleteModal.highlightText && (
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white font-mono text-[11px] leading-relaxed">
                  {deleteModal.highlightText}
                </div>
              )}
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Tindakan ini permanen dan akan langsung diperbarui di sistem.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteModal.onConfirm) {
                    await deleteModal.onConfirm();
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteModal.actionText || 'Ya, Hapus Sekarang'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
