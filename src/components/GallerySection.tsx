import React, { useState } from 'react';
import { GALLERY_ITEMS } from '../data/initialData';
import { GalleryItem } from '../types';
import { Image as ImageIcon, X, Maximize2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const GallerySection: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('SEMUA');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  const filterCategories = [
    'SEMUA',
    'SANTRI',
    'PESANTREN',
    'BUDAYA',
    'DIGITAL',
    'MALAM PUNCAK',
  ];

  const filteredItems = GALLERY_ITEMS.filter((item) => {
    if (selectedFilter === 'SEMUA') return true;
    return item.category === selectedFilter;
  });

  const openLightbox = (index: number) => {
    setActiveLightboxIndex(index);
  };

  const closeLightbox = () => {
    setActiveLightboxIndex(null);
  };

  const nextImage = () => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex((activeLightboxIndex + 1) % filteredItems.length);
    }
  };

  const prevImage = () => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex(
        (activeLightboxIndex - 1 + filteredItems.length) % filteredItems.length
      );
    }
  };

  return (
    <section id="galeri" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#006B4F]/25 border border-[#008F72]/40 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>DOKUMENTASI & KREASI VISUAL</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            GALERI
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F2C96D] via-[#00D9F5] to-[#008F72]">
              SEMARAK HARI SANTRI
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Rekam jejak antusiasme, kekhidmatan, dan keceriaan para santri, santriwati, kiai, dan masyarakat dalam perayaan Hari Santri Nasional.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                selectedFilter === cat
                  ? 'bg-gradient-to-r from-[#006B4F] via-[#008F72] to-[#00D9F5] text-white shadow-lg shadow-[#008F72]/30 scale-105 border border-[#00D9F5]/50'
                  : 'bg-white/5 text-[#DDE7E8] hover:bg-white/10 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry / Responsive Grid Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => openLightbox(index)}
              className="group relative rounded-2xl overflow-hidden cursor-pointer bg-black/40 border border-white/10 hover:border-[#00D9F5]/60 transition-all duration-300 shadow-xl h-72"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-95 group-hover:brightness-105"
                loading="lazy"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-[#031525]/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Top Category Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#031525]/80 text-[#00D9F5] border border-[#00D9F5]/40 backdrop-blur-md">
                  {item.category}
                </span>
              </div>

              {/* Zoom Icon */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 text-[#F2C96D]" />
              </div>

              {/* Caption & Title Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                <div className="flex items-center gap-1.5 text-[10px] text-[#D9B45B] mb-1 font-semibold">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date}</span>
                </div>
                <h3 className="font-heading text-sm font-bold text-white leading-snug group-hover:text-[#F2C96D] transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#DDE7E8]/80 line-clamp-2 mt-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && filteredItems[activeLightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-fade-in">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-30 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Tutup galeri lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:text-[#00D9F5] hover:bg-black/80 transition-colors"
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:text-[#00D9F5] hover:bg-black/80 transition-colors"
            aria-label="Foto selanjutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image Container */}
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-h-[75vh]">
              <img
                src={filteredItems[activeLightboxIndex].imageUrl}
                alt={filteredItems[activeLightboxIndex].title}
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>

            {/* Lightbox Caption */}
            <div className="w-full max-w-2xl text-center mt-4 px-4">
              <div className="flex items-center justify-center gap-2 mb-1 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-[#00D9F5]/20 text-[#00D9F5] font-bold">
                  {filteredItems[activeLightboxIndex].category}
                </span>
                <span className="text-[#DDE7E8]/60">•</span>
                <span className="text-[#F2C96D] font-medium">
                  {filteredItems[activeLightboxIndex].date}
                </span>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
                {filteredItems[activeLightboxIndex].title}
              </h3>
              <p className="text-xs sm:text-sm text-[#DDE7E8]/85 mt-1 font-normal">
                {filteredItems[activeLightboxIndex].caption}
              </p>
              <div className="text-[11px] text-white/50 mt-2">
                {activeLightboxIndex + 1} dari {filteredItems.length} foto
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
