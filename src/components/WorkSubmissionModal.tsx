import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Printer, 
  FileDown,
  Edit3, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  Search, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Trophy, 
  User, 
  Tag, 
  HelpCircle,
  Check,
  RefreshCw,
  Bell,
  Calendar,
  Tv
} from 'lucide-react';
import { ParticipantRegistration } from '../types';
import { generateWorkSubmissionPDF, printElementSafely } from '../lib/pdfGenerator';
import { uploadFileToSupabaseStorage, searchParticipantByRegNumberInSupabase } from '../lib/supabaseClient';
import { compressImageFile, formatFileSize } from '../lib/imageCompressor';

interface WorkSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantRegistration[];
  onSaveWorkSubmission?: (
    registrationNumber: string,
    workData: {
      workSubmissionType: 'file' | 'drive';
      workFileName?: string;
      workFileUrl?: string;
      workDriveUrl?: string;
      workNotes?: string;
    }
  ) => Promise<{ success: boolean; error?: string }> | void;
  onSaveWork?: (
    registrationNumber: string,
    workData: {
      workSubmissionType: 'file' | 'drive';
      workFileName?: string;
      workFileUrl?: string;
      workDriveUrl?: string;
      workNotes?: string;
    }
  ) => Promise<{ success: boolean; error?: string }> | void;
  initialRegistrationNumber?: string;
}

