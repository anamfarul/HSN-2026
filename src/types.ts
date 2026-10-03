export type CategoryGeneration = 
  | 'PAUD/RA/TK'
  | 'SD/MI'
  | 'SMP/MTs'
  | 'SMA/MA/SMK'
  | 'IPNU/IPPNU'
  | 'FATAYAT'
  | 'MUSLIMAT'
  | 'PAGAR NUSA'
  | 'GURU'
  | 'ANSOR'
  | 'UMUM'
  | (string & {});

export interface FivePillar {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  glowColor: string;
  badge: string;
}

export interface GenerationProgram {
  id: string;
  cardNumber: string;
  title: string;
  category: CategoryGeneration;
  badge: string;
  programs: string[];
  description: string;
  objective: string;
  participantTarget: string;
  iconName: string;
  accentColor: string;
}

export interface SignatureProgram {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  highlights: string[];
  image: string;
  iconName: string;
  badge: string;
}

export interface Competition {
  id: string;
  code: string;
  title: string;
  category: CategoryGeneration;
  targetAudience: string;
  description: string;
  rules: string[];
  prizes: {
    first: string;
    second: string;
    third: string;
    all?: string;
  };
  registrationFee: string;
  deadline: string;
  technicalMeeting: string;
  location: string;
  contactPerson: string;
  iconName: string;
  juknisUrl?: string;
  juknisFileName?: string;
}

export interface TimelineItem {
  id: string;
  period: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  isHighlight?: boolean;
  activities: string[];
}

export interface DownloadDoc {
  id: string;
  title: string;
  category: string;
  size: string;
  format: string;
  lastUpdated: string;
  description: string;
  downloadCount: number;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  thumbnail: string;
  excerpt: string;
  content: string[];
  tags: string[];
}

export interface ParticipantRegistration {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
  category: CategoryGeneration;
  birthDate: string;
  whatsapp: string;
  email: string;
  address: string;
  district?: string; // Kecamatan
  regency?: string; // Kabupaten/Kota
  province?: string; // Provinsi
  competitionId: string;
  competitionTitle: string;
  documentName?: string;
  documentUrl?: string;
  paymentProofName?: string;
  paymentProofUrl?: string;
  registeredAt: string;
  status: 'Menunggu' | 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak' | 'Finalis' | (string & {});
  // Data Aploud Karya Peserta Lomba
  workSubmissionType?: 'file' | 'drive';
  workFileName?: string;
  workFileUrl?: string;
  workDriveUrl?: string;
  workNotes?: string;
  workSubmittedAt?: string;
}

export interface ParticipantWorkSubmission {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
  competitionTitle: string;
  category: CategoryGeneration | string;
  submissionType: 'file' | 'drive';
  workFileName?: string;
  workFileUrl?: string;
  workDriveUrl?: string;
  workNotes?: string;
  submittedAt: string;
}

export interface SponsorItem {
  id: string;
  name: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Media Partner';
  logoPlaceholder: string;
  contribution: string;
  benefits: string[];
}

export interface FestivalStats {
  klasterProgram: number;
  totalKegiatan: number;
  totalPeserta: number;
  totalLembaga: number;
  totalPengunjung: number;
}

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: string;
  email: string;
  phone: string;
  createdAt: string;
  isActive: boolean;
}

// ==============================================================================
// CMS PENILAIAN JURI & PORTAL JURI TYPES
// ==============================================================================
export type UserRole = 'super_admin' | 'admin' | 'jury';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  institution?: string;
  phone?: string;
  isActive: boolean;
  username?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JuryAssignment {
  id: string;
  juryId: string;
  competitionId: string;
  assignedBy?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Joined fields
  juryName?: string;
  juryEmail?: string;
  juryInstitution?: string;
  competitionTitle?: string;
  competitionCategory?: string;
}

export interface ScoringCriterion {
  id: string;
  competitionId: string;
  criterionName: string;
  description?: string;
  maxScore: number;
  weight: number; // Persentase bobot (%)
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type JuryScoreStatus = 'draft' | 'submitted' | 'locked';

export interface JuryScore {
  id: string;
  juryId: string;
  participantId: string;
  competitionId: string;
  scores: Record<string, number>; // criterionId -> rawScore (0 - maxScore)
  totalScore: number; // Akumulasi nilai berbobot
  notes?: string;
  status: JuryScoreStatus;
  submittedAt?: string;
  lockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Joined fields
  juryName?: string;
  participantName?: string;
  registrationNumber?: string;
  competitionTitle?: string;
}

export type WinnerTitle = 
  | 'Juara 1' 
  | 'Juara 2' 
  | 'Juara 3' 
  | 'Harapan 1' 
  | 'Harapan 2' 
  | 'Juara Favorit' 
  | (string & {});

export interface CompetitionResult {
  id: string;
  competitionId: string;
  participantId: string;
  averageScore: number;
  finalScore: number;
  rank?: number;
  winnerTitle?: WinnerTitle | null;
  isPublished: boolean;
  determinedBy?: string;
  determinedByName?: string;
  determinedAt?: string;
  decisionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Joined participant data
  participant?: ParticipantRegistration;
}

export interface JuryAuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  notes?: string;
  createdAt: string;
}

export interface JuryScoringProgress {
  competitionId: string;
  competitionTitle: string;
  category: string;
  totalParticipants: number;
  totalAssignedJuries: number;
  expectedScores: number; // totalParticipants * totalAssignedJuries
  completedScores: number; // status = 'submitted' or 'locked'
  draftScores: number;
  progressPercent: number;
  isLocked: boolean;
  hasWinner: boolean;
  isPublished: boolean;
}

