import { AdminUser } from '../types';

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-1',
    fullName: 'Gus Ahmad Al-Fatih',
    username: 'admin',
    password: 'santri2026',
    role: 'Sekretariat Utama HSN 2026',
    email: 'admin@hsnponcokusumo.nu',
    phone: '0812-3456-7890',
    createdAt: '01 Oktober 2026',
    isActive: true,
  },
  {
    id: 'user-2',
    fullName: 'Ustadz M. Sholihin, S.Pd.I',
    username: 'panitia',
    password: 'poncokusumo2026',
    role: 'Koordinator Teknis Lomba',
    email: 'lomba@hsnponcokusumo.nu',
    phone: '0813-8899-7766',
    createdAt: '02 Oktober 2026',
    isActive: true,
  },
  {
    id: 'user-3',
    fullName: 'Ning Nabila Azzahra',
    username: 'sekretariat',
    password: 'hsn2026',
    role: 'Divisi Acara & Registrasi',
    email: 'sekretariat@hsnponcokusumo.nu',
    phone: '0821-9876-5432',
    createdAt: '03 Oktober 2026',
    isActive: true,
  },
];
