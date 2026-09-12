export interface RolePermission {
  roleName: string;
  shortTitle: string;
  badgeColor: string;
  borderColor: string;
  description: string;
  capabilities: {
    verifyParticipants: 'FULL' | 'VIEW_ONLY' | 'NONE';
    manageCompetitions: 'FULL' | 'VIEW_ONLY' | 'NONE';
    manageUsers: 'FULL' | 'NONE';
    exportData: boolean;
    manageDocuments: 'FULL' | 'VIEW_ONLY' | 'NONE';
    accessDeployment: boolean;
  };
  allowedTabs: ('participants' | 'competitions' | 'stats' | 'documents' | 'users' | 'deployment')[];
}

export const ROLE_DEFINITIONS: Record<string, RolePermission> = {
  'Sekretariat Utama HSN 2026': {
    roleName: 'Sekretariat Utama HSN 2026',
    shortTitle: 'Super Admin',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
    borderColor: 'border-emerald-500/40',
    description: 'Wewenang penuh tingkat tertinggi. Mengatur seluruh data pendaftar, cabang lomba, verifikasi berkas, manajemen akun panitia, dan deployment hosting.',
    capabilities: {
      verifyParticipants: 'FULL',
      manageCompetitions: 'FULL',
      manageUsers: 'FULL',
      exportData: true,
      manageDocuments: 'FULL',
      accessDeployment: true,
    },
    allowedTabs: ['participants', 'competitions', 'stats', 'documents', 'users', 'deployment'],
  },
  'Koordinator Teknis Lomba': {
    roleName: 'Koordinator Teknis Lomba',
    shortTitle: 'Koord. Lomba',
    badgeColor: 'bg-amber-500/20 text-amber-400',
    borderColor: 'border-amber-500/40',
    description: 'Mengatur petunjuk teknis (juknis) lomba, menambah cabang lomba baru, memantau kuota peserta, dan verifikasi berkas lomba.',
    capabilities: {
      verifyParticipants: 'FULL',
      manageCompetitions: 'FULL',
      manageUsers: 'NONE',
      exportData: true,
      manageDocuments: 'VIEW_ONLY',
      accessDeployment: false,
    },
    allowedTabs: ['participants', 'competitions', 'stats', 'documents'],
  },
  'Dewan Juri & Verifikator': {
    roleName: 'Dewan Juri & Verifikator',
    shortTitle: 'Verifikator & Juri',
    badgeColor: 'bg-purple-500/20 text-purple-300',
    borderColor: 'border-purple-500/40',
    description: 'Fokus memverifikasi keabsahan data peserta (surat mandat, NISN/NISM, foto), mengubah status (Terverifikasi/Ditolak), dan melihat rekap peserta.',
    capabilities: {
      verifyParticipants: 'FULL',
      manageCompetitions: 'VIEW_ONLY',
      manageUsers: 'NONE',
      exportData: true,
      manageDocuments: 'VIEW_ONLY',
      accessDeployment: false,
    },
    allowedTabs: ['participants', 'stats'],
  },
  'Divisi Acara & Registrasi': {
    roleName: 'Divisi Acara & Registrasi',
    shortTitle: 'Divisi Acara',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
    borderColor: 'border-cyan-500/40',
    description: 'Memantau pendaftaran masuk, ekspor rekap absensi/data peserta per kontingen, serta koordinasi jadwal acara dan berkas formulir.',
    capabilities: {
      verifyParticipants: 'VIEW_ONLY',
      manageCompetitions: 'VIEW_ONLY',
      manageUsers: 'NONE',
      exportData: true,
      manageDocuments: 'FULL',
      accessDeployment: false,
    },
    allowedTabs: ['participants', 'stats', 'documents'],
  },
  'Tim Publikasi & Media Center': {
    roleName: 'Tim Publikasi & Media Center',
    shortTitle: 'Media & Publikasi',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    borderColor: 'border-blue-500/40',
    description: 'Mengelola berkas materi promosi (pamflet, twibbon, juklak), dokumentasi rilis pers, serta statistik pengunjung dan pendaftar.',
    capabilities: {
      verifyParticipants: 'VIEW_ONLY',
      manageCompetitions: 'VIEW_ONLY',
      manageUsers: 'NONE',
      exportData: false,
      manageDocuments: 'FULL',
      accessDeployment: false,
    },
    allowedTabs: ['documents', 'stats', 'competitions'],
  },
};

export const ALL_ROLES = Object.keys(ROLE_DEFINITIONS);
