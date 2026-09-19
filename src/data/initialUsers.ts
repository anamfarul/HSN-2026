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

export const DELETED_USERS_STORAGE_KEY = 'hsn2026_deleted_users';
export const REGISTERED_USERS_STORAGE_KEY = 'hsn2026_registered_users';

/**
 * Mendapatkan daftar ID dan username user yang telah dihapus permanen
 */
export function getDeletedUserIdentifiers(): Set<string> {
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((item) => {
          if (typeof item === 'string' && item.trim()) {
            set.add(item.trim().toLowerCase());
          }
        });
      }
    }
  } catch (err) {
    console.error('Error reading deleted users identifiers', err);
  }
  return set;
}

/**
 * Cek apakah user (berdasarkan ID atau username) telah dihapus dari sistem
 */
export function isUserDeleted(id?: string, username?: string): boolean {
  const deletedSet = getDeletedUserIdentifiers();
  if (id && deletedSet.has(id.toLowerCase())) return true;
  if (username && deletedSet.has(username.toLowerCase())) return true;
  return false;
}

/**
 * Mencatat ID dan username user yang dihapus secara permanen ke localStorage
 */
export function recordDeletedUser(id: string, username?: string): void {
  try {
    const deletedSet = getDeletedUserIdentifiers();
    if (id) deletedSet.add(id.toLowerCase());
    if (username) deletedSet.add(username.toLowerCase());
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (err) {
    console.error('Error saving deleted user identifier', err);
  }
}

/**
 * Menghapus penanda hapus jika admin sengaja membuat user baru dengan username/id yang sama
 */
export function removeDeletedUserIdentifier(identifier: string): void {
  try {
    const deletedSet = getDeletedUserIdentifiers();
    deletedSet.delete(identifier.toLowerCase());
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (err) {
    console.error('Error removing deleted user identifier', err);
  }
}

/**
 * Membaca data user panitia yang aktif dan sah dari localStorage.
 * Menjamin: user yang pernah dihapus TIDAK AKAN PERNAH dibangkitkan lagi dari INITIAL_ADMIN_USERS!
 */
export function getRegisteredAdminUsers(): AdminUser[] {
  const deleted = getDeletedUserIdentifiers();
  try {
    const stored = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (u: AdminUser) =>
            u &&
            u.id &&
            !deleted.has(u.id.toLowerCase()) &&
            (!u.username || !deleted.has(u.username.toLowerCase()))
        );
      }
    }
  } catch (err) {
    console.error('Error parsing registered admin users', err);
  }

  // Inisialisasi awal sistem (hanya berjalan 1 kali jika storage belum pernah dibuat)
  const initial = INITIAL_ADMIN_USERS.filter(
    (u) => !deleted.has(u.id.toLowerCase()) && !deleted.has(u.username.toLowerCase())
  );
  try {
    localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(initial));
  } catch (_) {}
  return initial;
}

/**
 * Menyimpan daftar user panitia aktif ke localStorage
 */
export function saveRegisteredAdminUsers(users: AdminUser[]): void {
  const deleted = getDeletedUserIdentifiers();
  const cleaned = users.filter(
    (u) =>
      u &&
      u.id &&
      !deleted.has(u.id.toLowerCase()) &&
      (!u.username || !deleted.has(u.username.toLowerCase()))
  );
  try {
    localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Error saving registered admin users', err);
  }
}

/**
 * Menghapus user panitia secara lokal dan mencatatnya di daftar blacklist terhapus
 */
export function deleteAdminUserLocal(id: string, username?: string): AdminUser[] {
  // 1. Catat ke persistent deleted set
  recordDeletedUser(id, username);

  // 2. Filter dari registered users
  const current = getRegisteredAdminUsers();
  const filtered = current.filter(
    (u) =>
      u.id.toLowerCase() !== id.toLowerCase() &&
      (!username || !u.username || u.username.toLowerCase() !== username.toLowerCase())
  );
  saveRegisteredAdminUsers(filtered);

  // 3. Batalkan sesi aktif jika user yang sedang login adalah user yang dihapus ini
  try {
    const activeStoredUser = (
      localStorage.getItem('hsn2026_admin_user') ||
      sessionStorage.getItem('hsn2026_admin_user') ||
      ''
    ).toLowerCase();
    if (
      (username && activeStoredUser === username.toLowerCase()) ||
      (activeStoredUser === id.toLowerCase())
    ) {
      localStorage.removeItem('hsn2026_admin_auth');
      localStorage.removeItem('hsn2026_admin_user');
      localStorage.removeItem('hsn2026_admin_role');
      sessionStorage.removeItem('hsn2026_admin_auth');
      sessionStorage.removeItem('hsn2026_admin_user');
      sessionStorage.removeItem('hsn2026_admin_role');
    }
  } catch (_) {}

  return filtered;
}
