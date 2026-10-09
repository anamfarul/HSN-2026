import { UserProfile, ScoringCriterion, JuryAssignment } from '../types';

/**
 * Data awal profil dewan juri default sistem HSN 2026.
 * Digunakan sebagai fallback offline jika storage dan Supabase belum terisi.
 */
export const INITIAL_JURY_PROFILES: UserProfile[] = [
  {
    id: 'jury-001',
    fullName: 'KH. Sholeh Badruddin, M.Pd.',
    email: 'juri.sholeh@hsnponcokusumo.id',
    username: 'juri_sholeh',
    password: 'santri2026',
    role: 'jury',
    institution: 'MWC NU Poncokusumo',
    phone: '0812-3456-7801',
    isActive: true,
  },
  {
    id: 'jury-002',
    fullName: 'Ust. Nurul Huda, S.Q., M.Ag.',
    email: 'juri.huda@hsnponcokusumo.id',
    username: 'juri_huda',
    password: 'santri2026',
    role: 'jury',
    institution: 'LPTQ Kab. Malang',
    phone: '0812-3456-7802',
    isActive: true,
  },
  {
    id: 'jury-003',
    fullName: 'Dr. Hj. Siti Fatimah, M.Pd.I.',
    email: 'juri.fatimah@hsnponcokusumo.id',
    username: 'juri_fatimah',
    password: 'santri2026',
    role: 'jury',
    institution: 'Fatayat NU Cabang Malang',
    phone: '0812-3456-7803',
    isActive: true,
  },
  {
    id: 'jury-004',
    fullName: 'Ust. Agus Salim, S.Sn.',
    email: 'juri.salim@hsnponcokusumo.id',
    username: 'juri_salim',
    password: 'santri2026',
    role: 'jury',
    institution: 'Lesbumi MWC NU Poncokusumo',
    phone: '0812-3456-7804',
    isActive: true,
  },
  {
    id: 'jury-005',
    fullName: 'M. Wildan Pratama, M.Kom.',
    email: 'juri.wildan@hsnponcokusumo.id',
    username: 'juri_wildan',
    password: 'santri2026',
    role: 'jury',
    institution: 'LTN NU & Digital Media HSN',
    phone: '0812-3456-7805',
    isActive: true,
  },
];

/**
 * Data awal kriteria penilaian perlombaan HSN 2026.
 */
export const INITIAL_SCORING_CRITERIA: ScoringCriterion[] = [];

/**
 * Data awal penugasan dewan juri ke cabang lomba.
 */
export const INITIAL_JURY_ASSIGNMENTS: JuryAssignment[] = [];
