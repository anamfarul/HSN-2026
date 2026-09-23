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
    description: 'Mengatur petunjuk teknis (juknis) lomba, menambah cabang lomba baru, memantau kuota peserta, dan meninjau daftar pendaftar lomba.',
    capabilities: {
      verifyParticipants: 'VIEW_ONLY',
      manageCompetitions: 'FULL',
      manageUsers: 'NONE',
      exportData: true,
      manageDocuments: 'VIEW_ONLY',
      accessDeployment: false,
    },
    allowedTabs: ['participants', 'competitions', 'stats', 'documents'],
  },
  'Divisi Regristrasi & Verifikator': {
    roleName: 'Divisi Regristrasi & Verifikator',
    shortTitle: 'Reg. & Verifikator',
    badgeColor: 'bg-purple-500/20 text-purple-300',
    borderColor: 'border-purple-500/40',
    description: 'Fokus memverifikasi keabsahan data peserta (surat mandat, NISN/NISM, foto, karya peserta), mengubah status (Terverifikasi/Ditolak), dan validasi pendaftaran.',
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
  'Divisi Sekretariat & Administrasi': {
    roleName: 'Divisi Sekretariat & Administrasi',
    shortTitle: 'Sekretariat & Admin',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
    borderColor: 'border-cyan-500/40',
    description: 'Pengelolaan surat-menyurat, berkas administrasi pendaftaran, rekapitulasi data dan absensi peserta, serta arsip dokumen resmi festival.',
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

// Aliases untuk kompatibilitas data lama / variasi ejaan
ROLE_DEFINITIONS['Dewan Juru & Verifikator'] = ROLE_DEFINITIONS['Divisi Regristrasi & Verifikator'];
ROLE_DEFINITIONS['Dewan Juri & Verifikator'] = ROLE_DEFINITIONS['Divisi Regristrasi & Verifikator'];
ROLE_DEFINITIONS['Divisi Registrasi & Verifikator'] = ROLE_DEFINITIONS['Divisi Regristrasi & Verifikator'];
ROLE_DEFINITIONS['Divisi Acara & Regristasi'] = ROLE_DEFINITIONS['Divisi Sekretariat & Administrasi'];
ROLE_DEFINITIONS['Divisi Acara & Registrasi'] = ROLE_DEFINITIONS['Divisi Sekretariat & Administrasi'];
ROLE_DEFINITIONS['Divisi Acara & Panggung'] = ROLE_DEFINITIONS['Divisi Sekretariat & Administrasi'];

export const ALL_ROLES = [
  'Sekretariat Utama HSN 2026',
  'Koordinator Teknis Lomba',
  'Divisi Regristrasi & Verifikator',
  'Divisi Sekretariat & Administrasi',
  'Tim Publikasi & Media Center',
];
