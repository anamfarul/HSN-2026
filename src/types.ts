export type CategoryGeneration = 
  | 'PAUD/TK'
  | 'SD/MI'
  | 'SMP/MTs'
  | 'SMA/MA/SMK'
  | 'IPNU/IPPNU'
  | 'FATAYAT'
  | 'MUSLIMAT'
  | 'UMUM';

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

export interface GalleryItem {
  id: string;
  title: string;
  category: 'SEMUA' | 'SANTRI' | 'PESANTREN' | 'BUDAYA' | 'DIGITAL' | 'MALAM PUNCAK';
  imageUrl: string;
  caption: string;
  date: string;
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
  competitionId: string;
  competitionTitle: string;
  documentName?: string;
  documentUrl?: string;
  paymentProofName?: string;
  paymentProofUrl?: string;
  registeredAt: string;
  status: 'Menunggu Verifikasi' | 'Terverifikasi' | 'Finalis';
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
