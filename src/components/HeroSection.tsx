import React, { useEffect, useState, useRef } from 'react';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Trophy,
  ChevronDown,
  BookOpen,
  Laptop,
  Flame,
  Globe2,
  UploadCloud
} from 'lucide-react';
import { HeroParticlesCanvas } from './HeroParticlesCanvas';
import heroArtworkImg from '../assets/images/hero_hsn_artwork_1788617565328.jpg';

interface HeroSectionProps {
  onOpenRegister?: () => void;
  onOpenDownload?: () => void;
  onScrollToProgram?: () => void;
  onOpenExplore?: () => void;
  onOpenUploadWork?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister = () => {},
  onOpenDownload = () => {
    const el = document.getElementById('unduhan');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  },
  onScrollToProgram = () => {
    const el = document.getElementById('lomba');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  },
  onOpenExplore = () => {
    const el = document.getElementById('tentang');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  },
  onOpenUploadWork,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);

  // Smooth mouse parallax listener
  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDesktop) return;
      // Normalized between -1 and 1
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', checkWidth);
    };
  }, [isDesktop]);

  // 5 Pilar Process Steps as seen in the poster
  const pilarSteps = [
    { label: 'BERAKHLAK', icon: BookOpen, color: 'text-[#99E3D8]', bg: 'bg-[#006B4F]/40' },
    { label: 'BERILMU', icon: Flame, color: 'text-[#00D9F5]', bg: 'bg-[#008F72]/40' },
    { label: 'BERBUDAYA', icon: Globe2, color: 'text-[#F2C96D]', bg: 'bg-[#031525]/70' },
    { label: 'BERDIGITAL', icon: Laptop, color: 'text-[#00D9F5]', bg: 'bg-[#006B4F]/50' },
    { label: 'MENDUNIA', icon: Sparkles, color: 'text-[#F2C96D]', bg: 'bg-[#002B20]/70' },
  ];

  return (
    <section
      ref={heroRef}
      id="beranda"
      className="relative min-h-[92vh] lg:min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#031525] pt-20 pb-16 lg:py-24"
    >
      {/* =========================================================================
          LAYER 1: DEEP BACKGROUND (Space, Starfield & Nebula Glow)
          Parallax factor: 0.2
      ========================================================================= */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-500 ease-out will-change-transform"
        style={{
          transform: isDesktop 
            ? `translate3d(${mousePos.x * 6}px, ${mousePos.y * 6}px, 0)` 
            : 'none'
        }}
      >
        {/* Deep celestial gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020D17] via-[#031525] to-[#010910]" />

        {/* Ambient Nebula Glow Orbs */}
        <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#006B4F]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[650px] h-[650px] bg-[#00D9F5]/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-[#F2C96D]/12 rounded-full blur-[140px] pointer-events-none" />

        {/* Islamic Star Lattice Arabesque Grid */}
        <div className="absolute inset-0 bg-islamic-pattern opacity-40 mix-blend-overlay" />
      </div>

      {/* =========================================================================
          LAYER 2: ARCHITECTURE & MOSQUE SILHOUETTE / HERITAGE
          Parallax factor: 0.4
      ========================================================================= */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-500 ease-out will-change-transform opacity-30"
        style={{
          transform: isDesktop 
            ? `translate3d(${mousePos.x * 12}px, ${mousePos.y * 8}px, 0)` 
            : 'none'
        }}
      >
        {/* Mosque Dome & Minaret Architectural Skyline at the Bottom/Right */}
        <svg 
          viewBox="0 0 1440 280" 
          className="absolute bottom-0 w-full h-auto fill-[#006B4F]/40"
          preserveAspectRatio="none"
        >
          <path d="M0,280 L0,220 Q60,220 80,180 Q100,140 120,180 Q140,220 200,220 L280,220 Q310,180 330,130 Q350,80 370,130 Q390,180 420,220 L600,220 Q630,190 650,140 Q670,90 690,140 Q710,190 740,220 L880,220 Q920,160 940,90 Q960,20 980,90 Q1000,160 1040,220 L1180,220 Q1220,170 1240,110 Q1260,50 1280,110 Q1300,170 1340,220 L1440,220 L1440,280 Z" />
        </svg>

        {/* Arch ornament on the left */}
        <div className="hidden lg:block absolute top-12 left-8 w-72 h-96 border-l-2 border-t-2 border-[#00D9F5]/20 rounded-tl-[120px] pointer-events-none" />
      </div>

      {/* =========================================================================
          LAYER 3: DIGITAL GLOBE & CYBER NETWORK RINGS
          Parallax factor: 0.8
      ========================================================================= */}
      <div 
        className="hidden lg:block absolute right-[-5%] top-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none transition-transform duration-700 ease-out will-change-transform"
        style={{
          transform: `translate3d(${mousePos.x * 20}px, calc(-50% + ${mousePos.y * 15}px), 0)`
        }}
      >
        {/* Holographic Glowing Digital Rings */}
        <div className="relative w-full h-full">
          <div className="absolute inset-0 rounded-full border border-[#00D9F5]/20 animate-spin" style={{ animationDuration: '80s' }} />
          <div className="absolute inset-12 rounded-full border border-dashed border-[#F2C96D]/25 animate-spin" style={{ animationDuration: '60s', animationDirection: 'reverse' }} />
          <div className="absolute inset-28 rounded-full border border-[#008F72]/30 animate-spin" style={{ animationDuration: '45s' }} />
          <div className="absolute inset-44 rounded-full border border-dotted border-[#00D9F5]/25 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />

          {/* Cyber Coordinate Nodes */}
          <div className="absolute top-1/4 right-1/4 w-3 h-3 rounded-full bg-[#00D9F5] shadow-[0_0_15px_#00D9F5] animate-ping" />
          <div className="absolute bottom-1/3 right-1/3 w-2.5 h-2.5 rounded-full bg-[#F2C96D] shadow-[0_0_12px_#F2C96D]" />
        </div>
      </div>

      {/* =========================================================================
          LAYER 4: MAIN HERO ARTWORK (Desktop Panoramic Background + Left Dark Gradient)
          Prioritizes: Santri youths (Kitab Kuning, Tablet, VR), Digital Globe,
          Grand Mosque, Indonesian Flag, Wayang Kulit & Nusantara Heritage.
          NO BAD CROPPING OF FACES!
      ========================================================================= */}
      <div 
        className="hidden lg:block absolute inset-0 pointer-events-none transition-transform duration-500 ease-out will-change-transform overflow-hidden"
        style={{
          transform: isDesktop 
            ? `translate3d(${mousePos.x * 14}px, ${mousePos.y * 10}px, 0) scale(1.02)` 
            : 'none'
        }}
      >
        {/* The Main High-Resolution Artwork */}
        <img
          src={heroArtworkImg}
          alt="Visual Utama Hari Santri Nasional 2026 - Santri Digital Nusantara"
          className="absolute right-0 top-0 h-full w-auto max-w-none object-cover object-[75%_25%] opacity-90 transition-opacity duration-700"
          referrerPolicy="no-referrer"
          loading="eager"
        />

        {/* Sophisticated Dark Gradient Overlay on the LEFT:
            Protects HTML typography contrast while letting artwork shine on the right! */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[#031525] via-[#031525]/95 via-45% to-transparent pointer-events-none" 
        />
        
        {/* Subtle Top & Bottom Vignettes */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#031525] to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#031525] via-[#031525]/80 to-transparent pointer-events-none" />
      </div>

      {/* =========================================================================
          LAYER 5: PARTICLES & GOLDEN GLOW CANVAS (Lightweight CSS/Canvas)
      ========================================================================= */}
      <HeroParticlesCanvas />

      {/* Indonesian Red & White National Flag Ribbon Accent (Top Right) */}
      <div className="absolute top-0 right-0 w-40 sm:w-64 h-2.5 flex shadow-lg pointer-events-none z-20">
        <div className="w-1/2 h-full bg-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
        <div className="w-1/2 h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
      </div>

      {/* =========================================================================
          LAYER 6: FOREGROUND CONTENT CONTAINER (Responsive HTML Grid)
          - Desktop: 2-Column with left-aligned pristine HTML typography and CTAs.
          - Mobile: Top artwork showcase (with faces protected) + Bottom HTML headlines and immediate CTAs!
      ========================================================================= */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* MOBILE LAYOUT (< lg):
            Visual artwork is cleanly displayed at the top/center,
            Headline is placed underneath,
            CTA is immediately visible! */}
        <div className="lg:hidden flex flex-col items-center text-center">
          
          {/* Top Organization Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006B4F]/30 border border-[#00D9F5]/40 shadow-md shadow-[#00D9F5]/10 mb-4 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00D9F5] shadow-[0_0_8px_#00D9F5] animate-ping" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#00D9F5]">
              MWC NU KECAMATAN PONCOKUSUMO
            </span>
            <span className="text-[#F2C96D] text-xs">✦</span>
          </div>

          {/* MOBILE ARTWORK SHOWCASE CONTAINER:
              Carefully framed so santri faces, kitab kuning, tablet, VR, globe, mosque, flag, and wayang are not cropped! */}
          <div className="relative w-full max-w-md mx-auto mb-6 rounded-2xl overflow-hidden border-2 border-[#00D9F5]/40 shadow-[0_0_35px_rgba(0,217,245,0.25)] bg-[#020e19]">
            {/* Glowing corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#F2C96D] z-10" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00D9F5] z-10" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00D9F5] z-10" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#F2C96D] z-10" />
            
            <img
              src={heroArtworkImg}
              alt="Artwork Poster Hari Santri Nasional 2026 MWC NU Poncokusumo"
              className="w-full h-auto aspect-[16/10] object-cover object-center"
              referrerPolicy="no-referrer"
              loading="eager"
            />
            {/* Subtle soft bottom gradient in the card */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#020e19] via-[#020e19]/60 to-transparent" />
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2 text-[10px] text-[#F2C96D] font-semibold tracking-wider">
              <Sparkles className="w-3 h-3 text-[#00D9F5]" />
              <span>FESTIVAL SANTRI NUSANTARA 2026</span>
              <Sparkles className="w-3 h-3 text-[#00D9F5]" />
            </div>
          </div>

          {/* Mobile Main Headline */}
          <h1 className="font-heading font-black tracking-tight text-3xl sm:text-5xl leading-tight uppercase text-white drop-shadow-[0_2px_15px_rgba(0,107,79,0.8)] mb-2">
            HARI SANTRI{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2C96D] via-[#D9B45B] to-[#00D9F5]">
              NASIONAL 2026
            </span>
          </h1>

          {/* Mobile Subheadline Quote */}
          <div className="relative my-3 px-4 py-2 rounded-xl bg-[#006B4F]/20 border border-[#00D9F5]/30 backdrop-blur-sm">
            <p className="font-heading text-sm sm:text-base font-bold tracking-wide text-[#F2C96D] leading-snug">
              “SANTRI MENGUATKAN NEGERI MENUJU INDONESIA EMAS”
            </p>
          </div>

          {/* Mobile 5 Pilar Process Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-3 text-[10px] sm:text-xs font-semibold">
            {pilarSteps.map((step, idx) => (
              <div 
                key={step.label}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#006B4F]/30 border border-[#008F72]/50 text-white"
              >
                <step.icon className={`w-3 h-3 ${step.color}`} />
                <span>{step.label}</span>
                {idx < pilarSteps.length - 1 && (
                  <span className="text-[#00D9F5] text-[10px] ml-1">›</span>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Tagline */}
          <p className="text-xs sm:text-sm text-[#DDE7E8]/90 max-w-md my-3 font-normal">
            Berakar di Nusantara • Berdaya dengan Ilmu • Berkarya untuk Dunia
          </p>

          {/* Mobile Date & Location Pill */}
          <div className="flex items-center justify-center gap-4 px-4 py-2 rounded-xl bg-[#031525]/90 border border-[#F2C96D]/40 text-xs font-semibold my-3">
            <div className="flex items-center gap-1.5 text-[#F2C96D]">
              <Calendar className="w-3.5 h-3.5 text-[#D9B45B]" />
              <span>22 OKT 2026</span>
            </div>
            <span className="text-white/30">•</span>
            <div className="flex items-center gap-1.5 text-[#00D9F5]">
              <MapPin className="w-3.5 h-3.5 text-[#00D9F5]" />
              <span>PONCOKUSUMO, MALANG</span>
            </div>
          </div>

          {/* Mobile CTAs: Immediately visible! */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-4">
            <button
              id="hero-mobile-cta-register"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-heading font-extrabold text-sm tracking-wider uppercase text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] shadow-[0_0_25px_rgba(0,217,245,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#031525]" />
              <span>DAFTAR SEKARANG</span>
              <ArrowRight className="w-4 h-4 text-[#031525]" />
            </button>

            <button
              id="hero-mobile-cta-lomba"
              onClick={onScrollToProgram}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-heading font-bold text-xs tracking-wider uppercase text-white bg-[#006B4F]/40 border border-[#008F72] hover:border-[#00D9F5] flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 text-[#F2C96D]" />
              <span>LIHAT CABANG LOMBA</span>
            </button>

            {onOpenUploadWork && (
              <button
                id="hero-mobile-cta-aploud-karya"
                onClick={onOpenUploadWork}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider uppercase text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] flex items-center justify-center gap-1.5 shadow-md shadow-[#00D9F5]/30"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#031525]" />
                <span>APLOUD KARYA</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            DESKTOP LAYOUT (lg: and up):
            2-Column Composition:
            Left column (56% width) with pristine HTML typography, 5-Pilar process,
            and CTAs, resting securely on the dark gradient overlay.
            Right column frames the live artwork characters and motifs!
        ========================================================================= */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-center min-h-[75vh]">
          
          {/* LEFT COLUMN: Headings, Theme, 5-Pilar Process, CTAs (Col 1 to 7) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left z-10 pr-4">

            {/* Main Headline */}
            <h1 className="font-heading font-black tracking-tight text-5xl xl:text-6xl 2xl:text-7xl leading-[1.05] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-[#E6F4F1] to-[#99E3D8] drop-shadow-[0_4px_30px_rgba(0,107,79,0.7)] mb-3">
              HARI SANTRI
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F2C96D] via-[#D9B45B] to-[#00D9F5] drop-shadow-[0_0_35px_rgba(217,180,91,0.5)]">
                NASIONAL 2026
              </span>
            </h1>

            {/* Subheadline (Tema Akbar) */}
            <div className="relative my-4 max-w-2xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#006B4F]/30 via-[#00D9F5]/20 to-transparent blur-sm rounded-xl" />
              <div className="relative px-5 py-3 rounded-xl bg-gradient-to-r from-[#006B4F]/30 via-[#031525]/90 to-transparent border-l-4 border-[#F2C96D] backdrop-blur-md">
                <p className="font-heading text-xl xl:text-2xl font-bold tracking-wide text-[#F2C96D] leading-snug drop-shadow-md">
                  “SANTRI MENGUATKAN NEGERI MENUJU INDONESIA EMAS”
                </p>
              </div>
            </div>

            {/* 5-Pilar Process Chevron Flow (Matching the Poster Layout!) */}
            <div className="my-4 w-full max-w-2xl">
              <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#031525]/80 border border-[#00D9F5]/20 backdrop-blur-md">
                {pilarSteps.map((step, idx) => (
                  <div
                    key={step.label}
                    className="relative flex-1 flex items-center justify-center py-2 px-1 rounded-lg bg-gradient-to-r from-[#006B4F]/30 to-[#031525]/60 border border-[#008F72]/40 group hover:border-[#00D9F5] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-[11px] xl:text-xs font-bold tracking-wider text-white">
                        {step.label}
                      </span>
                    </div>
                    {idx < pilarSteps.length - 1 && (
                      <span className="absolute -right-2 text-[#00D9F5] text-xs font-bold pointer-events-none z-10">
                        ›
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tagline & Spirit Chips */}
            <div className="flex items-center gap-3 my-2 text-xs font-semibold text-[#DDE7E8]">
              <span className="px-3 py-1 rounded-full bg-[#006B4F]/30 border border-[#006B4F]/50 text-[#00D9F5]">
                Berakar di Nusantara
              </span>
              <span className="text-[#F2C96D]">✦</span>
              <span className="px-3 py-1 rounded-full bg-[#006B4F]/30 border border-[#006B4F]/50 text-[#F2C96D]">
                Berdaya dengan Ilmu
              </span>
              <span className="text-[#F2C96D]">✦</span>
              <span className="px-3 py-1 rounded-full bg-[#006B4F]/30 border border-[#006B4F]/50 text-[#00D9F5]">
                Berkarya untuk Dunia
              </span>
            </div>

            {/* Narrative Description */}
            <p className="max-w-xl text-sm xl:text-base text-[#DDE7E8]/90 font-normal leading-relaxed my-4">
              Festival akbar santri mempertemukan keluhuran nilai pesantren, tradisi Islam Nusantara, sains, teknologi digital, dan kreativitas masa depan Bangsa Indonesia.
            </p>

            {/* Event Date & Location Pill */}
            <div className="flex items-center gap-6 px-5 py-2.5 rounded-2xl bg-[#031525]/90 border border-[#D9B45B]/40 backdrop-blur-md shadow-xl my-4 text-xs xl:text-sm font-semibold">
              <div className="flex items-center gap-2 text-[#F2C96D]">
                <Calendar className="w-4 h-4 text-[#D9B45B]" />
                <span>22 OKTOBER 2026</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-2 text-[#00D9F5]">
                <MapPin className="w-4 h-4 text-[#00D9F5]" />
                <span>PONCOKUSUMO • KAB. MALANG</span>
              </div>
            </div>

            {/* Action Call to Actions (CTA 1, 2, 3) */}
            <div className="flex items-center gap-4 mt-6">
              {/* PRIMARY CTA: DAFTAR SEKARANG */}
              <button
                id="hero-desktop-cta-register"
                onClick={onOpenRegister}
                className="group relative px-8 py-4 rounded-xl font-heading font-black text-sm xl:text-base tracking-wider uppercase text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] shadow-[0_0_30px_rgba(0,217,245,0.4)] hover:shadow-[0_0_45px_rgba(242,201,109,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2.5 overflow-hidden"
              >
                <Sparkles className="w-4 h-4 text-[#031525]" />
                <span>DAFTAR SEKARANG</span>
                <ArrowRight className="w-4 h-4 text-[#031525] group-hover:translate-x-1.5 transition-transform" />
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              </button>

              {/* SECONDARY CTA: CABANG LOMBA */}
              <button
                id="hero-desktop-cta-lomba"
                onClick={onScrollToProgram}
                className="px-6 py-4 rounded-xl font-heading font-bold text-sm xl:text-base tracking-wider uppercase text-white bg-[#006B4F]/40 hover:bg-[#006B4F]/70 border border-[#008F72] hover:border-[#00D9F5] shadow-lg backdrop-blur-md active:scale-95 transition-all duration-300 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-[#F2C96D]" />
                <span>CABANG LOMBA</span>
              </button>

              {/* QUATERNARY CTA: APLOUD KARYA (Bagi peserta yang sudah mendaftar) */}
              {onOpenUploadWork && (
                <button
                  id="hero-desktop-cta-aploud-karya"
                  onClick={onOpenUploadWork}
                  className="px-5 py-4 rounded-xl font-heading font-extrabold text-xs xl:text-sm tracking-wider uppercase text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-[0_0_20px_rgba(0,217,245,0.3)] active:scale-95 transition-all duration-300 flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4 text-[#031525]" />
                  <span>APLOUD KARYA</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Framed Artwork Focal Point
              Ensures the artwork has a dedicated highlighted frame that complements the full background */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div 
              className="relative w-full max-w-lg rounded-3xl p-1.5 bg-gradient-to-br from-[#00D9F5]/40 via-[#006B4F]/30 to-[#F2C96D]/40 shadow-[0_0_50px_rgba(0,217,245,0.2)] transition-transform duration-500 ease-out will-change-transform"
              style={{
                transform: `translate3d(${-mousePos.x * 12}px, ${-mousePos.y * 8}px, 0)`
              }}
            >
              {/* Inner Framed Card */}
              <div className="relative rounded-[22px] overflow-hidden bg-[#031525] border border-white/10 group">
                <img
                  src={heroArtworkImg}
                  alt="Poster Hari Santri Nasional 2026 - MWC NU Poncokusumo"
                  className="w-full h-auto object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle glass reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-transparent to-transparent opacity-60" />

                {/* Corner Golden Ornaments */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#031525]/80 border border-[#00D9F5]/40 text-[11px] font-bold text-[#00D9F5] backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D9F5]" />
                  <span>SANTRI DIGITAL 2026</span>
                </div>

                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#031525]/80 border border-[#F2C96D]/40 text-[11px] font-bold text-[#F2C96D] backdrop-blur-md flex items-center gap-1.5">
                  <Globe2 className="w-3 h-3 text-[#F2C96D]" />
                  <span>ISLAM NUSANTARA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="mt-8 lg:mt-12 flex flex-col items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <span className="text-[10px] tracking-widest text-[#DDE7E8] uppercase">
            Gulir Untuk Menjelajahi Agenda & Lomba
          </span>
          <a
            href="#countdown"
            className="w-8 h-8 rounded-full border border-[#00D9F5]/40 flex items-center justify-center animate-bounce text-[#00D9F5] hover:bg-[#00D9F5]/20 transition-colors"
            aria-label="Gulir ke hitung mundur"
          >
            <ChevronDown className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
