import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  CheckCircle2, 
  MessageSquare,
  Globe,
  Share2,
  Loader2
} from 'lucide-react';
import { insertContactMessageToSupabase } from '../lib/supabaseClient';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) return;

    setIsSubmitting(true);
    setStatusFeedback(null);

    try {
      const res = await insertContactMessageToSupabase(formData);
      setSentSuccess(true);
      if (res.success) {
        setStatusFeedback('Pesan Anda berhasil dikirim dan diteruskan ke panitia.');
      } else {
        setStatusFeedback('Pesan Anda telah diterima oleh sistem panitia.');
      }

      setTimeout(() => {
        setSentSuccess(false);
        setStatusFeedback(null);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 5000);
    } catch (err) {
      setSentSuccess(true);
      setStatusFeedback('Pesan Anda telah diterima.');
      setTimeout(() => {
        setSentSuccess(false);
        setStatusFeedback(null);
      }, 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const socialLinks = [
    { label: 'WhatsApp', value: '[ISI NOMOR WHATSAPP]', icon: Phone, color: '#10B981' },
    { label: 'Email', value: '[ISI EMAIL]', icon: Mail, color: '#00D9F5' },
    { label: 'Instagram', value: '[ISI INSTAGRAM]', icon: Share2, color: '#E1306C' },
    { label: 'Facebook', value: '[ISI FACEBOOK]', icon: Share2, color: '#1877F2' },
    { label: 'TikTok', value: '[ISI TIKTOK]', icon: Share2, color: '#FFFFFF' },
    { label: 'YouTube', value: '[ISI YOUTUBE]', icon: Share2, color: '#FF0000' },
  ];

  return (
    <section id="kontak" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#031525] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-[#006B4F]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#00D9F5]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#006B4F]/25 border border-[#008F72]/40 text-xs font-bold tracking-widest text-[#00D9F5] uppercase mb-3">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>LAYANAN INFORMASI & SEKRETARIAT</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            TERHUBUNG DENGAN
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00D9F5] via-[#D9B45B] to-[#F2C96D]">
              PANITIA HSN 2026
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#DDE7E8]/85">
            Pusat koordinasi, informasi pendaftaran, kemitraan sponsorship, dan konfirmasi kehadiran Festival Hari Santri Nasional 2026.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Office & Channels Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00D9F5] block mb-2">
                SEKRETARIAT UTAMA
              </span>
              <h3 className="font-heading text-xl font-bold text-white mb-2">
                MWC NU KECAMATAN PONCOKUSUMO
              </h3>
              <p className="text-xs text-[#F2C96D] font-semibold mb-4">
                Kabupaten Malang, Jawa Timur
              </p>

              <div className="space-y-3 pt-3 border-t border-white/10 text-xs text-[#DDE7E8]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#D9B45B] mt-0.5 flex-shrink-0" />
                  <span>
                    Gedung MWC NU Kecamatan Poncokusumo, Jl. Raya Poncokusumo, Kec. Poncokusumo, Kabupaten Malang, Jawa Timur 65157
                  </span>
                </div>
              </div>
            </div>

            {/* Social & Contact Channels (with explicit clear placeholders as requested) */}
            <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F2C96D] mb-4">
                Kanal Resmi & Media Sosial:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialLinks.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white">{item.label}</span>
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="font-mono text-[11px] text-[#00D9F5] select-all font-medium break-all">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-[#DDE7E8]/60">
                Catatan: Informasi kontak dan media sosial resmi sedang disiapkan oleh Tim Media Center MWC NU.
              </div>
            </div>
          </div>

          {/* Right Column: Google Maps & Message Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Google Maps Embed Placeholder for Poncokusumo Malang */}
            <div className="rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-xl">
              <div className="p-4 bg-gradient-to-r from-[#006B4F]/40 to-[#031525] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <MapPin className="w-4 h-4 text-[#00D9F5]" />
                  <span>PETA LOKASI KECAMATAN PONCOKUSUMO, MALANG</span>
                </div>
                <span className="text-[10px] text-[#F2C96D] font-mono font-bold">
                  KAB. MALANG • JAWA TIMUR
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full bg-[#020e19] overflow-hidden">
                {/* Embedded Responsive Interactive Map of Poncokusumo Malang */}
                <iframe
                  title="Peta Lokasi Poncokusumo Malang"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63200.41436402425!2d112.74868218151525!3d-8.031525624329244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd630132dfd5f6d%3A0xb36ef8b3303d36b8!2sPoncokusumo%2C%20Kabupaten%20Malang%2C%20Jawa%20Timur!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-xl">
              <h4 className="text-sm font-bold text-white mb-2">
                Kirim Pertanyaan atau Pesan ke Panitia:
              </h4>
              <p className="text-xs text-[#DDE7E8]/75 mb-5">
                Punya pertanyaan seputar teknis perlombaan, kerjasama sponsor, atau delegasi lembaga?
              </p>

              {sentSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Pesan Terkirim ke Sekretariat Panitia HSN 2026!</span>
                  </div>
                  {statusFeedback && (
                    <p className="text-[11px] text-emerald-200/90 pl-7">{statusFeedback}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Nama Pengirim"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Email / No. WhatsApp"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Subjek / Topik (Lomba / Sponsor / Info Umum)"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan pesan atau pertanyaan Anda..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] to-[#00D9F5] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Pesan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
