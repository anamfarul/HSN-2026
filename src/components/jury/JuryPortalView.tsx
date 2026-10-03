import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  LogIn, 
  LogOut, 
  User, 
  Trophy, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  Sparkles, 
  Check, 
  X, 
  ArrowLeft,
  RefreshCw,
  Phone,
  HelpCircle,
  FolderOpen,
  Info,
  Maximize2
} from 'lucide-react';
import { 
  Competition, 
  ParticipantRegistration, 
  UserProfile, 
  JuryAssignment, 
  ScoringCriterion, 
  JuryScore, 
  JuryScoreStatus 
} from '../../types';
import { 
  signInJury, 
  signOutJury, 
  getStoredJuryProfile, 
  getStoredJurySession, 
  JuryAuthSession 
} from '../../lib/juryAuthService';
import { 
  getJuryAssignments, 
  getScoringCriteria, 
  getJuryScores, 
  saveScoreDraft, 
  submitFinalScore, 
  calculateJuryTotal, 
  validateCriteriaWeights 
} from '../../lib/juryService';

interface JuryPortalViewProps {
  onBackToMain: () => void;
  competitions: Competition[];
  participants: ParticipantRegistration[];
}

export const JuryPortalView: React.FC<JuryPortalViewProps> = ({
  onBackToMain,
  competitions,
  participants,
}) => {
  // Session State
  const [session, setSession] = useState<JuryAuthSession | null>(() => getStoredJurySession());
  const [profile, setProfile] = useState<UserProfile | null>(() => getStoredJuryProfile());

  // Navigation State inside Portal
  // view: 'dashboard' | 'competition' | 'scoring'
  const [currentView, setCurrentView] = useState<'dashboard' | 'competition' | 'scoring'>('dashboard');
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data State
  const [assignments, setAssignments] = useState<JuryAssignment[]>([]);
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);
  const [juryScores, setJuryScores] = useState<JuryScore[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Scoring Form State
  const [activeScores, setActiveScores] = useState<Record<string, number>>({});
  const [activeNotes, setActiveNotes] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [scoreFeedback, setScoreFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Anonymous Mode Toggle (Requested: Identity concealment for unbiased judging)
  const [isAnonymousMode, setIsAnonymousMode] = useState<boolean>(true);
  const [participantFilter, setParticipantFilter] = useState<'ALL' | 'UNSCORED' | 'DRAFT' | 'SUBMITTED' | 'LOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load assignments and scores when logged in
  const refreshJuryData = async (juryId: string) => {
    setIsLoadingData(true);
    try {
      const allAssigns = await getJuryAssignments();
      const myAssigns = allAssigns.filter((a) => a.juryId === juryId && a.isActive);
      setAssignments(myAssigns);

      const allScores = await getJuryScores(undefined, juryId);
      setJuryScores(allScores);
    } catch (err) {
      console.warn('Refresh jury error:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (session?.profile?.id) {
      refreshJuryData(session.profile.id);
    }
  }, [session]);

  // Load criteria when competition is selected
  useEffect(() => {
    if (selectedCompId) {
      getScoringCriteria(selectedCompId).then(setCriteria);
    }
  }, [selectedCompId]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await signInJury(loginEmail, loginPassword, true);
      if (res.success && res.session) {
        setSession(res.session);
        setProfile(res.session.profile);
        setCurrentView('dashboard');
      } else {
        setLoginError(res.message || 'Login gagal. Periksa email dan kata sandi Anda.');
      }
    } catch {
      setLoginError('Terjadi kesalahan koneksi saat login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Demo Login Handler
  const handleQuickDemoLogin = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('santri2026');
  };

  // Handle Logout
  const handleLogout = async () => {
    await signOutJury();
    setSession(null);
    setProfile(null);
    setCurrentView('dashboard');
    setSelectedCompId(null);
    setSelectedParticipantId(null);
  };

  // Competitions assigned to this jury
  const assignedCompetitions = useMemo(() => {
    if (!profile) return [];
    const compIds = assignments.map((a) => a.competitionId);
    return competitions.filter((c) => compIds.includes(c.id));
  }, [competitions, assignments, profile]);

  // Participants in selected competition
  const currentCompParticipants = useMemo(() => {
    if (!selectedCompId) return [];
    return participants.filter(
      (p) =>
        p.competitionId === selectedCompId ||
        p.competitionTitle?.toLowerCase() ===
          competitions.find((c) => c.id === selectedCompId)?.title.toLowerCase()
    );
  }, [participants, selectedCompId, competitions]);

  // Currently selected competition object
  const selectedCompetition = useMemo(() => {
    return competitions.find((c) => c.id === selectedCompId);
  }, [competitions, selectedCompId]);

  // Currently selected participant object
  const selectedParticipant = useMemo(() => {
    return currentCompParticipants.find(
      (p) => p.id === selectedParticipantId || p.registrationNumber === selectedParticipantId
    );
  }, [currentCompParticipants, selectedParticipantId]);

  // Current score document for selected participant
  const currentScoreRecord = useMemo(() => {
    if (!profile || !selectedParticipantId || !selectedCompId) return null;
    return juryScores.find(
      (s) =>
        s.competitionId === selectedCompId &&
        s.juryId === profile.id &&
        (s.participantId === selectedParticipantId ||
          s.participantId === selectedParticipant?.registrationNumber ||
          s.participantId === selectedParticipant?.id)
    );
  }, [juryScores, profile, selectedParticipantId, selectedCompId, selectedParticipant]);

  // When opening scoring form, populate active scores
  const openScoringForm = (partId: string) => {
    setSelectedParticipantId(partId);
    setScoreFeedback(null);
    const existing = juryScores.find(
      (s) =>
        s.competitionId === selectedCompId &&
        s.juryId === profile?.id &&
        (s.participantId === partId ||
          s.participantId === participants.find((p) => p.id === partId)?.registrationNumber)
    );

    if (existing) {
      setActiveScores({ ...existing.scores });
      setActiveNotes(existing.notes || '');
    } else {
      setActiveScores({});
      setActiveNotes('');
    }
    setCurrentView('scoring');
  };

  // Calculate live weighted total
  const liveTotalScore = useMemo(() => {
    return calculateJuryTotal(activeScores, criteria);
  }, [activeScores, criteria]);

  // Save Draft Handler
  const handleSaveDraft = async () => {
    if (!profile || !selectedParticipant || !selectedCompId) return;
    setIsSubmittingScore(true);
    setScoreFeedback(null);

    try {
      const res = await saveScoreDraft({
        juryId: profile.id,
        participantId: selectedParticipant.id || selectedParticipant.registrationNumber,
        competitionId: selectedCompId,
        scores: activeScores,
        notes: activeNotes,
        juryName: profile.fullName,
        participantName: isAnonymousMode ? `Peserta #${selectedParticipant.registrationNumber}` : selectedParticipant.fullName,
      });

      if (res.success && res.data) {
        setScoreFeedback({ type: 'success', message: 'Draf nilai berhasil disimpan!' });
        await refreshJuryData(profile.id);
        setTimeout(() => setScoreFeedback(null), 3000);
      } else {
        setScoreFeedback({ type: 'error', message: res.message || 'Gagal menyimpan draf.' });
      }
    } catch {
      setScoreFeedback({ type: 'error', message: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Submit Final Score Handler
  const handleSubmitFinal = async () => {
    if (!profile || !selectedParticipant || !selectedCompId) return;
    setIsSubmittingScore(true);
    setScoreFeedback(null);

    try {
      const res = await submitFinalScore({
        juryId: profile.id,
        participantId: selectedParticipant.id || selectedParticipant.registrationNumber,
        competitionId: selectedCompId,
        scores: activeScores,
        notes: activeNotes,
        juryName: profile.fullName,
        participantName: isAnonymousMode ? `Peserta #${selectedParticipant.registrationNumber}` : selectedParticipant.fullName,
      });

      if (res.success && res.data) {
        setShowConfirmSubmit(false);
        setScoreFeedback({ type: 'success', message: 'Nilai final resmi terkirim ke panitia!' });
        await refreshJuryData(profile.id);
        setTimeout(() => setScoreFeedback(null), 3500);
      } else {
        setShowConfirmSubmit(false);
        setScoreFeedback({ type: 'error', message: res.message || 'Gagal mengirim nilai final.' });
      }
    } catch {
      setShowConfirmSubmit(false);
      setScoreFeedback({ type: 'error', message: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Navigate Previous / Next Participant in Scoring Form
  const currentParticipantIndex = useMemo(() => {
    return currentCompParticipants.findIndex(
      (p) => p.id === selectedParticipantId || p.registrationNumber === selectedParticipantId
    );
  }, [currentCompParticipants, selectedParticipantId]);

  const handlePrevParticipant = () => {
    if (currentParticipantIndex > 0) {
      const prev = currentCompParticipants[currentParticipantIndex - 1];
      openScoringForm(prev.id);
    }
  };

  const handleNextParticipant = () => {
    if (currentParticipantIndex < currentCompParticipants.length - 1) {
      const next = currentCompParticipants[currentParticipantIndex + 1];
      openScoringForm(next.id);
    }
  };

  // Status badge helper for participant list
  const getParticipantStatus = (p: ParticipantRegistration) => {
    const sc = juryScores.find(
      (s) =>
        s.competitionId === selectedCompId &&
        s.juryId === profile?.id &&
        (s.participantId === p.id || s.participantId === p.registrationNumber)
    );
    if (!sc) return { status: 'UNSCORED', label: 'Belum Dinilai', color: 'bg-white/10 text-white/60 border-white/20' };
    if (sc.status === 'locked') return { status: 'LOCKED', label: 'Terkunci', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    if (sc.status === 'submitted') return { status: 'SUBMITTED', label: 'Sudah Dikirim', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    return { status: 'DRAFT', label: 'Draf Tersimpan', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
  };

  // Filtered participants list
  const filteredParticipants = useMemo(() => {
    return currentCompParticipants.filter((p) => {
      const s = getParticipantStatus(p);
      if (participantFilter !== 'ALL' && s.status !== participantFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchReg = (p.registrationNumber || '').toLowerCase().includes(q);
        const matchTitle = (p.workTitle || '').toLowerCase().includes(q);
        const matchName = !isAnonymousMode && (p.fullName || '').toLowerCase().includes(q);
        const matchInst = !isAnonymousMode && (p.institution || '').toLowerCase().includes(q);
        if (!matchReg && !matchTitle && !matchName && !matchInst) return false;
      }
      return true;
    });
  }, [currentCompParticipants, participantFilter, searchQuery, isAnonymousMode, juryScores, selectedCompId, profile]);

  // Overall Statistics for this jury
  const overallStats = useMemo(() => {
    let totalAssignedParts = 0;
    let totalScored = 0;
    let totalDrafts = 0;
    let totalLocked = 0;

    for (const comp of assignedCompetitions) {
      const compParts = participants.filter(
        (p) =>
          p.competitionId === comp.id ||
          p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
      );
      totalAssignedParts += compParts.length;

      for (const p of compParts) {
        const sc = juryScores.find(
          (s) =>
            s.competitionId === comp.id &&
            s.juryId === profile?.id &&
            (s.participantId === p.id || s.participantId === p.registrationNumber)
        );
        if (sc?.status === 'submitted') totalScored++;
        if (sc?.status === 'draft') totalDrafts++;
        if (sc?.status === 'locked') totalLocked++;
      }
    }

    const completedTotal = totalScored + totalLocked;
    const progressPercent = totalAssignedParts > 0 ? Math.round((completedTotal / totalAssignedParts) * 100) : 0;

    return {
      totalCompetitions: assignedCompetitions.length,
      totalAssignedParts,
      completedTotal,
      totalDrafts,
      progressPercent,
    };
  }, [assignedCompetitions, participants, juryScores, profile]);

  // ==============================================================================
  // VIEW: IF NOT LOGGED IN -> LOGIN VIEW
  // ==============================================================================
  if (!session || !profile) {
    return (
      <div className="min-h-screen bg-[#020e19] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient Lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#006B4F]/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-[#00D9F5]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 pt-2">
          <button
            onClick={onBackToMain}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Website Festival</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-[#F2C96D] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>PORTAL RESMI DEWAN JURI HSN 2026</span>
          </div>
        </div>

        {/* Center Login Box */}
        <div className="max-w-md w-full mx-auto my-auto z-10 py-8">
          <div className="rounded-3xl bg-[#031525]/90 border border-[#00D9F5]/30 p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006B4F] to-[#00D9F5] mx-auto flex items-center justify-center text-white shadow-lg mb-3">
                <Trophy className="w-8 h-8 text-[#F2C96D]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#00D9F5] block">
                FESTIVAL HARI SANTRI NASIONAL 2026
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Portal Penilaian Juri
              </h2>
              <p className="text-xs text-[#DDE7E8]/70 mt-1">
                Silakan masuk menggunakan akun juri yang telah terdaftar di sistem panitia
              </p>
            </div>

            {loginError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#DDE7E8] mb-1.5">
                  Email Akun Juri
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="juri.fauzan@hsnponcokusumo.nu"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white text-xs outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DDE7E8] mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white text-xs outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#006B4F] via-[#008F72] to-[#00D9F5] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Portal Penilaian</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <span className="text-[11px] font-bold text-[#F2C96D] block mb-2">
                Akses Cepat Pengujian Dewan Juri (Demo):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('juri.fauzan@hsnponcokusumo.nu')}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[11px] text-[#DDE7E8] transition-colors flex items-center justify-between"
                >
                  <span className="font-semibold text-white">1. Ust. Ahmad Fauzan, M.Pd.</span>
                  <span className="text-[10px] text-[#00D9F5]">Isi Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('juri.lutfiah@hsnponcokusumo.nu')}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[11px] text-[#DDE7E8] transition-colors flex items-center justify-between"
                >
                  <span className="font-semibold text-white">2. Ning Hj. Lutfiah Zahra, S.Sn.</span>
                  <span className="text-[10px] text-[#00D9F5]">Isi Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('juri.ridwan@hsnponcokusumo.nu')}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[11px] text-[#DDE7E8] transition-colors flex items-center justify-between"
                >
                  <span className="font-semibold text-white">3. K.H. Dr. Ridwan Asy’ari, M.Hum.</span>
                  <span className="text-[10px] text-[#00D9F5]">Isi Email</span>
                </button>
              </div>
              <p className="text-[10px] text-white/40 mt-2 italic text-center">
                Kata sandi demo: <code className="text-[#00D9F5]">santri2026</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Contact Helpdesk */}
        <div className="max-w-md mx-auto text-center text-[11px] text-white/50 z-10 pb-2">
          Mengalami kendala akun dewan juri? Hubungi Panitia Sekretariat HSN di{' '}
          <a
            href="https://wa.me/6285731194085"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D9F5] hover:underline"
          >
            0857-3119-4085
          </a>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // VIEW: LOGGED IN PORTAL (NAVBAR, STATS, TABS)
  // ==============================================================================
  return (
    <div className="min-h-screen bg-[#020e19] text-[#DDE7E8] font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#031525]/95 border-b border-white/10 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMain}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#006B4F] text-white">
                  PORTAL JURI
                </span>
                <span className="text-xs text-white font-bold hidden sm:inline">
                  Festival HSN 2026
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white">
                {profile.fullName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Institution Badge */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-white/50 font-bold uppercase">Lembaga</span>
              <span className="text-xs text-[#F2C96D] font-medium truncate max-w-[200px]">
                {profile.institution || 'MWC NU Poncokusumo'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* SUBVIEW 1: JURY DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Banner & Overall Progress */}
            <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#006B4F]/40 via-[#031525] to-[#022238] border border-[#00D9F5]/30 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D9F5]/20 text-[#00D9F5] text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Selamat Bertugas, Dewan Juri Terhormat</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Dashboard Penilaian Karya Santri
                  </h2>
                  <p className="text-xs sm:text-sm text-[#DDE7E8]/80 mt-1 max-w-2xl leading-relaxed">
                    Anda ditugaskan pada <strong className="text-[#F2C96D]">{assignedCompetitions.length} cabang perlombaan</strong>. Mohon berikan penilaian secara objektif, amanah, dan berlandaskan kriteria teknis yang telah ditetapkan panitia.
                  </p>
                </div>

                {/* Overall Score Progress Radial/Card */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shrink-0 min-w-[220px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/70">Progres Penilaian Saya</span>
                    <span className="text-sm font-black text-[#00D9F5]">{overallStats.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#006B4F] to-[#00D9F5] transition-all duration-500"
                      style={{ width: `${overallStats.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>{overallStats.completedTotal} Selesai</span>
                    <span>{overallStats.totalAssignedParts} Total Peserta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#031525] border border-white/10">
                <span className="text-[11px] text-white/50 block font-bold uppercase">Lomba Ditugaskan</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {overallStats.totalCompetitions}
                </span>
                <span className="text-[10px] text-[#00D9F5]">Cabang Festival</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#031525] border border-white/10">
                <span className="text-[11px] text-white/50 block font-bold uppercase">Total Peserta</span>
                <span className="text-2xl font-black text-[#F2C96D] mt-1 block">
                  {overallStats.totalAssignedParts}
                </span>
                <span className="text-[10px] text-white/50">Wajib Dinilai</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#031525] border border-white/10">
                <span className="text-[11px] text-white/50 block font-bold uppercase">Draf Nilai</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">
                  {overallStats.totalDrafts}
                </span>
                <span className="text-[10px] text-amber-300/80">Belum Dikirim</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#031525] border border-white/10">
                <span className="text-[11px] text-white/50 block font-bold uppercase">Nilai Terkirim</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {overallStats.completedTotal}
                </span>
                <span className="text-[10px] text-emerald-300/80">Final & Sah</span>
              </div>
            </div>

            {/* List of Assigned Competitions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#F2C96D]" />
                  <span>Cabang Perlombaan yang Ditugaskan Kepada Anda:</span>
                </h3>
              </div>

              {assignedCompetitions.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#031525] border border-white/10">
                  <FolderOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white">Belum Ada Penugasan Lomba</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Sekretariat Utama belum memasukkan nama Anda pada penugasan cabang lomba. Silakan hubungi admin panitia.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assignedCompetitions.map((comp) => {
                    const compParts = participants.filter(
                      (p) =>
                        p.competitionId === comp.id ||
                        p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
                    );
                    const scoredCount = compParts.filter((p) => {
                      const sc = juryScores.find(
                        (s) =>
                          s.competitionId === comp.id &&
                          s.juryId === profile.id &&
                          (s.participantId === p.id || s.participantId === p.registrationNumber)
                      );
                      return sc?.status === 'submitted' || sc?.status === 'locked';
                    }).length;

                    const percent = compParts.length > 0 ? Math.round((scoredCount / compParts.length) * 100) : 0;

                    return (
                      <div
                        key={comp.id}
                        className="rounded-3xl p-6 bg-[#031525] border border-white/10 hover:border-[#00D9F5]/40 transition-all flex flex-col justify-between shadow-xl group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F]/30 text-[#00D9F5] border border-[#006B4F]">
                              {comp.category}
                            </span>
                            <span className="text-[11px] font-mono text-white/50">
                              {comp.code || comp.id}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-white group-hover:text-[#00D9F5] transition-colors leading-snug">
                            {comp.title}
                          </h4>

                          <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                            {comp.description}
                          </p>

                          {/* Progress in this competition */}
                          <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-white/70 font-semibold">Progres Penilaian</span>
                              <span className="font-bold text-[#F2C96D]">{percent}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#006B4F] to-[#00D9F5]"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/50 mt-1.5">
                              <span>{scoredCount} Selesai</span>
                              <span>{compParts.length} Peserta Terdaftar</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompId(comp.id);
                            setCurrentView('competition');
                          }}
                          className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                        >
                          <span>Buka Lembar Penilaian Peserta</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBVIEW 2: PARTICIPANTS IN SELECTED COMPETITION */}
        {currentView === 'competition' && selectedCompetition && (
          <div className="space-y-6">
            {/* Breadcrumb & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar Lomba</span>
              </button>

              {/* Mode Anonim Toggle (Requested for unbiased scoring) */}
              <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#031525] border border-white/15">
                <span className="text-xs font-bold text-white/80">Mode Penilaian:</span>
                <button
                  type="button"
                  onClick={() => setIsAnonymousMode(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    isAnonymousMode
                      ? 'bg-[#006B4F] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Sembunyikan nama santri & nama lembaga untuk objektivitas penilaian"
                >
                  🔒 Mode Anonim
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnonymousMode(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    !isAnonymousMode
                      ? 'bg-[#00D9F5]/30 text-[#00D9F5] border border-[#00D9F5]/40 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Tampilkan identitas nama lengkap & asal lembaga peserta"
                >
                  Identitas Terbuka
                </button>
              </div>
            </div>

            {/* Competition Header Card */}
            <div className="rounded-3xl p-6 bg-[#031525] border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F] text-white">
                    {selectedCompetition.category}
                  </span>
                  <span className="text-xs font-mono text-[#00D9F5]">
                    Kode: {selectedCompetition.code || selectedCompetition.id}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {selectedCompetition.title}
                </h2>
                <p className="text-xs text-[#DDE7E8]/70 mt-1">
                  Kriteria aktif: {criteria.filter((c) => c.isActive).length} parameter | Total Bobot: 100%
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/70">
                  Total Peserta: <strong className="text-[#F2C96D]">{currentCompParticipants.length}</strong>
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    isAnonymousMode
                      ? 'Cari no. registrasi atau judul karya...'
                      : 'Cari no. reg, nama peserta, lembaga...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#031525] border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00D9F5]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setParticipantFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    participantFilter === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Semua ({currentCompParticipants.length})
                </button>
                <button
                  onClick={() => setParticipantFilter('UNSCORED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    participantFilter === 'UNSCORED'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Belum Dinilai
                </button>
                <button
                  onClick={() => setParticipantFilter('DRAFT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    participantFilter === 'DRAFT'
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Draf
                </button>
                <button
                  onClick={() => setParticipantFilter('SUBMITTED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    participantFilter === 'SUBMITTED'
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Sudah Dikirim
                </button>
              </div>
            </div>

            {/* Participants Table / Mobile Cards */}
            {filteredParticipants.length === 0 ? (
              <div className="p-10 rounded-3xl bg-[#031525] border border-white/10 text-center">
                <p className="text-sm font-semibold text-white/60">
                  Tidak ada peserta ditemukan pada filter ini.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-[#031525] border border-white/10 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#DDE7E8]">
                    <thead className="bg-white/5 text-white/70 uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-4">No. Registrasi</th>
                        <th className="p-4">
                          {isAnonymousMode ? 'Kode Anonim Peserta' : 'Nama Peserta & Lembaga'}
                        </th>
                        <th className="p-4">Karya Peserta</th>
                        <th className="p-4 text-center">Status Nilai Saya</th>
                        <th className="p-4 text-center">Skor Saya</th>
                        <th className="p-4 text-right">Aksi Penjurian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredParticipants.map((p) => {
                        const statusObj = getParticipantStatus(p);
                        const myScore = juryScores.find(
                          (s) =>
                            s.competitionId === selectedCompId &&
                            s.juryId === profile.id &&
                            (s.participantId === p.id || s.participantId === p.registrationNumber)
                        );

                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Reg Number */}
                            <td className="p-4 font-mono font-bold text-[#00D9F5]">
                              {p.registrationNumber}
                            </td>

                            {/* Participant Name or Anonymous */}
                            <td className="p-4">
                              {isAnonymousMode ? (
                                <div>
                                  <span className="font-bold text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Peserta #{p.registrationNumber?.split('-').slice(-2).join('-')}
                                  </span>
                                  <span className="text-[10px] text-white/40 block mt-0.5">
                                    Identitas dirahasiakan (Mode Anonim)
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-white block">{p.fullName}</span>
                                  <span className="text-[11px] text-[#F2C96D] block">{p.institution}</span>
                                </div>
                              )}
                            </td>

                            {/* Work Link / Title */}
                            <td className="p-4">
                              {p.workFileUrl || p.workDriveUrl ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-white truncate max-w-[200px]">
                                    {p.workFileName || p.workTitle || 'File Karya Santri'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.workFileUrl && (
                                      <a
                                        href={p.workFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-[#00D9F5] hover:underline"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Buka File</span>
                                      </a>
                                    )}
                                    {p.workDriveUrl && (
                                      <a
                                        href={p.workDriveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Google Drive</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-white/40 italic">
                                  Belum mengunggah berkas
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusObj.color}`}
                              >
                                {statusObj.label}
                              </span>
                            </td>

                            {/* Score */}
                            <td className="p-4 text-center font-bold font-mono text-sm">
                              {myScore ? (
                                <span className="text-[#F2C96D]">{myScore.totalScore.toFixed(2)}</span>
                              ) : (
                                <span className="text-white/30">-</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="p-4 text-right">
                              {statusObj.status === 'LOCKED' ? (
                                <button
                                  type="button"
                                  onClick={() => openScoringForm(p.id)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-500/30 transition-all inline-flex items-center gap-1"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Lihat Nilai (Terkunci)</span>
                                </button>
                              ) : statusObj.status === 'SUBMITTED' ? (
                                <button
                                  type="button"
                                  onClick={() => openScoringForm(p.id)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-all inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Lihat Nilai Final</span>
                                </button>
                              ) : statusObj.status === 'DRAFT' ? (
                                <button
                                  type="button"
                                  onClick={() => openScoringForm(p.id)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-[#020e19] font-black text-xs hover:bg-amber-400 transition-all inline-flex items-center gap-1 shadow-md active:scale-95"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Lanjutkan Draf</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openScoringForm(p.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#00D9F5] text-white font-bold text-xs hover:opacity-90 transition-all inline-flex items-center gap-1 shadow-md active:scale-95"
                                >
                                  <Trophy className="w-3 h-3 text-[#F2C96D]" />
                                  <span>Beri Nilai</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 3: SCORING FORM FOR SELECTED PARTICIPANT */}
        {currentView === 'scoring' && selectedParticipant && selectedCompetition && (
          <div className="space-y-6">
            {/* Header & Participant Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentView('competition')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar Peserta</span>
              </button>

              {/* Prev / Next Nav Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentParticipantIndex <= 0}
                  onClick={handlePrevParticipant}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Peserta Sebelumnya</span>
                </button>
                <span className="text-xs text-white/50 px-2 font-mono">
                  {currentParticipantIndex + 1} / {currentCompParticipants.length}
                </span>
                <button
                  type="button"
                  disabled={currentParticipantIndex >= currentCompParticipants.length - 1}
                  onClick={handleNextParticipant}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition-all flex items-center gap-1"
                >
                  <span>Peserta Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Score Feedback Notification */}
            {scoreFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg ${
                  scoreFeedback.type === 'success'
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-200'
                    : 'bg-rose-950 border border-rose-500 text-rose-200'
                }`}
              >
                {scoreFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{scoreFeedback.message}</span>
              </div>
            )}

            {/* Read-Only Warning if Locked or Submitted */}
            {currentScoreRecord?.status === 'locked' && (
              <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Nilai pada peserta ini telah <strong>DIKUNCI OLEH PANITIA</strong>. Formulir berada dalam mode hanya-baca (read-only).
                </span>
              </div>
            )}

            {currentScoreRecord?.status === 'submitted' && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Nilai final peserta ini telah <strong>RESMI DIKIRIM</strong> pada {currentScoreRecord.submittedAt ? new Date(currentScoreRecord.submittedAt).toLocaleString('id-ID') : 'sidang juri'}. Jika ada perbaikan, mintalah Sekretariat Utama membuka draf kembali.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Participant & Work Details (5 Cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="rounded-3xl p-6 bg-[#031525] border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D9F5]">
                      INFORMASI PESERTA LOMBA
                    </span>
                    <span className="text-xs font-mono font-bold text-[#F2C96D]">
                      {selectedParticipant.registrationNumber}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">
                      {isAnonymousMode ? (
                        <span>Peserta #{selectedParticipant.registrationNumber}</span>
                      ) : (
                        <span>{selectedParticipant.fullName}</span>
                      )}
                    </h3>
                    {!isAnonymousMode && (
                      <p className="text-xs text-[#00D9F5] font-semibold mt-0.5">
                        {selectedParticipant.institution}
                      </p>
                    )}
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F] text-white">
                      {selectedCompetition.title}
                    </span>
                  </div>

                  {/* Work Submission Box */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-[#F2C96D]" />
                      <span>Berkas / Karya Peserta:</span>
                    </span>

                    {selectedParticipant.workTitle && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-white/50 block font-bold">Judul Karya:</span>
                        <span className="text-xs font-bold text-white block mt-0.5">
                          {selectedParticipant.workTitle}
                        </span>
                      </div>
                    )}

                    {selectedParticipant.workNotes && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-white/50 block font-bold">Deskripsi / Konsep:</span>
                        <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                          {selectedParticipant.workNotes}
                        </p>
                      </div>
                    )}

                    {/* Action Links to Open Media */}
                    <div className="flex flex-col gap-2 pt-1">
                      {selectedParticipant.workFileUrl ? (
                        <a
                          href={selectedParticipant.workFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 border border-[#00D9F5]/50 text-[#00D9F5] text-xs font-bold flex items-center justify-between transition-all"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Eye className="w-4 h-4 shrink-0" />
                            <span>Buka Berkas File Karya</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : null}

                      {selectedParticipant.workDriveUrl ? (
                        <a
                          href={selectedParticipant.workDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between transition-all"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span>Buka Google Drive Karya</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : null}

                      {!selectedParticipant.workFileUrl && !selectedParticipant.workDriveUrl && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/50">
                          Peserta belum menyertakan berkas tautan karya digital. Penilaian didasarkan pada penampilan langsung di panggung festival.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Scoring Form Inputs (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="rounded-3xl p-6 sm:p-7 bg-[#031525] border border-white/10 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Formulir Kriteria & Rubrik Penilaian
                      </h4>
                      <p className="text-xs text-white/60 mt-0.5">
                        Masukkan nilai murni (0 - nilai maksimal). Bobot akan dikalkulasi otomatis.
                      </p>
                    </div>

                    {/* Live Score Display */}
                    <div className="text-right">
                      <span className="text-[10px] text-white/50 font-bold uppercase block">
                        Total Nilai Berbobot
                      </span>
                      <span className="text-2xl font-black font-mono text-[#F2C96D]">
                        {liveTotalScore.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/40 block">dari 100.00</span>
                    </div>
                  </div>

                  {/* List of Criteria Sliders/Inputs */}
                  <div className="space-y-5">
                    {criteria
                      .filter((c) => c.isActive)
                      .map((crit, idx) => {
                        const currentVal = activeScores[crit.id] ?? '';
                        const bounded = currentVal === '' ? 0 : Number(currentVal);
                        const weightedPart = (bounded / (crit.maxScore || 100)) * crit.weight;
                        const isReadOnly = currentScoreRecord?.status === 'submitted' || currentScoreRecord?.status === 'locked';

                        return (
                          <div
                            key={crit.id}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div>
                                <span className="text-xs font-bold text-white">
                                  {idx + 1}. {crit.criterionName}
                                </span>
                                {crit.description && (
                                  <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                                    {crit.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006B4F]/30 text-[#00D9F5] border border-[#006B4F]">
                                  Bobot {crit.weight}%
                                </span>
                                <span className="text-[10px] text-white/40 font-mono">
                                  Maks: {crit.maxScore}
                                </span>
                              </div>
                            </div>

                            {/* Input Field & Slider */}
                            <div className="flex items-center gap-4 pt-1">
                              <input
                                type="range"
                                min={0}
                                max={crit.maxScore}
                                step={1}
                                disabled={isReadOnly}
                                value={currentVal === '' ? 0 : currentVal}
                                onChange={(e) => {
                                  if (isReadOnly) return;
                                  setActiveScores({
                                    ...activeScores,
                                    [crit.id]: Number(e.target.value),
                                  });
                                }}
                                className="flex-1 accent-[#00D9F5] cursor-pointer disabled:cursor-not-allowed"
                              />

                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  max={crit.maxScore}
                                  disabled={isReadOnly}
                                  value={currentVal}
                                  placeholder="0"
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    setActiveScores({
                                      ...activeScores,
                                      [crit.id]: Math.max(0, Math.min(crit.maxScore, val)),
                                    });
                                  }}
                                  className="w-16 px-2.5 py-1.5 rounded-xl bg-[#020e19] border border-white/20 text-center font-mono font-bold text-white text-xs focus:border-[#00D9F5] outline-none disabled:bg-white/5"
                                />
                                <span className="text-[10px] font-mono text-white/40">
                                  = {weightedPart.toFixed(1)} pt
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Catatan Evaluasi & Rekomendasi Juri:
                    </label>
                    <textarea
                      rows={3}
                      disabled={currentScoreRecord?.status === 'submitted' || currentScoreRecord?.status === 'locked'}
                      value={activeNotes}
                      onChange={(e) => setActiveNotes(e.target.value)}
                      placeholder="Tuliskan catatan apresiasi, kelebihan karya, atau saran perbaikan bagi santri..."
                      className="w-full p-3 rounded-xl bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-xs text-white placeholder-white/40 outline-none transition-all disabled:bg-white/5"
                    />
                  </div>

                  {/* Action Buttons */}
                  {currentScoreRecord?.status !== 'submitted' && currentScoreRecord?.status !== 'locked' ? (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSubmittingScore}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>Simpan Sebagai Draf</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowConfirmSubmit(true)}
                        disabled={isSubmittingScore}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#006B4F] via-[#008F72] to-[#00D9F5] hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim Nilai Final</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Confirmation Dialog before Submitting Final */}
            {showConfirmSubmit && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-3xl bg-[#031525] border border-[#00D9F5]/40 p-6 shadow-2xl space-y-4 animate-scale-up">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#006B4F] flex items-center justify-center text-white shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        Konfirmasi Pengiriman Nilai Final
                      </h4>
                      <p className="text-xs text-white/60">
                        Festival Hari Santri Nasional 2026
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#DDE7E8] leading-relaxed">
                    Pastikan seluruh nilai telah diperiksa dengan seksama. Setelah dikirim, nilai berstatus <strong>Final</strong> dan tidak dapat diubah kembali kecuali dibuka oleh administrator panitia.
                  </p>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/70 font-semibold">Total Nilai Final:</span>
                    <span className="font-mono font-black text-lg text-[#F2C96D]">
                      {liveTotalScore.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmSubmit(false)}
                      disabled={isSubmittingScore}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitFinal}
                      disabled={isSubmittingScore}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white transition-all flex items-center gap-1.5 shadow-md"
                    >
                      {isSubmittingScore ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Ya, Kirim Resmi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