export const WorkSubmissionModal: React.FC<WorkSubmissionModalProps> = ({
  isOpen,
  onClose,
  participants,
  onSaveWorkSubmission,
  onSaveWork,
  initialRegistrationNumber = '',
}) => {
  // Input form state
  const [regInput, setRegInput] = useState<string>(initialRegistrationNumber);
  const [submissionType, setSubmissionType] = useState<'file' | 'drive'>('file');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileCompressionInfo, setFileCompressionInfo] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [driveUrl, setDriveUrl] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>('');
  const [remoteParticipant, setRemoteParticipant] = useState<ParticipantRegistration | null>(null);
  const [isSearchingRemote, setIsSearchingRemote] = useState<boolean>(false);

  // Mode Edit control
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // State untuk Pratinjau Cetak & Download Dokumen Formulir Tanda Terima Karya
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string>('');
  const [printFeedback, setPrintFeedback] = useState<string>('');

  // Sync initial registration number when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialRegistrationNumber) {
        setRegInput(initialRegistrationNumber);
      }
      setNotification(null);
    }
  }, [isOpen, initialRegistrationNumber]);

  // Find matching participant based on regInput
  const matchedParticipant = useMemo(() => {
    if (!regInput || !regInput.trim()) return null;
    const cleanQuery = regInput.trim().toLowerCase();
    const local = participants.find((p) => {
      const pReg = (p.registrationNumber || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      return pReg === cleanQuery || pId === cleanQuery;
    });
    if (local) return local;
    if (remoteParticipant) {
      const rReg = (remoteParticipant.registrationNumber || '').toLowerCase();
      const rId = (remoteParticipant.id || '').toLowerCase();
      if (rReg === cleanQuery || rId === cleanQuery) return remoteParticipant;
    }
    return null;
  }, [regInput, participants, remoteParticipant]);

  // Data peserta terkini untuk dokumen formulir cetak (didefinisikan di atas bersama hooks lainnya)
  const participantForPrint: ParticipantRegistration | null = useMemo(() => {
    if (!matchedParticipant) return null;
    return {
      ...matchedParticipant,
      workSubmissionType: submissionType,
      workFileName: imageFile ? imageFile.name : (matchedParticipant.workFileName || 'karya_peserta.jpg'),
      workFileUrl: imagePreview || matchedParticipant.workFileUrl,
      workDriveUrl: driveUrl.trim() || matchedParticipant.workDriveUrl,
      workNotes: workNotes.trim() || matchedParticipant.workNotes,
      workSubmittedAt: matchedParticipant.workSubmittedAt || new Date().toLocaleString('id-ID'),
    };
  }, [matchedParticipant, submissionType, imageFile, imagePreview, driveUrl, workNotes]);

  // Pencarian otomatis ke Supabase jika nomor registrasi belum ada di memori lokal
  useEffect(() => {
    if (!regInput || !regInput.trim()) {
      setRemoteParticipant(null);
      return;
    }
    const cleanQuery = regInput.trim().toLowerCase();
    const local = participants.find((p) => {
      const pReg = (p.registrationNumber || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      return pReg === cleanQuery || pId === cleanQuery;
    });
    if (local) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const { data } = await searchParticipantByRegNumberInSupabase(regInput.trim());
        if (isMounted && data) {
          setRemoteParticipant(data);
        }
      } catch (_) {
      } finally {
        if (isMounted) setIsSearchingRemote(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [regInput, participants]);

  // Preload existing work data if participant already submitted work
  useEffect(() => {
    if (matchedParticipant) {
      if (matchedParticipant.workSubmissionType) {
        setSubmissionType(matchedParticipant.workSubmissionType);
      }
      if (matchedParticipant.workFileUrl) {
        setImagePreview(matchedParticipant.workFileUrl);
      } else {
        setImagePreview('');
      }
      if (matchedParticipant.workDriveUrl) {
        setDriveUrl(matchedParticipant.workDriveUrl);
      } else {
        setDriveUrl('');
      }
      if (matchedParticipant.workNotes) {
        setWorkNotes(matchedParticipant.workNotes);
      } else {
        setWorkNotes('');
      }

      // If work is already submitted, default to view mode (isEditMode: false) until user clicks Edit
      if (matchedParticipant.workSubmittedAt || matchedParticipant.workFileUrl || matchedParticipant.workDriveUrl) {
        setIsEditMode(false);
      } else {
        setIsEditMode(true);
      }
    } else {
      // Clear fields if no participant matched
      setImageFile(null);
      setImagePreview('');
      setFileCompressionInfo('');
      setDriveUrl('');
      setWorkNotes('');
      setIsEditMode(true);
    }
  }, [matchedParticipant]);

  if (!isOpen) return null;

  // Determine status and eligibility
  const statusStr = matchedParticipant ? (matchedParticipant.status || 'Menunggu') : '';
  const isVerified = statusStr.toLowerCase() === 'terverifikasi';
  const isRejected = statusStr.toLowerCase() === 'ditolak';
  const isWaiting = !isVerified && !isRejected;
  // Peserta berhak mengunggah karya jika terdaftar dan berkas pendaftaran tidak ditolak
  const canSubmitWork = !!matchedParticipant && !isRejected;

  // Handle file select (JPG / PNG) dengan kompresi otomatis di sisi klien
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setNotification({
        type: 'error',
        message: 'Format file tidak didukung. Harap pilih gambar dengan format JPG atau PNG.',
      });
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setNotification({
        type: 'error',
        message: 'Ukuran file terlalu besar. Maksimal ukuran file gambar awal adalah 15 MB.',
      });
      return;
    }

    setIsCompressing(true);
    setNotification(null);
    try {
      const compressed = await compressImageFile(file, 1600, 1600, 0.82);
      setImageFile(compressed.file);
      setImagePreview(compressed.dataUrl);
      setFileCompressionInfo(
        `${formatFileSize(compressed.compressedSize)} (Dioptimasi dari ${formatFileSize(compressed.originalSize)})`
      );
    } catch (compressErr) {
      console.warn('Fallback kompresi gambar:', compressErr);
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit / Kirim Karya
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedParticipant) {
      setNotification({
        type: 'error',
        message: 'Nomor registrasi tidak ditemukan. Pastikan Anda memasukkan nomor registrasi yang valid.',
      });
      return;
    }

    if (!canSubmitWork) {
      setNotification({
        type: 'error',
        message: 'Pengunggahan karya tidak dapat dilakukan karena status pendaftaran dinyatakan ditolak. Silakan hubungi narahubung panitia.',
      });
      return;
    }

    // Validate work submission payload
    let finalFileUrl = imagePreview || matchedParticipant.workFileUrl || '';
    let finalFileName = imageFile ? imageFile.name : (matchedParticipant.workFileName || 'karya_peserta.jpg');
    let finalDriveUrl = driveUrl.trim();

    if (submissionType === 'file') {
      if (!imageFile && !finalFileUrl) {
        setNotification({
          type: 'error',
          message: 'Harap pilih berkas karya gambar (JPG/PNG) untuk dikirimkan.',
        });
        return;
      }
    } else {
      if (!finalDriveUrl) {
        setNotification({
          type: 'error',
          message: 'Harap masukkan tautan link Google Drive berkas karya Anda.',
        });
        return;
      }
      if (!finalDriveUrl.startsWith('http://') && !finalDriveUrl.startsWith('https://')) {
        finalDriveUrl = `https://${finalDriveUrl}`;
      }
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      // 1. Try uploading to Supabase Storage if a new file is chosen
      if (submissionType === 'file' && imageFile) {
        try {
          const uploadRes = await uploadFileToSupabaseStorage('registrations', 'karya', imageFile);
          if (uploadRes.success && uploadRes.url) {
            finalFileUrl = uploadRes.url;
          }
        } catch (storageErr) {
          console.info('Supabase storage fallback for work submission:', storageErr);
        }
      }

      // 2. Call handler to update in app state and Supabase database
      const saveHandler = onSaveWorkSubmission || onSaveWork;
      let result: any = { success: true };
      if (typeof saveHandler === 'function') {
        const handlerResult = await saveHandler(matchedParticipant.registrationNumber, {
          workSubmissionType: submissionType,
          workFileName: submissionType === 'file' ? finalFileName : undefined,
          workFileUrl: submissionType === 'file' ? finalFileUrl : undefined,
          workDriveUrl: submissionType === 'drive' ? finalDriveUrl : undefined,
          workNotes: workNotes.trim() || undefined,
        });
        if (handlerResult && typeof handlerResult === 'object') {
          result = handlerResult;
        }
      }

      if (result?.success !== false) {
        setNotification({
          type: 'success',
          message: 'Alhamdulillah! Berkas karya Anda berhasil dikirim dan tersimpan di database sistem panitia.',
        });
        setIsEditMode(false);
      } else {
        setNotification({
          type: 'error',
          message: result?.error || 'Gagal menyimpan karya. Silakan coba kembali.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Terjadi kendala saat mengirim karya. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cetak Formulir PDF & Buka Pratinjau
  const handlePrintForm = () => {
    if (!matchedParticipant) {
      setNotification({
        type: 'info',
        message: 'Silakan masukkan nomor registrasi Anda terlebih dahulu pada kolom pencarian di atas untuk mencetak formulir karya.',
      });
      const inputEl = document.getElementById('input-nomor-registrasi-karya');
      if (inputEl) inputEl.focus();
      return;
    }

    if (!participantForPrint) return;

    setPrintFeedback('');
    try {
      const res = generateWorkSubmissionPDF(participantForPrint, false);
      if (res.success && res.url) {
        setPdfDownloadUrl(res.url);
      }
    } catch (e) {
      console.warn('Persiapan dokumen PDF:', e);
    }
    setShowPrintModal(true);
  };

  const handlePrintDirect = () => {
    printElementSafely('printable-work-submission-form-modal');
    setPrintFeedback('Membuka kotak dialog cetak peramban...');
    setTimeout(() => setPrintFeedback(''), 4000);
  };

  const handleDownloadPdfDirect = () => {
    if (!participantForPrint) return;
    setIsPrinting(true);
    try {
      const res = generateWorkSubmissionPDF(participantForPrint, true);
      if (res.success) {
        if (res.url) setPdfDownloadUrl(res.url);
        setPrintFeedback(`Berkas "${res.filename}" berhasil diunduh!`);
      } else {
        setPrintFeedback('Gagal mengunduh PDF langsung, silakan gunakan tombol Cetak Sekarang.');
      }
    } catch (err: any) {
      setPrintFeedback(`Gagal membuat PDF: ${err?.message || 'Kesalahan'}`);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintFeedback(''), 5000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#031525] via-[#020e19] to-[#010911] border border-[#00D9F5]/30 rounded-2xl shadow-[0_0_50px_rgba(0,217,245,0.25)] text-[#DDE7E8] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="relative px-5 sm:px-7 py-4 border-b border-white/10 bg-gradient-to-r from-[#006B4F]/40 via-[#031525] to-[#008F72]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D9B45B] via-[#00D9F5] to-[#006B4F] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-[10px] bg-[#031525] flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-[#00D9F5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-[#00D9F5] uppercase">
                  PORTAL PESERTA LOMBA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9B45B] animate-pulse" />
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black text-white leading-tight">
                APLOUD KARYA PESERTA
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/15 transition-all"
            aria-label="Tutup Formulir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="px-5 sm:px-7 py-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* PENGUMUMAN RESMI PANITIA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D9B45B]/20 via-[#006B4F]/30 to-[#031525] border border-[#D9B45B]/40 text-white space-y-2 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D9F5] animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#F2C96D] flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#F2C96D]" /> PENGUMUMAN RESMI PANITIA HSN 2026
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <div className="font-bold text-[#00D9F5] flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00D9F5]" />
                  <span>1. Pengumpulan / Aploud Karya:</span>
                </div>
                <div className="text-white/90 text-[11px] leading-relaxed">
                  Batas akhir tanggal <strong className="text-amber-300">18 Oktober 2026</strong> pukul <strong className="text-amber-300">24.00 WIB</strong>.
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                <div className="font-bold text-[#F2C96D] flex items-center gap-1.5 mb-1">
                  <Tv className="w-3.5 h-3.5 text-[#F2C96D]" />
                  <span>2. Pengumuman Pemenang Juara:</span>
                </div>
                <div className="text-white/90 text-[11px] leading-relaxed">
                  Tanggal <strong className="text-[#00D9F5]">23 Oktober 2026</strong> pada Malam Puncak HSN pukul <strong className="text-[#00D9F5]">18.00 WIB</strong> (Offline & Online via YouTube Resmi HSN).
                </div>
              </div>
            </div>
          </div>

          {/* Notification Alert Banner */}
          {notification && (
            <div 
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                notification.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : notification.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              )}
              <div className="text-xs leading-relaxed">{notification.message}</div>
            </div>
          )}

          {/* 1. NOMOR REGISTRASI */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#00D9F5] flex items-center justify-between">
              <span>1. Nomor Registrasi Peserta <span className="text-rose-400">*</span></span>
              {matchedParticipant && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Data Ditemukan
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="input-nomor-registrasi-karya"
                type="text"
                value={regInput}
                onChange={(e) => setRegInput(e.target.value.toUpperCase())}
                placeholder="Masukkan Nomor Registrasi (Contoh: REG-HSN26-0001)"
                className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 border border-white/15 focus:border-[#00D9F5] focus:bg-[#00D9F5]/5 focus:outline-none text-white font-mono font-bold tracking-wider placeholder:text-white/30 text-sm transition-all"
              />
              <Search className="w-4 h-4 text-[#00D9F5] absolute left-3.5 top-3.5 pointer-events-none" />
              {regInput && (
                <button
                  type="button"
                  onClick={() => setRegInput('')}
                  className="absolute right-3 top-3 text-white/40 hover:text-white text-xs bg-white/10 rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/50 italic">
              *Diisi sesuai dengan nomor registrasi yang Anda peroleh saat melakukan pendaftaran lomba.
            </p>
          </div>

          {/* Quick Select from Registered Participants if available */}
          {participants.length > 0 && !matchedParticipant && (
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <span className="text-[11px] font-medium text-white/60 block mb-1.5">
                Atau pilih langsung dari peserta terdaftar:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {participants.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRegInput(p.registrationNumber)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00D9F5]/15 border border-white/10 hover:border-[#00D9F5]/40 text-white/80 hover:text-[#00D9F5] text-[11px] font-mono transition-colors"
                  >
                    {p.registrationNumber} ({p.fullName.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AUTO-FILLED PARTICIPANT DATA CARD */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#F2C96D] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F2C96D]" />
              <span>Informasi Otomatis Peserta & Pendaftaran</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 2. Nama Peserta */}
              <div className="space-y-1">
                <span className="text-[11px] text-white/60 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#00D9F5]" /> 2. Nama Peserta:
                </span>
                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-semibold">
                  {matchedParticipant ? matchedParticipant.fullName : <span className="text-white/30 italic">Terisi otomatis...</span>}
                </div>
              </div>

              {/* 3. Cabang Lomba */}
              <div className="space-y-1">
                <span className="text-[11px] text-white/60 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-[#D9B45B]" /> 3. Cabang Lomba:
                </span>
                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-semibold truncate">
                  {matchedParticipant ? matchedParticipant.competitionTitle : <span className="text-white/30 italic">Terisi otomatis...</span>}
                </div>
              </div>

              {/* 4. Kategori */}
              <div className="space-y-1">
                <span className="text-[11px] text-white/60 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#00D9F5]" /> 4. Kategori:
                </span>
                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-semibold">
                  {matchedParticipant ? matchedParticipant.category : <span className="text-white/30 italic">Terisi otomatis...</span>}
                </div>
              </div>

              {/* 5. Asal Lembaga */}
              <div className="space-y-1">
                <span className="text-[11px] text-white/60 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#00D9F5]" /> 5. Asal Lembaga:
                </span>
                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white font-semibold truncate">
                  {matchedParticipant ? matchedParticipant.institution : <span className="text-white/30 italic">Terisi otomatis...</span>}
                </div>
              </div>
            </div>

            {/* 6. STATUS PENDAFTARAN */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white/80 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00D9F5]" />
                6. Status Pendaftaran:
              </span>
              
              {matchedParticipant ? (
                <div className="flex items-center gap-2">
                  {isVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      TERVERIFIKASI
                    </span>
                  )}
                  {isWaiting && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      MENUNGGU VERIFIKASI
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      DITOLAK
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-white/30 text-xs italic">Menunggu nomor registrasi...</span>
              )}
            </div>
          </div>

          {/* PERINGATAN / KETENTUAN STATUS KHUSUS UNGGAH KARYA */}
          {matchedParticipant && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isRejected 
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
                : isWaiting
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}>
              {isRejected ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : isWaiting ? (
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs">
                  {isRejected 
                    ? 'Pendaftaran Berstatus DITOLAK' 
                    : isWaiting
                    ? 'Pendaftaran Menunggu Verifikasi — Anda Dapat Langsung Mengunggah Karya'
                    : 'Pendaftaran Telah TERVERIFIKASI'}
                </div>
                <div className="text-[11px] leading-relaxed text-white/80">
                  {isRejected ? (
                    'Mohon maaf, Anda belum dapat mengunggah karya karena berkas pendaftaran dinyatakan ditolak. Silakan hubungi narahubung panitia untuk bantuan perbaikan berkas.'
                  ) : isWaiting ? (
                    'Status Anda saat ini sedang dalam proses verifikasi panitia. Anda dipersilakan mengunggah karya Anda sekarang agar panitia dan dewan juri dapat memverifikasi berkas sekaligus menilai karya Anda.'
                  ) : (
                    'Alhamdulillah, berkas pendaftaran Anda telah disetujui panitia. Silakan kirimkan berkas karya terbaik Anda.'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* QUICK BANNER: FORMULIR TANDA TERIMA KARYA JIKA KARYA SUDAH TERSIMPAN */}
          {matchedParticipant && (matchedParticipant.workSubmittedAt || matchedParticipant.workFileUrl || matchedParticipant.workDriveUrl) && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#00D9F5]/10 via-[#006B4F]/20 to-emerald-950/30 border border-[#00D9F5]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#00D9F5] p-0.5 shadow shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-[10px] bg-[#031525] flex items-center justify-center">
                    <Printer className="w-4 h-4 text-[#00D9F5]" />
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Formulir Tanda Terima Karya Tersedia</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      Resmi
                    </span>
                  </h5>
                  <p className="text-[11px] text-white/60">
                    Karya telah tercatat. Buka pratinjau, simpan PDF, atau cetak dokumen tanda terima sekarang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintForm}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] text-[#031525] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                title="Buka pratinjau & cetak formulir resmi tanda terima karya"
              >
                <Printer className="w-3.5 h-3.5 text-[#031525]" />
                <span>Cetak Formulir</span>
              </button>
            </div>
          )}

          {/* 7. APLOUD KARYA (OPSIONAL) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#00D9F5] flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-[#00D9F5]" />
                <span>7. Aploud Karya (Opsional)</span>
              </label>

              {matchedParticipant?.workSubmittedAt && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Karya Telah Dikirim ({matchedParticipant.workSubmittedAt})
                </span>
              )}
            </div>

            {/* Selection: 1. Kirim File JPG/PNG vs 2. Tautan Google Drive */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canSubmitWork || !isEditMode}
                onClick={() => setSubmissionType('file')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  submissionType === 'file'
                    ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border-[#D9B45B]/60 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                } ${(!canSubmitWork || !isEditMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>1. Kirim File JPG/PNG</span>
              </button>

              <button
                type="button"
                disabled={!canSubmitWork || !isEditMode}
                onClick={() => setSubmissionType('drive')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  submissionType === 'drive'
                    ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border-[#D9B45B]/60 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                } ${(!canSubmitWork || !isEditMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>2. Tautan Link Google Drive</span>
              </button>
            </div>

            {/* Opsi 1: File JPG/PNG Input & Preview */}
            {submissionType === 'file' && (
              <div className="space-y-2">
                <div 
                  className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
                    (!canSubmitWork || !isEditMode) 
                      ? 'border-white/10 bg-white/[0.01] opacity-60 cursor-not-allowed' 
                      : 'border-[#00D9F5]/40 hover:border-[#00D9F5] bg-white/[0.02] cursor-pointer'
                  }`}
                >
                  <input
                    id="file-upload-karya-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    disabled={!canSubmitWork || !isEditMode || isCompressing}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="file-upload-karya-input" 
                    className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
                      (!canSubmitWork || !isEditMode || isCompressing) ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#00D9F5]/10 flex items-center justify-center text-[#00D9F5]">
                      {isCompressing ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-[#00D9F5]" />
                      ) : (
                        <ImageIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">
                        {isCompressing 
                          ? 'Mengoptimasi ukuran gambar karya...' 
                          : imageFile 
                          ? imageFile.name 
                          : (matchedParticipant?.workFileName || 'Klik untuk pilih berkas gambar JPG/PNG')}
                      </span>
                      <span className="text-[11px] text-white/50 block">
                        Format didukung: JPG, JPEG, PNG, WEBP (Otomatis dioptimasi untuk upload cepat)
                      </span>
                    </div>
                  </label>
                </div>

                {/* Preview Image if selected or already uploaded */}
                {imagePreview && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview Karya" 
                      className="w-16 h-16 object-cover rounded-lg border border-white/20 bg-black/40"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-white block truncate">
                        {imageFile ? imageFile.name : (matchedParticipant?.workFileName || 'Pratinjau Karya Peserta')}
                      </span>
                      {fileCompressionInfo && (
                        <span className="text-[10px] text-white/50 block">
                          Ukuran: {fileCompressionInfo}
                        </span>
                      )}
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> Berkas gambar siap dikirimkan
                      </span>
                    </div>
                    {isEditMode && canSubmitWork && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setFileCompressionInfo('');
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Opsi 2: Link Google Drive */}
            {submissionType === 'drive' && (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    id="input-drive-link-karya"
                    type="url"
                    disabled={!canSubmitWork || !isEditMode}
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... atau https://drive.google.com/drive/folders/..."
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 border border-white/15 focus:border-[#00D9F5] focus:bg-[#00D9F5]/5 focus:outline-none text-white text-xs placeholder:text-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <LinkIcon className="w-4 h-4 text-[#00D9F5] absolute left-3.5 top-3.5 pointer-events-none" />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50 italic">
                    *Pastikan setelan privasi link Google Drive: "Siapa saja yang memiliki link dapat melihat".
                  </span>
                  {driveUrl && (
                    <a
                      href={driveUrl.startsWith('http') ? driveUrl : `https://${driveUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00D9F5] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Uji Tautan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Catatan / Keterangan Karya Opsional */}
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">
                Catatan / Deskripsi Singkat Karya (Opsional):
              </label>
              <textarea
                disabled={!canSubmitWork || !isEditMode}
                rows={2}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Tuliskan judul karya, deskripsi ringkas, atau pesan nilai karya Anda..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 focus:border-[#00D9F5] focus:outline-none text-white text-xs placeholder:text-white/30 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer: CETAK FORMULIR, EDIT, KIRIM */}
        <div className="px-5 sm:px-7 py-4 border-t border-white/10 bg-[#020e19] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tombol Cetak Formulir */}
          <button
            type="button"
            id="btn-cetak-formulir-karya"
            onClick={handlePrintForm}
            disabled={isPrinting}
            title={matchedParticipant ? "Buka pratinjau & cetak formulir resmi tanda terima karya" : "Masukkan nomor registrasi untuk mencetak formulir"}
            className="px-4 py-2.5 rounded-xl border border-[#00D9F5]/40 bg-[#00D9F5]/10 hover:bg-[#00D9F5]/25 text-[#00D9F5] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
          >
            <Printer className="w-4 h-4 text-[#00D9F5]" />
            <span>{isPrinting ? 'Menyiapkan Dokumen...' : 'Cetak Formulir'}</span>
          </button>

          {/* Group Tombol Edit & Kirim */}
          <div className="flex items-center gap-2">
            {/* Tombol Edit */}
            <button
              type="button"
              id="btn-edit-karya"
              disabled={!canSubmitWork}
              onClick={() => {
                setIsEditMode(true);
                setNotification({
                  type: 'info',
                  message: 'Mode ubah karya aktif. Silakan perbarui berkas JPG/PNG atau tautan Google Drive Anda, lalu klik Kirim.',
                });
              }}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isEditMode
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-[#F2C96D]/40 bg-[#F2C96D]/10 hover:bg-[#F2C96D]/20 text-[#F2C96D]'
              } ${!canSubmitWork ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>

            {/* Tombol Kirim */}
            <button
              type="button"
              id="btn-kirim-karya"
              onClick={handleSubmit}
              disabled={!canSubmitWork || !isEditMode || isSubmitting || isCompressing}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-lg shadow-[#00D9F5]/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#031525]" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : isCompressing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#031525]" />
                  <span>Mengoptimasi Berkas...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#031525]" />
                  <span>Kirim Berkas Karya</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Pratinjau & Cetak Formulir Tanda Terima Karya Peserta */}
      {showPrintModal && participantForPrint && (
        <div 
          className="fixed inset-0 z-[90] flex flex-col items-center justify-start p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          {/* Top Control Bar (Non-Printable) */}
          <div className="no-print w-full max-w-4xl mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#008F72] flex items-center justify-center text-[#F2C96D] shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <span>Pratinjau Formulir Penyerahan Karya</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/30">
                    {participantForPrint.registrationNumber}
                  </span>
                </h4>
                <p className="text-[11px] text-[#DDE7E8]/70">
                  {participantForPrint.fullName} • {participantForPrint.competitionTitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Cetak Langsung */}
              <button
                type="button"
                onClick={handlePrintDirect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 text-[#031525] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#00D9F5]/20 active:scale-95 transition-all cursor-pointer"
                title="Cetak langsung menggunakan printer fisik atau Simpan sebagai PDF dari browser"
              >
                <Printer className="w-4 h-4 text-[#031525]" />
                <span>Cetak Sekarang</span>
              </button>

              {/* Tombol Unduh PDF Asli */}
              <button
                type="button"
                onClick={handleDownloadPdfDirect}
                disabled={isPrinting}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Unduh berkas PDF resmi tanda terima karya"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>{isPrinting ? 'Membuat PDF...' : 'Unduh .PDF'}</span>
              </button>

              {/* Buka Tab PDF jika tersedia */}
              {pdfDownloadUrl && (
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-[#00D9F5] text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Buka PDF di tab browser baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka</span><span> Tab</span>
                </a>
              )}

              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Tutup Pratinjau Cetak"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Toast Banner */}
            {printFeedback && (
              <div className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{printFeedback}</span>
              </div>
            )}
          </div>

          {/* Printable Document Paper (A4 Style) */}
          <div className="w-full max-w-4xl overflow-x-auto pb-8">
            <div 
              id="printable-work-submission-form-modal"
              className="w-full max-w-[800px] mx-auto bg-white text-slate-900 rounded-lg shadow-2xl p-6 sm:p-10 border border-slate-300 text-xs sm:text-sm font-sans"
            >
              {/* Top Strip */}
              <div className="h-2 bg-[#006B4F] -mt-6 sm:-mt-10 -mx-6 sm:-mx-10 mb-1 rounded-t-lg" />
              <div className="h-1 bg-[#D9B45B] -mx-6 sm:-mx-10 mb-6" />

              {/* Kop Surat Resmi */}
              <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900">
                <div className="w-16 h-16 rounded-full bg-[#006B4F] flex flex-col items-center justify-center text-[#F2C96D] font-serif font-black shadow-md shrink-0">
                  <span className="text-xl leading-none">NU</span>
                  <span className="text-[8px] font-sans tracking-widest text-white">MWC</span>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 tracking-wide uppercase leading-tight">
                    PANITIA FESTIVAL SANTRI NUSANTARA 2026
                  </h3>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#006B4F] leading-tight">
                    MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO
                  </h4>
                  <p className="text-[11px] italic text-slate-600 mt-0.5">
                    "Mengawal Indonesia Merdeka Menuju Peradaban Dunia"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kab. Malang, Jawa Timur 65157 • Narahubung: 0857-3119-4085
                  </p>
                </div>
              </div>
              <div className="h-0.5 bg-slate-900 mt-1 mb-6" />

              {/* Judul Dokumen */}
              <div className="text-center mb-6">
                <h2 className="text-base sm:text-lg font-black uppercase text-[#006B4F] tracking-wide">
                  BUKTI FORMULIR APLOUD KARYA PESERTA
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Tanda Terima Penyerahan Karya & Lembar Berkas Peserta Resmi
                </p>
              </div>

              {/* Box Nomor Registrasi */}
              <div className="bg-slate-50 border-2 border-[#006B4F] rounded-xl p-4 text-center mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  NOMOR REGISTRASI PESERTA
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-[#006B4F] tracking-wider block">
                  {participantForPrint.registrationNumber}
                </span>
              </div>

              {/* Tabel Data Peserta & Karya */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                <div className="bg-[#006B4F] text-[#F2C96D] px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>RINCIAN DATA</span>
                  <span>INFORMASI KARYA PESERTA</span>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-1/3 p-2.5 font-bold bg-slate-50 text-slate-700">Nama Lengkap Peserta</td>
                      <td className="p-2.5 font-semibold text-slate-900">: {participantForPrint.fullName}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Asal Lembaga / Instansi</td>
                      <td className="p-2.5 text-slate-900">: {participantForPrint.institution}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Cabang Perlombaan</td>
                      <td className="p-2.5 font-semibold text-[#006B4F]">: {participantForPrint.competitionTitle}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Kategori Perlombaan</td>
                      <td className="p-2.5 text-slate-900">: {participantForPrint.category}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Status Pendaftaran</td>
                      <td className="p-2.5 text-emerald-700 font-bold">: {participantForPrint.status || 'Terverifikasi'} (SAH & TERVERIFIKASI)</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Metode Pengunggahan Karya</td>
                      <td className="p-2.5 text-slate-900">: {
                        participantForPrint.workSubmissionType === 'drive' || (!participantForPrint.workFileUrl && !!participantForPrint.workDriveUrl)
                          ? 'Tautan Cloud (Google Drive)'
                          : 'Berkas Gambar (File JPG/PNG)'
                      }</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Rincian Berkas / Link Karya</td>
                      <td className="p-2.5 text-slate-900 break-all">: {
                        participantForPrint.workDriveUrl 
                          ? participantForPrint.workDriveUrl 
                          : (participantForPrint.workFileName || 'File Gambar Terlampir')
                      }</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Catatan / Keterangan Karya</td>
                      <td className="p-2.5 text-slate-800 italic">: "{participantForPrint.workNotes || 'Sesuai dengan ketentuan Juknis HSN 2026'}"</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold bg-slate-50 text-slate-700">Waktu Penyerahan Karya</td>
                      <td className="p-2.5 text-slate-900">: {participantForPrint.workSubmittedAt || new Date().toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lampiran Gambar Karya jika ada */}
              {participantForPrint.workFileUrl && (
                <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-lg text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    LAMPIRAN DOKUMEN VISUAL KARYA
                  </span>
                  <img 
                    src={participantForPrint.workFileUrl} 
                    alt="Karya Peserta" 
                    className="max-h-60 max-w-full mx-auto rounded border border-slate-300 object-contain shadow-sm"
                  />
                </div>
              )}

              {/* Ketentuan Keabsahan */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 mb-8">
                <h5 className="font-bold text-xs text-emerald-800 mb-1">
                  VALIDASI & TANDA TERIMA BERKAS KARYA
                </h5>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Dokumen ini adalah bukti resmi penyerahan karya dalam Festival Hari Santri Nasional 2026 MWC NU Poncokusumo. 
                  Dewan juri akan menilai karya sesuai juknis dan kriteria penilaian orisinalitas, kreativitas, dan pesan nilai keislaman. 
                  Simpan dokumen ini sebagai tanda bukti keikutsertaan Anda.
                </p>
              </div>

              {/* Pengesahan & Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 text-center pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 block">Mengetahui & Menyetujui,</span>
                  <span className="text-xs font-bold text-slate-900 block">Ketua Panitia HSN 2026</span>
                  <div className="py-2 flex justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-[#006B4F] flex flex-col items-center justify-center text-[#006B4F] text-[8px] font-bold">
                      <span>PANITIA HSN</span>
                      <span className="text-[6px] tracking-wider">MWC NU 2026</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Far'ul Anam, S.Pd, M.Pd</span>
                  <span className="text-[10px] text-slate-500 block">Panitia HSN 2026</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-600 block">
                    Poncokusumo, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block">Sekretariat Pelaksana</span>
                  <div className="py-2 flex justify-center">
                    <div className="w-16 h-16 flex items-center justify-center text-slate-400 italic text-[10px]">
                      (Tertanda)
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block underline">Imam Muhidin, S.Pd</span>
                  <span className="text-[10px] text-slate-500 block">Divisi Sekretariat & Administrasi</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                FESTIVAL SANTRI NUSANTARA 2026 • PERINGATAN HARI SANTRI NASIONAL 2026 • MWC NU PONCOKUSUMO
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
