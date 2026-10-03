import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  User,
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
  Info
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
  getJuryAssignments, 
  assignJuryToCompetition, 
  removeJuryAssignment, 
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
  ParticipantScoreRow
} from '../../../lib/juryService';
import { exportScoreRecapCSV, exportScoreRecapPDF, exportBeritaAcaraPDF } from '../../../lib/juryReportService';

interface AdminJurySectionProps {
  competitions: Competition[];
  participants: ParticipantRegistration[];
  currentAdminName: string;
  isSuperAdmin: boolean;
}

export const AdminJurySection: React.FC<AdminJurySectionProps> = ({
  competitions,
  participants,
  currentAdminName,
  isSuperAdmin,
}) => {
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

  // Subtab 2: Manage Judges State
  const [judgeSearch, setJudgeSearch] = useState('');
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Partial<UserProfile> | null>(null);

  // Subtab 3: Assignments State
  const [assignCompId, setAssignCompId] = useState<string>(competitions[0]?.id || '');
  const [assignJuryId, setAssignJuryId] = useState<string>('');

  // Subtab 4: Criteria State
  const [criteriaList, setCriteriaList] = useState<ScoringCriterion[]>([]);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Partial<ScoringCriterion> | null>(null);

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

  // Refresh all jury data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [jList, aList, sList, lList, progList] = await Promise.all([
        getJuryProfiles(),
        getJuryAssignments(),
        getJuryScores(),
        getJuryAuditLogs(),
        getScoringProgressSummary(competitions, participants),
      ]);
      setJuries(jList);
      setAssignments(aList);
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

    await saveJuryProfile(
      {
        id: editingJudge.id,
        fullName: editingJudge.fullName,
        email: editingJudge.email,
        phone: editingJudge.phone,
        institution: editingJudge.institution,
        isActive: editingJudge.isActive ?? true,
      },
      currentAdminName
    );

    setIsJudgeModalOpen(false);
    setEditingJudge(null);
    loadAllData();
  };

  // Subtab 3 Handlers: Add Assignment
  const handleAddAssignment = async () => {
    if (!assignJuryId || !assignCompId) return;
    const targetComp = competitions.find((c) => c.id === assignCompId);
    const res = await assignJuryToCompetition(
      assignJuryId,
      assignCompId,
      currentAdminName,
      targetComp?.title
    );
    if (!res.success) {
      alert(res.message);
      return;
    }
    setAssignJuryId('');
    loadAllData();
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan penugasan dewan juri ini?')) return;
    await removeJuryAssignment(id, currentAdminName);
    loadAllData();
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
    loadAllData();
  };

  const handleDeleteCriterion = async (id: string) => {
    if (!confirm('Kriteria akan dinonaktifkan (arsip) agar tidak merusak nilai yang sudah masuk. Lanjutkan?')) return;
    await deleteScoringCriterion(id, currentAdminName);
    const updated = await getScoringCriteria(selectedCompId);
    setCriteriaList(updated);
    loadAllData();
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, email, atau lembaga juri..."
                value={judgeSearch}
                onChange={(e) => setJudgeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#020e19] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00D9F5]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingJudge({
                  fullName: '',
                  email: '',
                  phone: '',
                  institution: 'MWC NU Poncokusumo',
                  isActive: true,
                });
                setIsJudgeModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 w-fit"
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
                  <th className="p-3.5">Email & Kontak</th>
                  <th className="p-3.5">Lembaga / Instansi</th>
                  <th className="p-3.5">Penugasan Lomba</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {juries
                  .filter((j) => {
                    if (!judgeSearch) return true;
                    const q = judgeSearch.toLowerCase();
                    return (
                      j.fullName.toLowerCase().includes(q) ||
                      j.email.toLowerCase().includes(q) ||
                      (j.institution || '').toLowerCase().includes(q)
                    );
                  })
                  .map((j) => {
                    const myAssigns = assignments.filter((a) => a.juryId === j.id && a.isActive);

                    return (
                      <tr key={j.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{j.fullName}</div>
                          <span className="text-[10px] text-white/40 font-mono">ID: {j.id}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-white/80">{j.email}</div>
                          <div className="text-[11px] text-[#00D9F5]">{j.phone || '-'}</div>
                        </td>
                        <td className="p-3.5 text-white/80">{j.institution || '-'}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {myAssigns.length > 0 ? (
                              myAssigns.map((a) => (
                                <span
                                  key={a.id}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-medium truncate max-w-[150px]"
                                >
                                  {a.competitionTitle || a.competitionId}
                                </span>
                              ))
                            ) : (
                              <span className="text-white/30 text-[11px] italic">Belum ditugaskan</span>
                            )}
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
                        <td className="p-3.5 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJudge(j);
                              setIsJudgeModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                            title="Edit Data Juri"
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
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Modal Form Tambah / Edit Juri */}
          {isJudgeModalOpen && editingJudge && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-white/20 p-6 shadow-2xl space-y-4 animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-[#00D9F5]" />
                    <span>{editingJudge.id ? 'Edit Profil Dewan Juri' : 'Tambah Dewan Juri Baru'}</span>
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
                      onChange={(e) => setEditingJudge({ ...editingJudge, email: e.target.value })}
                      placeholder="juri.nama@hsnponcokusumo.nu"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020e19] border border-white/15 text-white focus:border-[#00D9F5] outline-none"
                    />
                  </div>

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

                  <div className="flex items-center gap-2 pt-2">
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

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
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
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 3: PENUGASAN JURI (ASSIGNMENTS) */}
      {/* ============================================================================== */}
      {subTab === 'assignments' && (
        <div className="space-y-6">
          {/* Assignment Creation Form */}
          <div className="rounded-3xl bg-[#020e19] border border-white/10 p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#F2C96D]" />
              <span>Tugaskan Dewan Juri ke Cabang Perlombaan</span>
            </h4>

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
                  <option value="">-- Pilih Juri --</option>
                  {juries
                    .filter((j) => j.isActive)
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.fullName} ({j.institution || 'MWC NU'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddAssignment}
                  disabled={!assignJuryId}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95"
                >
                  Tugaskan
                </button>
              </div>
            </div>
          </div>

          {/* List per Competition with < 3 Judges Warning */}
          <div className="space-y-4">
            {competitions.map((comp) => {
              const compAssigns = assignments.filter((a) => a.competitionId === comp.id && a.isActive);
              const compParticipantsCount = participants.filter(
                (p) =>
                  p.competitionId === comp.id ||
                  p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
              ).length;

              return (
                <div
                  key={comp.id}
                  className="rounded-3xl bg-[#020e19] border border-white/10 p-5 space-y-3 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F] text-white">
                          {comp.category}
                        </span>
                        <h4 className="text-sm font-bold text-white">{comp.title}</h4>
                      </div>
                      <span className="text-xs text-white/50 block mt-0.5">
                        Peserta terdaftar: <strong className="text-[#F2C96D]">{compParticipantsCount} santri</strong>
                      </span>
                    </div>

                    {/* Warning if less than 3 judges */}
                    {compAssigns.length < 3 && (
                      <div className="p-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Disarankan minimal 3 juri (saat ini {compAssigns.length})</span>
                      </div>
                    )}
                  </div>

                  {/* Judges Badges */}
                  <div className="flex flex-wrap gap-2">
                    {compAssigns.length === 0 ? (
                      <span className="text-xs text-white/40 italic">
                        Belum ada dewan juri yang ditugaskan pada lomba ini.
                      </span>
                    ) : (
                      compAssigns.map((a) => (
                        <div
                          key={a.id}
                          className="pl-3 pr-2 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs text-white"
                        >
                          <span>{a.juryName || a.juryId}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="p-1 rounded-md hover:bg-rose-500/20 text-rose-300"
                            title="Hapus Penugasan Juri"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 4: KRITERIA & BOBOT PENILAIAN */}
      {/* ============================================================================== */}
      {subTab === 'criteria' && (
        <div className="space-y-4">
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
                    <td className="p-3.5 text-right space-x-1">
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
                        onClick={() => handleDeleteCriterion(crit.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                        title="Nonaktifkan Kriteria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Form Tambah / Edit Kriteria */}
          {isCriteriaModalOpen && editingCriterion && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-white/20 p-6 shadow-2xl space-y-4 animate-scale-up">
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

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
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
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* SUBTAB 5: MONITORING PENILAIAN JURI */}
      {/* ============================================================================== */}
      {subTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00D9F5]" />
              <span>Matriks Progres Pengisian Skor Dewan Juri</span>
            </h4>
          </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {assignments
                  .filter((a) => a.isActive)
                  .map((a) => {
                    const comp = competitions.find((c) => c.id === a.competitionId);
                    const compParts = participants.filter(
                      (p) =>
                        p.competitionId === a.competitionId ||
                        p.competitionTitle?.toLowerCase() === comp?.title.toLowerCase()
                    );
                    const totalParts = compParts.length;

                    const juryScoresList = allScores.filter(
                      (s) => s.competitionId === a.competitionId && s.juryId === a.juryId
                    );
                    const draftCount = juryScoresList.filter((s) => s.status === 'draft').length;
                    const submittedCount = juryScoresList.filter((s) => s.status === 'submitted').length;
                    const lockedCount = juryScoresList.filter((s) => s.status === 'locked').length;

                    const done = submittedCount + lockedCount;
                    const percent = totalParts > 0 ? Math.round((done / totalParts) * 100) : 0;

                    return (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 font-bold text-white">
                          {comp?.title || a.competitionId}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-white">{a.juryName || a.juryId}</span>
                          <span className="text-[10px] text-white/40 block">{a.juryInstitution}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono text-white/70">{totalParts}</td>
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
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </div>
  );
};
