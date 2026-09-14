import React, { useState, useEffect } from 'react';
import { CategoryGeneration, Competition, ParticipantRegistration } from '../types';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Upload, 
  FileCheck, 
  Download, 
  FileDown,
  QrCode, 
  Printer,
  ShieldCheck,
  User,
  School,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Database,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateRegistrationTicketPDF, printElementSafely } from '../lib/pdfGenerator';
import { 
  insertParticipantToSupabase, 
  uploadFileToSupabaseStorage,
  isSupabaseConnected 
} from '../lib/supabaseClient';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitions: Competition[];
  initialCategory?: CategoryGeneration;
  initialCompetition?: Competition | null;
  onSuccessRegister: (newParticipant: ParticipantRegistration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  competitions,
  initialCategory = 'SMP/MTs',
  initialCompetition = null,
  onSuccessRegister,
}) => {
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [category, setCategory] = useState<CategoryGeneration>(initialCategory);
  const [birthDate, setBirthDate] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<ParticipantRegistration | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Supabase Database Sync Feedback State
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<{
    status: 'idle' | 'pending' | 'synced' | 'local_only' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  const handlePaymentProofChange = (file: File | null) => {
    if (!file) {
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
      return;
    }
    setPaymentProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPaymentProofPreview(null);
    }
  };

  const handleRemovePaymentProof = () => {
    setPaymentProofFile(null);
    setPaymentProofPreview(null);
  };

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialCompetition) {
      setCategory(initialCompetition.category);
      setSelectedCompId(initialCompetition.id);
    }
  }, [initialCompetition]);

  // Filter competitions matching chosen category
  const availableCompetitions = competitions.filter(
    (c) => c.category === category
  );

  useEffect(() => {
    // If current selectedCompId is not in availableCompetitions, auto pick first or reset
    if (availableCompetitions.length > 0) {
      if (!availableCompetitions.some((c) => c.id === selectedCompId)) {
        setSelectedCompId(availableCompetitions[0].id);
      }
    } else {
      setSelectedCompId('');
    }
  }, [category, availableCompetitions, selectedCompId]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!fullName.trim()) newErrors.fullName = 'Nama lengkap wajib diisi';
    if (!institution.trim()) newErrors.institution = 'Nama lembaga/pesantren/sekolah wajib diisi';
    if (!birthDate) newErrors.birthDate = 'Tanggal lahir wajib diisi';
    if (!whatsapp.trim()) newErrors.whatsapp = 'Nomor WhatsApp aktif wajib diisi';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Email valid wajib diisi';
    if (!address.trim()) newErrors.address = 'Alamat domisili lengkap wajib diisi';
    if (!selectedCompId) newErrors.selectedCompId = 'Pilih salah satu cabang lomba';
    if (!agreed) newErrors.agreed = 'Anda harus menyetujui keabsahan data';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Generate standard registration code e.g. HSN26-SMP-0042
      const catCode = category.split('/')[0].replace(/[^A-Za-z]/g, '').toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const regNumber = `HSN26-${catCode}-${randomNum}`;

      const matchedComp = competitions.find((c) => c.id === selectedCompId);

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

      let finalPaymentProofUrl = paymentProofPreview || undefined;
      let finalDocUrl: string | undefined = undefined;

      // 1. Upload Bukti Pembayaran ke Supabase Storage jika ada file
      if (paymentProofFile) {
        try {
          const uploadRes = await uploadFileToSupabaseStorage('registrations', 'payment_proofs', paymentProofFile);
          if (uploadRes.success && uploadRes.url) {
            finalPaymentProofUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.info('Supabase payment upload fallback to data preview:', uploadErr);
        }
      }

      // 2. Upload Dokumen Mandat ke Supabase Storage jika ada file
      if (documentFile) {
        try {
          const docUploadRes = await uploadFileToSupabaseStorage('registrations', 'mandates', documentFile);
          if (docUploadRes.success && docUploadRes.url) {
            finalDocUrl = docUploadRes.url;
          }
        } catch (docErr) {
          console.info('Supabase doc upload fallback:', docErr);
        }
      }

      const newRecord: ParticipantRegistration = {
        id: `reg-${Date.now()}`,
        registrationNumber: regNumber,
        fullName: fullName.trim(),
        institution: institution.trim(),
        category,
        birthDate,
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        address: address.trim(),
        competitionId: selectedCompId,
        competitionTitle: matchedComp ? matchedComp.title : 'Perlombaan HSN 2026',
        documentName: documentFile ? documentFile.name : 'surat_keterangan_mandat.pdf',
        documentUrl: finalDocUrl,
        paymentProofName: paymentProofFile ? paymentProofFile.name : undefined,
        paymentProofUrl: finalPaymentProofUrl,
        registeredAt: dateStr,
        status: 'Terverifikasi',
      };

      onSuccessRegister(newRecord);
      setCreatedTicket(newRecord);
      setIsSubmitting(false);

      // Persist to Supabase with transparent status tracking
      if (!isSupabaseConnected()) {
        setSupabaseSyncStatus({
          status: 'local_only',
          message: 'Kredensial Supabase (URL & Anon Key) belum dihubungkan di CMS Admin. Data tersimpan di penyimpanan lokal.',
        });
      } else {
        setSupabaseSyncStatus({
          status: 'pending',
          message: 'Menghubungkan & menyimpan data pendaftaran ke Cloud Database Supabase...',
        });

        insertParticipantToSupabase(newRecord).then((res) => {
          if (res.success) {
            setSupabaseSyncStatus({
              status: 'synced',
              message: 'Data registrasi resmi tersimpan di Cloud Database Supabase (tabel participants).',
            });
          } else {
            setSupabaseSyncStatus({
              status: 'error',
              message: res.error || 'Gagal menyimpan data ke Supabase.',
            });
          }
        });
      }

      // Automatically generate PDF ready for download
      try {
        const gen = generateRegistrationTicketPDF(newRecord);
        if (gen.url) {
          setPdfDownloadUrl(gen.url);
        }
      } catch (e) {
        console.warn('Auto PDF generation note:', e);
      }

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00D9F5', '#D9B45B', '#006B4F', '#F2C96D'],
        });
      } catch (err) {
        console.error('Confetti error:', err);
      }
    } catch (submitErr) {
      console.error('Submit error:', submitErr);
      setIsSubmitting(false);
    }
  };

  const handleRetrySupabaseSync = async () => {
    if (!createdTicket) return;
    setIsRetryingSync(true);
    setSupabaseSyncStatus({
      status: 'pending',
      message: 'Mencoba menyimpan ulang data ke Cloud Database Supabase...',
    });

    try {
      const res = await insertParticipantToSupabase(createdTicket);
      if (res.success) {
        setSupabaseSyncStatus({
          status: 'synced',
          message: 'Sukses! Data registrasi resmi tersimpan di Cloud Database Supabase (tabel participants).',
        });
      } else {
        setSupabaseSyncStatus({
          status: 'error',
          message: res.error || 'Gagal menyimpan ke Supabase.',
        });
      }
    } catch (err: any) {
      setSupabaseSyncStatus({
        status: 'error',
        message: err?.message || 'Terjadi kesalahan saat menghubungi Supabase.',
      });
    } finally {
      setIsRetryingSync(false);
    }
  };

  const handlePrintTicket = () => {
    printElementSafely('printable-registration-ticket');
  };

  const handleSavePDFTicket = () => {
    if (!createdTicket) return;
    setIsGeneratingPDF(true);
    try {
      const result = generateRegistrationTicketPDF(createdTicket);
      if (result.success) {
        setPdfNotice(`Berkas ${result.filename} berhasil diunduh.`);
        if (result.url) setPdfDownloadUrl(result.url);
      } else {
        // Fallback to printer dialog
        printElementSafely('printable-registration-ticket');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      printElementSafely('printable-registration-ticket');
    } finally {
      setIsGeneratingPDF(false);
      setTimeout(() => setPdfNotice(null), 5000);
    }
  };

  const handleDownloadTicketText = () => {
    if (!createdTicket) return;
    const ticketText = `=====================================================
KARTU BUKTI REGISTRASI RESMI
FESTIVAL HARI SANTRI NASIONAL 2026
MWC NU KECAMATAN PONCOKUSUMO - KABUPATEN MALANG
"Mengawal Indonesia Merdeka Menuju Peradaban Dunia"
=====================================================
NOMOR REGISTRASI : ${createdTicket.registrationNumber}
STATUS           : ${createdTicket.status.toUpperCase()}
TANGGAL DAFTAR   : ${createdTicket.registeredAt}

DATA PESERTA:
Nama Lengkap     : ${createdTicket.fullName}
Asal Lembaga     : ${createdTicket.institution}
Kategori Usia    : ${createdTicket.category}
Tanggal Lahir    : ${createdTicket.birthDate}
Nomor WhatsApp   : ${createdTicket.whatsapp}
Email            : ${createdTicket.email}
Alamat           : ${createdTicket.address}

CABANG PERLOMBAAN:
Lomba Terpilih   : ${createdTicket.competitionTitle}
Dokumen Unggahan : ${createdTicket.documentName || '-'}
Bukti Pembayaran : ${createdTicket.paymentProofName || 'Tidak dilampirkan (Bisa diserahkan saat TM / Lomba Gratis)'}

KETENTUAN PENTING:
1. Harap simpan bukti pendaftaran ini (cetak atau digital).
2. Tunjukkan bukti registrasi pada saat Technical Meeting dan registrasi ulang.
3. Seluruh peserta wajib menaati tata tertib & etika santri Ahlussunnah wal Jama'ah.

Sekretariat Panitia HSN 2026:
MWC NU Kecamatan Poncokusumo, Kabupaten Malang, Jawa Timur.
=====================================================`;

    const blob = new Blob([ticketText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TIKET_${createdTicket.registrationNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#006B4F]/40 via-[#031525] to-[#008F72]/30 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D9F5]/20 border border-[#00D9F5]/40 flex items-center justify-center text-[#00D9F5]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#00D9F5] block">
                PORTAL PENDAFTARAN RESMI
              </span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white">
                {createdTicket ? 'Bukti Registrasi Peserta' : 'Formulir Pendaftaran HSN 2026'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Tutup form pendaftaran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1">
          {createdTicket ? (
            /* SUCCESS TICKET VIEW */
            <div className="space-y-6">
              {pdfNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-300 text-xs font-semibold animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{pdfNotice}</span>
                  </div>
                  {pdfDownloadUrl && (
                    <a
                      href={pdfDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Buka PDF</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Supabase Database Persistence Status Banner */}
              {supabaseSyncStatus.status !== 'idle' && (
                <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  supabaseSyncStatus.status === 'synced'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 shadow-lg'
                    : supabaseSyncStatus.status === 'pending'
                    ? 'bg-sky-950/80 border-[#00D9F5]/50 text-sky-200 animate-pulse shadow-lg'
                    : supabaseSyncStatus.status === 'local_only'
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-200 shadow-lg'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-200 shadow-lg'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <Database className={`w-4 h-4 shrink-0 mt-0.5 ${
                      supabaseSyncStatus.status === 'synced' ? 'text-emerald-400' :
                      supabaseSyncStatus.status === 'pending' ? 'text-[#00D9F5]' :
                      supabaseSyncStatus.status === 'local_only' ? 'text-amber-400' : 'text-rose-400'
                    }`} />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>
                          {supabaseSyncStatus.status === 'synced' && 'Tersimpan di Cloud Database Supabase (Live)'}
                          {supabaseSyncStatus.status === 'pending' && 'Menghubungkan ke Supabase...'}
                          {supabaseSyncStatus.status === 'local_only' && 'Status Database: Penyimpanan Lokal'}
                          {supabaseSyncStatus.status === 'error' && 'Peringatan: Gagal Menyimpan ke Database Supabase'}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {supabaseSyncStatus.message}
                      </p>
                    </div>
                  </div>

                  {supabaseSyncStatus.status === 'error' && (
                    <button
                      type="button"
                      onClick={handleRetrySupabaseSync}
                      disabled={isRetryingSync}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? 'animate-spin' : ''}`} />
                      <span>{isRetryingSync ? 'Mencoba...' : 'Coba Kirim Ulang'}</span>
                    </button>
                  )}
                </div>
              )}

              <div 
                id="printable-registration-ticket" 
                className="p-6 rounded-3xl bg-gradient-to-br from-[#006B4F]/25 via-[#031525] to-[#008F72]/20 border-2 border-[#D9B45B] shadow-2xl relative overflow-hidden"
              >
                {/* Tech Corner Markers */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#00D9F5]" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#00D9F5]" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#00D9F5]" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#00D9F5]" />

                <div className="text-center pb-4 border-b border-white/15">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase mb-2 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pendaftaran Sukses & Terverifikasi</span>
                  </div>
                  <div className="text-[10px] tracking-widest text-[#DDE7E8]/70 uppercase">
                    NOMOR REGISTRASI PESERTA
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-[#F2C96D] tracking-wider my-1 drop-shadow">
                    {createdTicket.registrationNumber}
                  </div>
                  <div className="text-xs text-white/80 font-semibold">
                    {createdTicket.competitionTitle}
                  </div>
                </div>

                {/* Ticket Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Nama Peserta</span>
                    <span className="text-white font-bold">{createdTicket.fullName}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Asal Lembaga/Sekolah</span>
                    <span className="text-white font-semibold">{createdTicket.institution}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Kategori Generasi</span>
                    <span className="text-[#00D9F5] font-bold">{createdTicket.category}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">WhatsApp / Kontak</span>
                    <span className="text-white font-medium">{createdTicket.whatsapp}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Waktu Registrasi</span>
                    <span className="text-white/90">{createdTicket.registeredAt}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Status Berkas</span>
                    <span className="text-emerald-400 font-bold">{createdTicket.status}</span>
                  </div>
                  <div className="sm:col-span-2 pt-1 border-t border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-white/60 block text-[10px] uppercase font-bold">Bukti Pembayaran / Infaq</span>
                      {createdTicket.paymentProofName ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]" title={createdTicket.paymentProofName}>
                            Terlampir: {createdTicket.paymentProofName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/50 text-xs italic">
                          Belum dilampirkan (Dapat diserahkan saat TM / Lomba Gratis)
                        </span>
                      )}
                    </div>
                    {createdTicket.paymentProofUrl && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={createdTicket.paymentProofUrl} 
                          alt="Thumbnail Bukti" 
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Barcode / QR Section */}
                <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white p-1 rounded-xl flex items-center justify-center shadow">
                      <QrCode className="w-12 h-12 text-[#031525]" />
                    </div>
                    <div className="text-[11px] text-[#DDE7E8]/80 leading-tight">
                      <strong className="text-white block font-semibold">Validasi Barcode Digital</strong>
                      Pindai saat verifikasi kehadiran di meja panitia pelaksana.
                    </div>
                  </div>
                  <div className="text-right font-mono text-[9px] text-[#D9B45B]">
                    MWC NU PONCOKUSUMO<br />HSN 2026 OFFICIAL
                  </div>
                </div>
              </div>

              {/* Action Buttons for Ticket */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadTicketText}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/15 transition-all flex items-center gap-1.5"
                  title="Simpan ringkasan format teks biasa"
                >
                  <Download className="w-3.5 h-3.5 text-[#DDE7E8]" />
                  <span>Format .txt</span>
                </button>

                {pdfDownloadUrl && (
                  <a
                    href={pdfDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#00D9F5] bg-[#00D9F5]/10 hover:bg-[#00D9F5]/20 border border-[#00D9F5]/30 transition-all flex items-center gap-1.5"
                    title="Buka dokumen PDF resmi di jendela baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka PDF</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handlePrintTicket}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-all flex items-center gap-1.5"
                  title="Cetak langsung menggunakan printer atau dialog cetak peramban"
                >
                  <Printer className="w-4 h-4 text-[#F2C96D]" />
                  <span>Cetak Langsung</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePDFTicket}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 active:scale-95 shadow-lg shadow-[#00D9F5]/25 transition-all flex items-center gap-2"
                  title="Cetak & Unduh Dokumen PDF Bukti Registrasi Resmi"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#031525] border-t-transparent rounded-full animate-spin" />
                      <span>Membuat PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-[#031525]" />
                      <span>Cetak / Simpan PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#DDE7E8] bg-white/10 hover:bg-white/20 transition-all"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM VIEW */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00D9F5] mb-1.5">
                  1. Pilih Kategori Peserta:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['PAUD/TK', 'SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'IPNU/IPPNU', 'FATAYAT', 'MUSLIMAT'] as CategoryGeneration[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        category === cat
                          ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border border-[#D9B45B] shadow'
                          : 'bg-white/5 text-[#DDE7E8] hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lomba Dropdown based on Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00D9F5] mb-1.5">
                  2. Cabang Lomba Terkait ({category}):
                </label>
                {availableCompetitions.length > 0 ? (
                  <select
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#020e19] border border-white/20 focus:border-[#00D9F5] text-white focus:outline-none"
                  >
                    {availableCompetitions.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#031525] text-white">
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-[#F2C96D] p-3 rounded-xl bg-white/5 border border-white/10">
                    Tidak ada lomba khusus untuk kategori ini saat ini. Pendaftaran dibuka untuk kepesertaan umum.
                  </div>
                )}
                {errors.selectedCompId && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.selectedCompId}</p>
                )}
              </div>

              {/* Form Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Nama Lengkap / Nama Tim <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap peserta"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none"
                    />
                    <User className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.fullName && <p className="text-[11px] text-rose-400 mt-0.5">{errors.fullName}</p>}
                </div>

                {/* Institution */}
                <div>
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Asal Lembaga / Pesantren / Sekolah <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Contoh: PP. Mambaul Ulum / MTs NU"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none"
                    />
                    <School className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.institution && <p className="text-[11px] text-rose-400 mt-0.5">{errors.institution}</p>}
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Tanggal Lahir <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white focus:outline-none"
                    />
                    <Calendar className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.birthDate && <p className="text-[11px] text-rose-400 mt-0.5">{errors.birthDate}</p>}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Nomor WhatsApp Aktif <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.whatsapp && <p className="text-[11px] text-rose-400 mt-0.5">{errors.whatsapp}</p>}
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Alamat Email (Untuk Pengiriman Bukti) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="santri@pesantren.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none"
                    />
                    <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.email && <p className="text-[11px] text-rose-400 mt-0.5">{errors.email}</p>}
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#DDE7E8] mb-1">
                    Alamat Lengkap / Domisili Desa di Poncokusumo <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Contoh: Dusun Krajan, RT 02 RW 01 Desa Poncokusumo"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#020e19] border border-white/15 focus:border-[#00D9F5] text-white placeholder-white/40 focus:outline-none"
                    />
                    <MapPin className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.address && <p className="text-[11px] text-rose-400 mt-0.5">{errors.address}</p>}
                </div>
              </div>

              {/* Upload Section: Dokumen Pendukung & Bukti Pembayaran */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Dokumen Pendukung */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#DDE7E8]">
                        Dokumen Pendukung
                      </label>
                      <span className="text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                        Opsional
                      </span>
                    </div>
                    <div className="relative border-2 border-dashed border-white/20 hover:border-[#00D9F5]/60 rounded-2xl p-3.5 text-center cursor-pointer transition-colors bg-white/5 min-h-[110px] flex items-center justify-center">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setDocumentFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload Dokumen Pendukung"
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        {documentFile ? (
                          <>
                            <FileCheck className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs font-bold text-white line-clamp-1 max-w-[180px]" title={documentFile.name}>
                              {documentFile.name}
                            </span>
                            <span className="text-[10px] text-emerald-400">Berkas terpilih • Klik ganti</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-[#00D9F5]" />
                            <span className="text-xs font-semibold text-white">
                              Upload Surat Mandat / Santri
                            </span>
                            <span className="text-[10px] text-white/50">PDF, JPG, PNG (Maks. 10MB)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bukti Pembayaran (Opsional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#DDE7E8] flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-[#F2C96D]" />
                        <span>Bukti Pembayaran</span>
                      </label>
                      <span className="text-[10px] text-[#F2C96D] bg-[#D9B45B]/15 px-1.5 py-0.5 rounded font-bold border border-[#D9B45B]/30">
                        Opsional
                      </span>
                    </div>

                    <div className={`relative border-2 border-dashed ${
                      paymentProofFile 
                        ? 'border-emerald-500/60 bg-emerald-950/20' 
                        : 'border-white/20 hover:border-[#F2C96D]/60 bg-white/5'
                    } rounded-2xl p-3.5 text-center transition-all min-h-[110px] flex items-center justify-center overflow-hidden`}>
                      {!paymentProofFile && (
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handlePaymentProofChange(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title="Upload Bukti Pembayaran (Opsional)"
                        />
                      )}

                      {paymentProofFile ? (
                        <div className="flex items-center gap-2.5 w-full text-left">
                          {paymentProofPreview ? (
                            <img
                              src={paymentProofPreview}
                              alt="Bukti Transfer"
                              className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                              <Receipt className="w-6 h-6 text-emerald-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Bukti Terunggah</span>
                            <p className="text-xs font-semibold text-white truncate" title={paymentProofFile.name}>
                              {paymentProofFile.name}
                            </p>
                            <span className="text-[10px] text-white/50">
                              {(paymentProofFile.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePaymentProof}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors shrink-0 z-20"
                            title="Hapus berkas bukti pembayaran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Receipt className="w-5 h-5 text-[#F2C96D]" />
                          <span className="text-xs font-semibold text-white">
                            Upload Bukti Transfer / Infaq
                          </span>
                          <span className="text-[10px] text-white/50">JPG, PNG, PDF (Boleh Dikosongkan)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Helpful note for participants */}
                <p className="text-[11px] text-[#DDE7E8]/70 flex items-start sm:items-center gap-1.5 bg-white/5 p-2 rounded-xl border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D9F5] shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    <strong>Catatan:</strong> Pengunggahan bukti pembayaran bersifat <em>opsional</em>. Untuk cabang lomba gratis atau jika pembayaran infaq dilakukan tunai saat Technical Meeting (TM), kolom ini dapat dikosongkan.
                  </span>
                </p>
              </div>

              {/* Consent Agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2 text-xs text-[#DDE7E8]/90 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 text-[#006B4F] focus:ring-[#00D9F5]"
                  />
                  <span>
                    Saya menyatakan data yang diisikan adalah benar dan bersedia mengikuti seluruh tata tertib serta juknis yang ditetapkan Panitia Festival HSN 2026 MWC NU Poncokusumo.
                  </span>
                </label>
                {errors.agreed && <p className="text-[11px] text-rose-400 mt-1">{errors.agreed}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#DDE7E8] bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 active:scale-95 shadow-lg shadow-[#00D9F5]/30 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#031525] border-t-transparent rounded-full animate-spin" />
                      <span>Memproses Data...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Kirim Pendaftaran & Buat Tiket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
