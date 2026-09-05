import React, { useState } from 'react';
import { NEWS_ARTICLES } from '../data/initialData';
import { NewsArticle } from '../types';
import { Newspaper, Calendar, Clock, ArrowRight, X, User, Tag, Share2 } from 'lucide-react';

export const NewsSection: React.FC = () => {
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  return (
    <section id="berita" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020e19] overflow-hidden">
      {/* Glow ambient */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-[#006B4F]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#006B4F]/25 border border-[#008F72]/40 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <Newspaper className="w-3.5 h-3.5" />
            <span>WARTA & MEDIA INFORMASI</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            KABAR
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00D9F5] via-[#D9B45B] to-[#F2C96D]">
              HARI SANTRI 2026
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Ikuti perkembangan terkini, liputan persiapan panitia, profil santri inspiratif, dan gagasan keislaman-kebangsaan.
          </p>
        </div>

        {/* News Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {NEWS_ARTICLES.map((article) => (
            <div
              key={article.id}
              className="group relative rounded-3xl overflow-hidden glass-panel border border-white/10 hover:border-[#00D9F5]/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail */}
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={article.thumbnail}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#031525]/85 border border-[#00D9F5]/30 text-[#00D9F5] backdrop-blur-md">
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs text-[#DDE7E8]/70 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#F2C96D]" />
                      <span>{article.date}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#00D9F5]" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-[#F2C96D] transition-colors line-clamp-2 mb-3 leading-snug">
                    {article.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#DDE7E8]/80 leading-relaxed line-clamp-3 mb-4 font-normal">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              {/* Read Action */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => setActiveArticle(article)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#00D9F5] group-hover:text-[#031525] bg-white/5 group-hover:bg-gradient-to-r group-hover:from-[#D9B45B] group-hover:to-[#00D9F5] border border-[#00D9F5]/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>BACA SELENGKAPNYA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Article Detail Reading Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-[#031525]/80 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup artikel"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={activeArticle.thumbnail}
                alt={activeArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#031525] via-[#031525]/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#00D9F5]/20 border border-[#00D9F5]/40 text-[#00D9F5] mb-2 inline-block">
                  {activeArticle.category}
                </span>
                <h2 className="font-heading text-xl sm:text-3xl font-black text-white leading-tight">
                  {activeArticle.title}
                </h2>
              </div>
            </div>

            {/* Article Meta */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10 text-xs text-[#DDE7E8]/70">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <User className="w-3.5 h-3.5 text-[#00D9F5]" />
                    {activeArticle.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#F2C96D]" />
                    {activeArticle.date}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#00D9F5]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeArticle.readTime}</span>
                </div>
              </div>

              {/* Article Content Paragraphs */}
              <div className="space-y-4 text-sm sm:text-base text-[#DDE7E8]/90 leading-relaxed font-normal">
                {activeArticle.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* Tags */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50 flex items-center gap-1 mr-2">
                  <Tag className="w-3 h-3" />
                  Tags:
                </span>
                {activeArticle.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-[#00D9F5]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
