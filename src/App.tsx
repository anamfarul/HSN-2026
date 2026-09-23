/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CountdownSection } from './components/CountdownSection';
import { IntroStatsSection } from './components/IntroStatsSection';
import { FivePillarsSection } from './components/FivePillarsSection';
import { SignatureProgramsSection } from './components/SignatureProgramsSection';
import { CompetitionsSection } from './components/CompetitionsSection';
import { EventTimelineSection } from './components/EventTimelineSection';
import { DownloadCenterSection } from './components/DownloadCenterSection';
import { SponsorshipSection } from './components/SponsorshipSection';
import { NewsSection } from './components/NewsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { RegistrationModal } from './components/RegistrationModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { WorkSubmissionModal } from './components/WorkSubmissionModal';

import { COMPETITIONS, DOWNLOAD_DOCUMENTS, INITIAL_STATS } from './data/initialData';
import { Competition, CategoryGeneration, ParticipantRegistration } from './types';
import { 
  fetchCompetitionsFromSupabase, 
  insertCompetitionToSupabase, 
  updateCompetitionInSupabase, 
  deleteCompetitionFromSupabase,
  fetchParticipantsFromSupabase,
  fetchAdminUsersFromSupabase,
  updateParticipantStatusInSupabase,
  deleteParticipantFromSupabase,
  updateParticipantWorkInSupabase,
  purgeMockParticipantsFromSupabase,
  isSupabaseConnected,
  saveSupabaseCredentials
} from './lib/supabaseClient';
import { saveRegisteredAdminUsers, isUserDeleted } from './data/initialUsers';
import { Sparkles, MessageCircle, Shield, UploadCloud } from 'lucide-react';

const DELETED_COMPETITIONS_KEY = 'hsn2026_deleted_competitions_v1';
const CUSTOM_COMPETITIONS_KEY = 'hsn2026_custom_competitions_v1';
const PARTICIPANTS_STORAGE_KEY = 'hsn2026_participants';

// Pemeriksa data dummy awal peserta yang dihapus permanen
const isInitialMockParticipant = (p: any): boolean => {
  if (!p) return false;
  const id = String(p.id || '').toLowerCase();
  const regNo = String(p.registrationNumber || p.registration_number || '').toUpperCase();
  const fullName = String(p.fullName || p.full_name || '').toLowerCase();

  return (
    id.startsWith('reg-00') ||
    regNo.startsWith('HSN-2026-00') ||
    regNo.startsWith('HSN26-SMP-0001') ||
    regNo.startsWith('HSN26-SMA-0002') ||
    regNo.startsWith('HSN26-IPNU-0003') ||
    regNo.startsWith('HSN26-FAT-0004') ||
    regNo.startsWith('HSN26-PAUD-0005') ||
    fullName.includes('ahmad faiz al-hafidz') ||
    fullName.includes('siti nur khadijah') ||
    fullName.includes('rizki bayu pratama') ||
    fullName.includes('umi kalsum') ||
    fullName.includes('muhammad bilal ramadhan') ||
    fullName.includes('ahmad fauzi rabbani') ||
    fullName.includes('siti maryam azzahra') ||
    fullName.includes('m. rizqi maulana')
  );
};

