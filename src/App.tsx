/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CountdownSection } from './components/CountdownSection';
import { IntroStatsSection } from './components/IntroStatsSection';
import { FivePillarsSection } from './components/FivePillarsSection';
import { ProgramGenerationsSection } from './components/ProgramGenerationsSection';
import { SignatureProgramsSection } from './components/SignatureProgramsSection';
import { CompetitionsSection } from './components/CompetitionsSection';
import { EventTimelineSection } from './components/EventTimelineSection';
import { GallerySection } from './components/GallerySection';
import { DownloadCenterSection } from './components/DownloadCenterSection';
import { SponsorshipSection } from './components/SponsorshipSection';
import { NewsSection } from './components/NewsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { RegistrationModal } from './components/RegistrationModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';

import { COMPETITIONS, SAMPLE_PARTICIPANTS, DOWNLOAD_DOCUMENTS } from './data/initialData';
import { Competition, CategoryGeneration, ParticipantRegistration } from './types';
import { Sparkles, MessageCircle, Shield } from 'lucide-react';

export default function App() {
  // Modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  
  // Registration selection context
  const [registerCategory, setRegisterCategory] = useState<CategoryGeneration>('SMP/MTs');
  const [registerCompetition, setRegisterCompetition] = useState<Competition | null>(null);

  // App data state (allowing real-time interaction in CMS)
  const [competitions, setCompetitions] = useState<Competition[]>(COMPETITIONS);
  const [participants, setParticipants] = useState<ParticipantRegistration[]>(SAMPLE_PARTICIPANTS);

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
    setParticipants((prev) => [newRecord, ...prev]);
  };

  const handleUpdateParticipantStatus = (
    id: string,
    status: 'Terverifikasi' | 'Menunggu' | 'Ditolak'
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const handleAddCompetition = (newComp: Competition) => {
    setCompetitions((prev) => [newComp, ...prev]);
  };

  const handleDeleteCompetition = (id: string) => {
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#031525] text-[#DDE7E8] selection:bg-[#00D9F5]/30 selection:text-white font-sans relative">
      {/* Navigation Header */}
      <Navbar
        onOpenRegister={handleOpenRegister}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
      />

      {/* Main Content Layout */}
      <main id="beranda" className="relative">
        {/* 1. Hero Section */}
        <HeroSection
          onOpenRegister={handleOpenRegister}
          onOpenExplore={() => {
            const el = document.getElementById('tentang');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 2. Countdown Section */}
        <CountdownSection onOpenRegister={handleOpenRegister} />

        {/* 3. Intro & Real Stats Section */}
        <IntroStatsSection onOpenRegister={handleOpenRegister} />

        {/* 4. Five Pillars of Santri Future */}
        <FivePillarsSection />

        {/* 5. Generation-Based Programs */}
        <ProgramGenerationsSection
          onSelectCategoryForRegister={handleSelectCategoryForRegister}
        />

        {/* 6. Signature Programs */}
        <SignatureProgramsSection />

        {/* 7. Competitions & Festivals */}
        <CompetitionsSection
          competitions={competitions}
          onRegisterCompetition={handleRegisterSpecificCompetition}
        />

        {/* 8. Event Timeline */}
        <EventTimelineSection />

        {/* 9. Media & Photo Gallery */}
        <GallerySection />

        {/* 10. Download Center */}
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

      {/* Admin CMS Modal Dialog */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        participants={participants}
        onUpdateParticipantStatus={handleUpdateParticipantStatus}
        competitions={competitions}
        onAddCompetition={handleAddCompetition}
        onDeleteCompetition={handleDeleteCompetition}
        documents={DOWNLOAD_DOCUMENTS}
      />
    </div>
  );
}

