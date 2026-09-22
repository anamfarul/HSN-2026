import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Printer, 
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
  RefreshCw
} from 'lucide-react';
import { ParticipantRegistration } from '../types';
import { generateWorkSubmissionPDF } from '../lib/pdfGenerator';
import { uploadFileToSupabaseStorage } from '../lib/supabaseClient';

interface WorkSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantRegistration[];
  onSaveWorkSubmission: (
    registrationNumber: string,
    workData: {
      workSubmissionType: 'file' | 'drive';
      workFileName?: string;
      workFileUrl?: string;
      workDriveUrl?: string;
      workNotes?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  initialRegistrationNumber?: string;
}

export const WorkSubmissionModal: React.FC<WorkSubmissionModalProps> = ({
  isOpen,
  onClose,
  participants,
  onSaveWorkSubmission,
  initialRegistrationNumber = '',
}) => {
  // Input form state
  const [regInput, setRegInput] = useState<string>(initialRegistrationNumber);
  const [submissionType, setSubmissionType] = useState<'file' | 'drive'>('file');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [driveUrl, setDriveUrl] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>('');

  // Mode Edit control
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

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
    return participants.find((p) => {
      const pReg = (p.registrationNumber || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      return pReg === cleanQuery || pId === cleanQuery;
    }) || null;
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

  // Handle file select (JPG / PNG)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setNotification({
        type: 'error',
        message: 'Format file tidak didukung. Harap pilih gambar dengan format JPG atau PNG.',
      });
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setNotification({
        type: 'error',
        message: 'Ukuran file terlalu besar. Maksimal ukuran file gambar adalah 10 MB.',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setNotification(null);
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

    if (!isVerified) {
      setNotification({
        type: 'error',
        message: 'Pengunggahan karya hanya dapat dilakukan oleh peserta dengan status TERVERIFIKASI.',
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
      const result = await onSaveWorkSubmission(matchedParticipant.registrationNumber, {
        workSubmissionType: submissionType,
        workFileName: submissionType === 'file' ? finalFileName : undefined,
        workFileUrl: submissionType === 'file' ? finalFileUrl : undefined,
        workDriveUrl: submissionType === 'drive' ? finalDriveUrl : undefined,
        workNotes: workNotes.trim() || undefined,
      });

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Alhamdulillah! Berkas karya Anda berhasil dikirim dan tersimpan di sistem panitia.',
        });
        setIsEditMode(false);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Gagal menyimpan karya. Silakan coba kembali.',
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

  // Cetak Formulir PDF
  const handlePrintForm = () => {
    if (!matchedParticipant) {
      setNotification({
        type: 'error',
        message: 'Masukkan nomor registrasi yang valid sebelum mencetak formulir.',
      });
      return;
    }

    setIsPrinting(true);
    try {
      // Create a temporary object reflecting any unsaved changes if in edit mode
      const participantWithCurrentWork: ParticipantRegistration = {
        ...matchedParticipant,
        workSubmissionType: submissionType,
        workFileName: imageFile ? imageFile.name : (matchedParticipant.workFileName || 'karya_peserta.jpg'),
        workFileUrl: imagePreview || matchedParticipant.workFileUrl,
        workDriveUrl: driveUrl.trim() || matchedParticipant.workDriveUrl,
        workNotes: workNotes.trim() || matchedParticipant.workNotes,
        workSubmittedAt: matchedParticipant.workSubmittedAt || new Date().toLocaleString('id-ID'),
      };

      const res = generateWorkSubmissionPDF(participantWithCurrentWork, true);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Formulir tanda terima karya ${res.filename} berhasil diunduh/dicetak.`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Gagal membuat dokumen formulir cetak.',
      });
    } finally {
      setIsPrinting(false);
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
          {matchedParticipant && !isVerified && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isRejected 
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              {isRejected ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs">
                  {isRejected 
                    ? 'Pendaftaran Berstatus DITOLAK' 
                    : 'Pendaftaran Masih MENUNGGU Verifikasi Panitia'}
                </div>
                <div className="text-[11px] leading-relaxed text-white/80">
                  {isRejected ? (
                    'Mohon maaf, Anda belum dapat mengunggah karya karena berkas pendaftaran dinyatakan ditolak. Silakan hubungi narahubung panitia untuk bantuan dan perbaikan berkas.'
                  ) : (
                    'Sesuai ketentuan, peserta HANYA dapat mengunggah karya apabila status pendaftaran telah TERVERIFIKASI oleh Panitia. Mohon tunggu proses verifikasi berkas oleh admin/panitia.'
                  )}
                </div>
              </div>
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
                disabled={!isVerified || !isEditMode}
                onClick={() => setSubmissionType('file')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  submissionType === 'file'
                    ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border-[#D9B45B]/60 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                } ${(!isVerified || !isEditMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>1. Kirim File JPG/PNG</span>
              </button>

              <button
                type="button"
                disabled={!isVerified || !isEditMode}
                onClick={() => setSubmissionType('drive')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  submissionType === 'drive'
                    ? 'bg-gradient-to-r from-[#006B4F] to-[#008F72] text-[#F2C96D] border-[#D9B45B]/60 shadow-md'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                } ${(!isVerified || !isEditMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    (!isVerified || !isEditMode) 
                      ? 'border-white/10 bg-white/[0.01] opacity-60 cursor-not-allowed' 
                      : 'border-[#00D9F5]/40 hover:border-[#00D9F5] bg-white/[0.02] cursor-pointer'
                  }`}
                >
                  <input
                    id="file-upload-karya-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    disabled={!isVerified || !isEditMode}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="file-upload-karya-input" 
                    className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
                      (!isVerified || !isEditMode) ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#00D9F5]/10 flex items-center justify-center text-[#00D9F5]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">
                        {imageFile ? imageFile.name : (matchedParticipant?.workFileName || 'Klik untuk pilih berkas JPG/PNG')}
                      </span>
                      <span className="text-[11px] text-white/50 block">
                        Format didukung: JPG, JPEG, PNG (Maks. 10 MB)
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
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Berkas gambar siap dikirimkan
                      </span>
                    </div>
                    {isEditMode && isVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
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
                    disabled={!isVerified || !isEditMode}
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
                disabled={!isVerified || !isEditMode}
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
            disabled={!matchedParticipant || isPrinting}
            className="px-4 py-2.5 rounded-xl border border-[#00D9F5]/40 bg-[#00D9F5]/10 hover:bg-[#00D9F5]/20 text-[#00D9F5] text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
              disabled={!matchedParticipant || !isVerified}
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
              } ${(!matchedParticipant || !isVerified) ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>

            {/* Tombol Kirim */}
            <button
              type="button"
              id="btn-kirim-karya"
              onClick={handleSubmit}
              disabled={!matchedParticipant || !isVerified || !isEditMode || isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#031525] bg-gradient-to-r from-[#D9B45B] via-[#F2C96D] to-[#00D9F5] hover:brightness-110 shadow-lg shadow-[#00D9F5]/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#031525]" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#031525]" />
                  <span>Kirim</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
