import React, { useState, useEffect } from 'react';
import { Menu, X, ShieldCheck, Download, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenAdmin: () => void;
  onOpenDownload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRegister,
  onOpenAdmin,
  onOpenDownload,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'BERANDA', href: '#beranda' },
    { name: 'TENTANG', href: '#tentang' },
    { name: 'PROGRAM', href: '#program' },
    { name: 'LOMBA', href: '#lomba' },
    { name: 'AGENDA', href: '#agenda' },
    { name: 'SPONSOR', href: '#sponsor' },
    { name: 'GALERI', href: '#galeri' },
    { name: 'UNDUHAN', href: '#unduhan' },
    { name: 'KONTAK', href: '#kontak' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href === '#unduhan') {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        onOpenDownload();
      }
      return;
    }
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#031525]/90 backdrop-blur-xl border-b border-[#00D9F5]/15 py-3 shadow-2xl shadow-[#031525]/80'
          : 'bg-gradient-to-b from-[#031525]/80 via-[#031525]/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <a
            href="#beranda"
            onClick={(e) => handleNavClick(e, '#beranda')}
            className="flex items-center gap-3 group text-left"
            id="nav-logo-btn"
          >
            {/* NU Emblem Vector Art */}
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#006B4F] via-[#008F72] to-[#031525] p-0.5 shadow-lg shadow-[#006B4F]/30 group-hover:shadow-[#00D9F5]/40 transition-all duration-300">
              <div className="w-full h-full rounded-[10px] bg-[#031525]/80 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-radial from-[#00D9F5]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Visual Icon: 9 Stars & Globe of NU */}
                <div className="relative flex flex-col items-center justify-center">
                  <div className="w-5 h-5 rounded-full border border-[#D9B45B] flex items-center justify-center relative">
                    <span className="text-[7px] text-[#F2C96D] font-bold">NU</span>
                    <span className="absolute -top-1 w-1.5 h-1.5 bg-[#F2C96D] rounded-full shadow-[0_0_4px_#F2C96D]" />
                  </div>
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#00D9F5]" />
                    <span className="w-1 h-1 rounded-full bg-[#D9B45B]" />
                    <span className="w-1 h-1 rounded-full bg-[#00D9F5]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] tracking-widest font-semibold uppercase text-[#00D9F5]">
                  MWC NU PONCOKUSUMO
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D9B45B] animate-pulse" />
              </div>
              <span className="font-heading font-extrabold text-sm sm:text-base tracking-wider text-white group-hover:text-[#F2C96D] transition-colors leading-tight">
                HARI SANTRI 2026
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-3 py-1.5 text-xs font-semibold tracking-wider text-[#DDE7E8] hover:text-[#00D9F5] transition-colors duration-200 relative group"
                id={`nav-link-${link.name.toLowerCase()}`}
              >
                {link.name}
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-[#006B4F] via-[#00D9F5] to-[#D9B45B] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Admin CMS Trigger */}
            <button
              id="nav-admin-cms-btn"
              onClick={onOpenAdmin}
              title="Portal Admin & CMS"
              className="px-3 py-1.5 rounded-lg border border-[#008F72]/40 bg-[#006B4F]/15 hover:bg-[#006B4F]/30 text-xs font-semibold text-[#DDE7E8] hover:text-[#F2C96D] flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00D9F5]" />
              <span>Admin</span>
            </button>

            {/* Registration Primary CTA */}
            <button
              id="nav-cta-register-desktop"
              onClick={onOpenRegister}
              className="relative group overflow-hidden px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-lg shadow-[#00D9F5]/20 active:scale-95 transition-all duration-300 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#031525]" />
              <span>DAFTAR SEKARANG</span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              id="nav-mobile-register-btn"
              onClick={onOpenRegister}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-[#031525] bg-gradient-to-r from-[#F2C96D] to-[#00D9F5] shadow"
            >
              Daftar
            </button>
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#006B4F]/20 border border-[#00D9F5]/20 text-[#DDE7E8] hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-drawer"
          className="lg:hidden bg-[#031525]/98 border-b border-[#00D9F5]/20 px-6 py-6 backdrop-blur-2xl shadow-2xl animate-fade-in"
        >
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="py-2.5 px-3 rounded-lg text-sm font-semibold tracking-wider text-[#DDE7E8] hover:bg-[#006B4F]/20 hover:text-[#00D9F5] transition-colors"
              >
                {link.name}
              </a>
            ))}

            <div className="pt-4 border-t border-[#00D9F5]/15 flex flex-col gap-3">
              <button
                id="mobile-cta-register"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister();
                }}
                className="w-full py-3 rounded-xl text-center text-sm font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] shadow-lg shadow-[#00D9F5]/20"
              >
                DAFTAR SEKARANG
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-admin-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-[#008F72]/40 bg-[#006B4F]/20 text-xs font-semibold text-[#F2C96D] flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00D9F5]" />
                  <span>Admin CMS</span>
                </button>
                <button
                  id="mobile-download-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDownload();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-[#00D9F5]/30 bg-[#00D9F5]/10 text-xs font-semibold text-[#00D9F5] flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Proposal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