const getStoredCleanParticipants = (): ParticipantRegistration[] => {
  try {
    const raw = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((p) => !isInitialMockParticipant(p));
    // Simpan ulang versi bersih jika sebelumnya terdapat data dummy
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

const saveCleanParticipantsToStorage = (list: ParticipantRegistration[]) => {
  try {
    const cleaned = list.filter((p) => !isInitialMockParticipant(p));
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
};

const getDeletedCompIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_COMPETITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getCustomCompetitions = (): Competition[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_COMPETITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markCompetitionDeleted = (id: string) => {
  try {
    const deleted = getDeletedCompIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_COMPETITIONS_KEY, JSON.stringify(deleted));
    }
  } catch {}
};

export default function App() {
  // Modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [selectedRegNumberForWork, setSelectedRegNumberForWork] = useState<string | undefined>(undefined);
  
  // Registration selection context
  const [registerCategory, setRegisterCategory] = useState<CategoryGeneration>('SMP/MTs');
  const [registerCompetition, setRegisterCompetition] = useState<Competition | null>(null);

  // App data state (allowing real-time interaction in CMS)
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    const deleted = getDeletedCompIds();
    const custom = getCustomCompetitions();
    const combined = [...custom, ...COMPETITIONS.filter((c) => !custom.some((cust) => cust.id === c.id))];
    return combined.filter((c) => !deleted.includes(c.id));
  });
  // Dimulai dari 0 data dummy (hanya peserta riil dari storage lokal / Supabase)
  const [participants, setParticipants] = useState<ParticipantRegistration[]>(() => {
    return getStoredCleanParticipants();
  });
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);
  const [supabaseLoading, setSupabaseLoading] = useState(false);

  // Deteksi sinkronisasi otomatis dari URL params / hash (misal dari tautan Vercel Setup)
  useEffect(() => {
    try {
      const currentUrl = new URL(window.location.href);
      const hash = window.location.hash || '';

      let targetUrl = currentUrl.searchParams.get('supabase_url') || currentUrl.searchParams.get('su');
      let targetKey = currentUrl.searchParams.get('supabase_key') || currentUrl.searchParams.get('sk');

      if ((!targetUrl || !targetKey) && hash.includes('setup-supabase')) {
        const hashQuery = hash.split('?')[1];
        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          targetUrl = hashParams.get('url') || hashParams.get('su');
          targetKey = hashParams.get('key') || hashParams.get('sk');
        }
      }

      if (targetUrl && targetKey) {
        saveSupabaseCredentials(targetUrl, targetKey);
        setIsSupabaseLive(true);
        // Hapus kredensial dari address bar agar rapi dan aman
        currentUrl.searchParams.delete('supabase_url');
        currentUrl.searchParams.delete('supabase_key');
        currentUrl.searchParams.delete('su');
        currentUrl.searchParams.delete('sk');
        const cleanPath = currentUrl.pathname + (currentUrl.searchParams.toString() ? '?' + currentUrl.searchParams.toString() : '');
        window.history.replaceState({}, document.title, cleanPath);
        window.dispatchEvent(new Event('supabase_credentials_updated'));
      }
    } catch {}
  }, []);

  // Fetch live competitions, participants & admin users from Supabase
  const loadDataFromSupabase = async () => {
    const connected = isSupabaseConnected();
    setIsSupabaseLive(connected);

    try {
      // 1. Cabang Lomba
      const { data: remoteComps } = await fetchCompetitionsFromSupabase();
      if (remoteComps && remoteComps.length > 0) {
        const deleted = getDeletedCompIds();
        setCompetitions(remoteComps.filter((c) => !deleted.includes(c.id)));
        setIsSupabaseLive(true);
      }

      // 2. Peserta Pendaftar
      const { data: remoteParticipants } = await fetchParticipantsFromSupabase();
      if (remoteParticipants) {
        // Filter ketat agar data dummy awal tidak pernah muncul kembali
        const cleanRemote = remoteParticipants.filter((p) => !isInitialMockParticipant(p));
        setParticipants(cleanRemote);
        saveCleanParticipantsToStorage(cleanRemote);

        // Jika Supabase masih menyimpan data dummy contoh, bersihkan otomatis di database
        const hasDummyInRemote = remoteParticipants.some((p) => isInitialMockParticipant(p));
        if (hasDummyInRemote) {
          purgeMockParticipantsFromSupabase().catch(console.warn);
        }
      }

      // 3. User Panitia
      const { data: remoteUsers } = await fetchAdminUsersFromSupabase();
      if (remoteUsers && remoteUsers.length > 0) {
        try {
          const validUsers = remoteUsers.filter((u) => !isUserDeleted(u.id, u.username));
          saveRegisteredAdminUsers(validUsers);
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Supabase fetch note:', err);
    } finally {
      setSupabaseLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();

    const handleCredentialsUpdated = () => {
      loadDataFromSupabase();
    };
    window.addEventListener('supabase_credentials_updated', handleCredentialsUpdated);

    return () => {
      window.removeEventListener('supabase_credentials_updated', handleCredentialsUpdated);
    };
  }, []);

  // Handlers
  const handleOpenRegister = () => {
    setRegisterCompetition(null);
    setIsRegisterModalOpen(true);
  };

  const handleSelectCategoryForRegister = (cat: CategoryGeneration) => {
    setRegisterCategory(cat);
    setRegisterCompetition(null);
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSpecificCompetition = (comp: Competition) => {
    setRegisterCategory(comp.category);
    setRegisterCompetition(comp);
    setIsRegisterModalOpen(true);
  };

  const handleSuccessRegister = (newRecord: ParticipantRegistration) => {
    setParticipants((prev) => {
      const updated = [newRecord, ...prev];
      saveCleanParticipantsToStorage(updated);
      return updated;
    });
  };

  const handleUpdateParticipantStatus = (
    id: string,
    status: 'Terverifikasi' | 'Menunggu' | 'Ditolak'
  ) => {
    setParticipants((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status } : p));
      saveCleanParticipantsToStorage(updated);
      return updated;
    });
    updateParticipantStatusInSupabase(id, status).catch(console.warn);
  };

  const handleDeleteParticipant = (id: string) => {
    const target = participants.find((p) => p.id === id);
    setParticipants((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveCleanParticipantsToStorage(updated);
      return updated;
    });
    if (target) {
      deleteParticipantFromSupabase(target.registrationNumber || target.id).catch(console.warn);
    } else {
      deleteParticipantFromSupabase(id).catch(console.warn);
    }
  };

  const handleOpenUploadWork = (initialRegNumber?: string) => {
    setSelectedRegNumberForWork(initialRegNumber);
    setIsWorkModalOpen(true);
  };

  const handleUpdateParticipantWork = (
    registrationNumber: string,
    workData: {
      workSubmissionType?: 'file' | 'drive';
      workFileName?: string;
      workFileUrl?: string;
      workDriveUrl?: string;
      workNotes?: string;
      workSubmittedAt?: string;
    }
  ) => {
    setParticipants((prev) => {
      const updated = prev.map((p) => {
        if (
          p.registrationNumber?.toLowerCase() === registrationNumber.toLowerCase() ||
          p.id === registrationNumber
        ) {
          return {
            ...p,
            ...workData,
          };
        }
        return p;
      });
      saveCleanParticipantsToStorage(updated);
      return updated;
    });

    updateParticipantWorkInSupabase(registrationNumber, workData).catch(console.warn);
  };

  const handleAddCompetition = (newComp: Competition) => {
    try {
      const deleted = getDeletedCompIds();
      if (deleted.includes(newComp.id)) {
        const nextDeleted = deleted.filter((id) => id !== newComp.id);
        localStorage.setItem(DELETED_COMPETITIONS_KEY, JSON.stringify(nextDeleted));
      }
      const custom = getCustomCompetitions();
      const nextCustom = [newComp, ...custom.filter((c) => c.id !== newComp.id)];
      localStorage.setItem(CUSTOM_COMPETITIONS_KEY, JSON.stringify(nextCustom));
    } catch {}
    setCompetitions((prev) => [newComp, ...prev.filter((c) => c.id !== newComp.id)]);
    insertCompetitionToSupabase(newComp).then((res) => {
      if (res.success) setIsSupabaseLive(true);
    }).catch(console.warn);
  };

  const handleDeleteCompetition = async (id: string) => {
    markCompetitionDeleted(id);
    try {
      const custom = getCustomCompetitions();
      const nextCustom = custom.filter((c) => c.id !== id);
      localStorage.setItem(CUSTOM_COMPETITIONS_KEY, JSON.stringify(nextCustom));
    } catch {}
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
    // Bersihkan peserta yang terdaftar pada lomba ini di state lokal
    setParticipants((prev) => prev.filter((p) => p.competitionId !== id));
    try {
      await deleteCompetitionFromSupabase(id);
    } catch (err) {
      console.warn('Gagal menghapus lomba dari Supabase:', err);
    }
  };

  const handleUpdateCompetition = (updatedComp: Competition) => {
    try {
      const custom = getCustomCompetitions();
      const nextCustom = custom.map((c) => (c.id === updatedComp.id ? updatedComp : c));
      if (!nextCustom.some((c) => c.id === updatedComp.id)) {
        nextCustom.push(updatedComp);
      }
      localStorage.setItem(CUSTOM_COMPETITIONS_KEY, JSON.stringify(nextCustom));
    } catch {}
    setCompetitions((prev) =>
      prev.map((c) => (c.id === updatedComp.id ? updatedComp : c))
    );
    updateCompetitionInSupabase(updatedComp).catch(console.warn);
  };

  return (
    <div className="min-h-screen bg-[#031525] text-[#DDE7E8] selection:bg-[#00D9F5]/30 selection:text-white font-sans relative">
      {/* Navigation Header */}
      <Navbar
        onOpenRegister={handleOpenRegister}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenDownload={() => {
          const el = document.getElementById('unduhan');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenUploadWork={() => handleOpenUploadWork()}
      />

      {/* Main Content Layout */}
      <main id="beranda" className="relative">
        {/* 1. Hero Section */}
        <HeroSection
          onOpenRegister={handleOpenRegister}
          onOpenDownload={() => {
            const el = document.getElementById('unduhan');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onScrollToProgram={() => {
            const el = document.getElementById('lomba');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenExplore={() => {
            const el = document.getElementById('tentang');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenUploadWork={() => handleOpenUploadWork()}
        />

        {/* 2. Countdown Section */}
        <CountdownSection onOpenRegister={handleOpenRegister} />

        {/* 3. Intro & Real Stats Section */}
        <IntroStatsSection
          stats={INITIAL_STATS}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onOpenRegister={handleOpenRegister}
        />

        {/* 4. Five Pillars of Santri Future */}
        <FivePillarsSection />

        {/* 5. Signature Programs */}
        <SignatureProgramsSection />

        {/* 7. Competitions & Festivals */}
        <CompetitionsSection
          competitions={competitions}
          onRegisterCompetition={handleRegisterSpecificCompetition}
          isSupabaseLive={isSupabaseLive}
        />

        {/* 8. Event Timeline */}
        <EventTimelineSection />

        {/* 9. Download Center */}
        <DownloadCenterSection />

        {/* 11. Sponsorship & Partnership */}
        <SponsorshipSection
          onOpenDownload={() => {
            const el = document.getElementById('unduhan');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 12. News & Articles */}
        <NewsSection />

        {/* 13. Contact & Location */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenRegister={handleOpenRegister}
        onOpenUploadWork={() => handleOpenUploadWork()}
      />

      {/* Floating Quick Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {/* Admin CMS Floating Button */}
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="pointer-events-auto p-3 rounded-full bg-[#020e19]/90 border border-white/20 text-[#F2C96D] hover:text-white hover:border-[#D9B45B] shadow-xl backdrop-blur-md transition-all hover:scale-110 group"
          title="Buka CMS Panitia"
          aria-label="Buka CMS Panitia"
        >
          <Shield className="w-5 h-5" />
          <span className="sr-only">CMS Panitia</span>
        </button>

        {/* Upload Karya Floating Quick Action Button */}
        <button
          id="floating-btn-aploud-karya"
          onClick={() => handleOpenUploadWork()}
          className="pointer-events-auto px-4 py-2.5 rounded-full bg-[#031525]/95 border border-[#00D9F5]/40 text-[#00D9F5] hover:text-white hover:bg-[#006B4F]/80 font-bold text-xs uppercase tracking-wider shadow-xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          aria-label="Aploud Karya Peserta"
          title="Bagi peserta yang sudah mendaftar: Aploud Karya Lomba"
        >
          <UploadCloud className="w-4 h-4 text-[#00D9F5]" />
          <span className="hidden sm:inline">Aploud Karya</span>
          <span className="sm:hidden">Karya</span>
        </button>

        {/* Primary Register Floating Button */}
        <button
          onClick={handleOpenRegister}
          className="pointer-events-auto px-5 py-3 rounded-full bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] text-[#031525] font-black text-xs uppercase tracking-wider shadow-2xl shadow-[#00D9F5]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/30"
          aria-label="Daftar Lomba Hari Santri"
        >
          <Sparkles className="w-4 h-4 fill-[#031525]" />
          <span className="hidden sm:inline">Daftar Lomba</span>
          <span className="sm:hidden">Daftar</span>
        </button>
      </div>

      {/* Registration Modal Dialog */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        competitions={competitions}
        initialCategory={registerCategory}
        initialCompetition={registerCompetition}
        onSuccessRegister={handleSuccessRegister}
      />

      {/* Work Submission Modal Dialog (APLOUD KARYA PESERTA) */}
      <WorkSubmissionModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        participants={participants}
        initialRegistrationNumber={selectedRegNumberForWork}
        onSaveWork={handleUpdateParticipantWork}
      />

      {/* Admin CMS Modal Dialog */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        participants={participants}
        onUpdateParticipantStatus={handleUpdateParticipantStatus}
        onDeleteParticipant={handleDeleteParticipant}
        competitions={competitions}
        onAddCompetition={handleAddCompetition}
        onUpdateCompetition={handleUpdateCompetition}
        onDeleteCompetition={handleDeleteCompetition}
        onRefreshCompetitions={setCompetitions}
        onRefreshParticipants={setParticipants}
        documents={DOWNLOAD_DOCUMENTS}
        onUpdateParticipantWork={handleUpdateParticipantWork}
        onOpenWorkModalForParticipant={(regNo) => handleOpenUploadWork(regNo)}
        isSupabaseLive={isSupabaseLive}
        onRefreshAllFromSupabase={loadDataFromSupabase}
      />
    </div>
  );
}

