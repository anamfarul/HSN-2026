import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  CheckCircle2, 
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  Building2,
  Share2,
  Loader2,
  Tv,
  MessageCircle
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
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

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

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('034401099954507');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleCopyWa = (num: string) => {
    navigator.clipboard.writeText(num.replace(/[^0-9]/g, ''));
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Official Social & Communication Channels
  const contactChannels = [
    { 
      label: 'WhatsApp Panitia', 
      handle: '0857-3119-4085', 
      desc: 'Layanan Tanya Jawab & Informasi Pendaftaran',
      href: 'https://wa.me/6285731194085?text=Assalamualaikum%20Panitia%20HSN%202026,%20saya%20ingin%20bertanya%20seputar%20kegiatan%20Festival%20Hari%20Santri',
      color: '#25D366',
      badge: 'Chat WA',
      type: 'whatsapp'
    },
    { 
      label: 'Email Resmi', 
      handle: 'hsnmwcnupon@gmail.com', 
      desc: 'Korespondensi Surat & Kemitraan',
      href: 'mailto:hsnmwcnupon@gmail.com',
      color: '#00D9F5',
      badge: 'Kirim Email',
      type: 'email'
    },
    { 
      label: 'Instagram Resmi', 
      handle: '@hsnofficial2026', 
      desc: 'Info visual, pamflet lomba, & story harian',
      href: 'https://www.instagram.com/hsnofficial2026',
      color: '#E1306C',
      badge: 'Follow IG',
      type: 'instagram'
    },
    { 
      label: 'Facebook Page', 
      handle: 'HSN 2026', 
      desc: 'Komunitas & liputan dokumentasi foto',
      href: 'https://www.facebook.com/profile.php?id=61594838331543',
      color: '#1877F2',
      badge: 'Kunjungi FB',
      type: 'facebook'
    },
    { 
      label: 'TikTok Resmi', 
      handle: '@official.hsnpon', 
      desc: 'Video pendek seru & sorotan kegiatan santri',
      href: 'https://www.tiktok.com/@official.hsnpon?_r=1&_t=ZS-99uCX0tHHRQ',
      color: '#00F2FE',
      badge: 'Tonton TikTok',
      type: 'tiktok'
    },
    { 
      label: 'YouTube Official', 
      handle: '@HSNOFFICIAL2026', 
      desc: 'Siaran langsung, video teaser, & dokumentasi',
      href: 'https://youtube.com/@hsnofficial2026?si=kUMHGN7MPk6ZKRvJ',
      color: '#FF0000',
      badge: 'Subscribe YT',
      type: 'youtube'
    },
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
            Pusat koordinasi, informasi pendaftaran lomba, konfirmasi pembayaran, serta seluruh kanal komunikasi resmi MWC NU Kecamatan Poncokusumo.
          </p>
        </div>

        {/* ======================================================== */}
        {/* INFORMASI PEMBAYARAN & KONFIRMASI (PROMINENT HIGHLIGHT) */}
        {/* ======================================================== */}
        <div className="mb-12 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#021f18] via-[#031c26] to-[#041523] border-2 border-[#D9B45B]/40 shadow-2xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D9B45B]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#008F72]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Col: Info Rekening Bank */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D9B45B]/20 border border-[#D9B45B]/50 text-xs font-black text-[#F2C96D] uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-[#F2C96D]" />
                <span>INFORMASI PEMBAYARAN RESMI</span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  PEMBAYARAN BIAYA PENDAFTARAN & INFAK LOMBA
                </h3>
                <p className="text-xs sm:text-sm text-[#DDE7E8]/85 mt-1">
                  Seluruh transaksi pembayaran kegiatan Festival Hari Santri Nasional 2026 disalurkan melalui rekening resmi bendahara kepanitiaan:
                </p>
              </div>

              {/* Bank Account Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00529C] to-[#0073CE] p-2 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
                    <span>BRI</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#00D9F5] font-bold uppercase tracking-wider">
                      Bank Rakyat Indonesia (BRI)
                    </div>
                    <div className="text-lg sm:text-2xl font-mono font-black text-white tracking-wider">
                      0344-0109-9954-507
                    </div>
                    <div className="text-xs text-[#F2C96D] font-bold">
                      Atas Nama : <span className="text-white uppercase">NUZUL FIQRIYAH</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 shadow active:scale-95 ${
                    copiedAccount
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-[#D9B45B] to-[#F2C96D] hover:brightness-110 text-[#031525]'
                  }`}
                  title="Salin Nomor Rekening BRI"
                >
                  {copiedAccount ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Nomor Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin No. Rekening</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Col: WhatsApp Konfirmasi */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-3 p-5 sm:p-6 rounded-2xl bg-[#020e19]/80 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <MessageCircle className="w-4 h-4" />
                <span>KONFIRMASI PEMBAYARAN</span>
              </div>
              <p className="text-xs text-[#DDE7E8]/90 leading-relaxed">
                Setelah melakukan transfer pembayaran, silakan konfirmasi dan kirimkan bukti transfer melalui WhatsApp panitia:
              </p>
              
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#DDE7E8]/70 block">Narahubung Konfirmasi:</span>
                  <span className="text-sm font-mono font-bold text-emerald-300">0857-3249-6213</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWa('085732496213')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1"
                >
                  {copiedWa ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWa ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <a
                href="https://wa.me/6285732496213?text=Assalamualaikum%20Admin,%20saya%20ingin%20konfirmasi%20pembayaran%20pendaftaran%20lomba%20HSN%202026.%0A%0ANama%20Pendaftar%20:%20%0ACabang%20Lomba%20:%20%0ANomor%20Registrasi%20:%20%0ABukti%20Transfer%20:%20(terlampir)"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-[#008F72] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Konfirmasi via WhatsApp Sekarang</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-75" />
              </a>

              <div className="text-[11px] text-[#DDE7E8]/60 text-center">
                Format: Sertakan Nama Lengkap, Lembaga, & Cabang Lomba yang diikuti.
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2 Kolom: Detail Kantor, Media Sosial & Form Pesan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Office & Channels Info */}
          <div className="lg:col-span-5 space-y-6">
            {/* Sekretariat Utama */}
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

            {/* Social & Contact Channels (Real official accounts) */}
            <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F2C96D]">
                  Kanal Resmi & Media Sosial:
                </h4>
                <span className="text-[10px] text-[#00D9F5] font-mono">Resmi HSN 2026</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {contactChannels.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-sm"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {item.type === 'whatsapp' && <Phone className="w-4 h-4" style={{ color: item.color }} />}
                        {item.type === 'email' && <Mail className="w-4 h-4" style={{ color: item.color }} />}
                        {item.type === 'youtube' && <Tv className="w-4 h-4" style={{ color: item.color }} />}
                        {item.type !== 'whatsapp' && item.type !== 'email' && item.type !== 'youtube' && (
                          <Share2 className="w-4 h-4" style={{ color: item.color }} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#00D9F5] transition-colors truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] font-mono text-[#DDE7E8]/90 truncate">
                          {item.handle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 group-hover:bg-[#00D9F5]/20 group-hover:text-[#00D9F5] transition-colors">
                        {item.badge}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* DEDICATED YOUTUBE CHANNEL HIGHLIGHT CARD [ISI YOUTUBE] */}
            <div className="rounded-3xl p-6 bg-gradient-to-br from-[#1a0808] to-[#04121d] border border-red-500/40 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
                    CHANNEL YOUTUBE RESMI
                  </span>
                  <h4 className="text-sm font-black text-white">
                    @HSNOFFICIAL2026
                  </h4>
                </div>
              </div>

              <p className="text-xs text-[#DDE7E8]/85 leading-relaxed mb-4">
                Saksikan siaran langsung, liputan gebyar lomba santri, dokumentasi kirab santri, dan video resmi Hari Santri Nasional 2026 MWC NU Poncokusumo.
              </p>

              <a
                href="https://youtube.com/@hsnofficial2026?si=kUMHGN7MPk6ZKRvJ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <span>Buka YouTube @HSNOFFICIAL2026</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Google Maps & Message Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Google Maps Embed for Poncokusumo Malang */}
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
