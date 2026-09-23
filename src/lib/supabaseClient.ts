import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Competition, CategoryGeneration, AdminUser } from '../types';
import { INITIAL_COMPETITIONS } from '../data/initialData';
import { isUserDeleted, normalizePanitiaRole } from '../data/initialUsers';

// Helper to sanitize Supabase Project URL to prevent "TypeError: Failed to fetch"
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // Strip wrapping quotes (single, double, backticks)
  url = url.replace(/^["'`]|["'`]$/g, '').trim();

  // 1. Detect if user pasted Dashboard URL from browser address bar
  // Example: https://supabase.com/dashboard/project/abcdefghijklmn/settings/api
  // or https://supabase.com/dashboard/project/abcdefghijklmn
  const dashboardMatch = url.match(/(?:supabase\.com\/dashboard\/project|app\.supabase\.com\/project)\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 2. Remove trailing slashes and API paths like /rest/v1
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/i, '');

  // 3. If user only pasted project reference ID e.g. "whjygchtrnihymuruvmrkw"
  if (/^[a-zA-Z0-9_-]{12,35}$/.test(url) && !url.includes('.')) {
    return `https://${url}.supabase.co`;
  }

  // 4. Add https:// if user only wrote "xxx.supabase.co" without protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // 5. Enforce https for Supabase domains
  if (url.startsWith('http://') && url.includes('.supabase.co')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

// Helper to sanitize anon key
export function sanitizeSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  let key = rawKey.trim();
  key = key.replace(/^["'`]|["'`]$/g, '').trim();
  return key;
}

// Helper to get active credentials from environment or localStorage with automatic sanitization
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const rawStoredUrl = typeof window !== 'undefined' ? localStorage.getItem('hsn2026_supabase_url') || '' : '';
  const rawStoredKey = typeof window !== 'undefined' ? localStorage.getItem('hsn2026_supabase_anon_key') || '' : '';

  const cleanUrl = sanitizeSupabaseUrl(rawStoredUrl || envUrl);
  const cleanKey = sanitizeSupabaseKey(rawStoredKey || envKey);

  // Self-heal: If stored value in localStorage had formatting defects, overwrite with sanitized version
  if (typeof window !== 'undefined' && rawStoredUrl && cleanUrl && rawStoredUrl !== cleanUrl) {
    try {
      localStorage.setItem('hsn2026_supabase_url', cleanUrl);
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && rawStoredKey && cleanKey && rawStoredKey !== cleanKey) {
    try {
      localStorage.setItem('hsn2026_supabase_anon_key', cleanKey);
    } catch {
      // ignore
    }
  }

  return { url: cleanUrl, anonKey: cleanKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = sanitizeSupabaseKey(anonKey);

  if (typeof window !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem('hsn2026_supabase_url', cleanUrl);
    } else {
      localStorage.removeItem('hsn2026_supabase_url');
    }

    if (cleanKey) {
      localStorage.setItem('hsn2026_supabase_anon_key', cleanKey);
    } else {
      localStorage.removeItem('hsn2026_supabase_anon_key');
    }
  }
  // Reset cached client instance
  cachedClient = null;
  lastClientConfig = '';
}

let cachedClient: SupabaseClient | null = null;
let lastClientConfig = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  // Validate URL basic format
  try {
    new URL(url);
  } catch {
    return null;
  }

  const currentConfigKey = `${url}_${anonKey.substring(0, 10)}`;
  if (!cachedClient || lastClientConfig !== currentConfigKey) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastClientConfig = currentConfigKey;
  }

  return cachedClient;
}

export function isSupabaseConnected(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && (url.includes('.supabase.co') || url.includes('localhost') || url.includes('127.0.0.1')));
}

// Helper untuk mendeteksi error penolakan tipe ENUM pada PostgreSQL / Supabase
export function isCategoryEnumError(error: any): boolean {
  if (!error) return false;
  const msg = ((error.message || '') + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase();
  return (
    error.code === '22P02' ||
    msg.includes('category_generation_enum') ||
    msg.includes('invalid input value for enum') ||
    (msg.includes('category') && msg.includes('enum')) ||
    msg.includes('violates check constraint') ||
    msg.includes('category_check')
  );
}

// Map database row to app's Competition interface
export function mapSupabaseToCompetition(row: any): Competition {
  let category = row.category as CategoryGeneration;
  if (category === ('PAUD/TK' as any)) {
    category = 'PAUD/RA/TK';
  } else if (!category && row.code?.includes('PAUD')) {
    category = 'PAUD/RA/TK';
  } else if (row.code?.startsWith('LMB-PN')) {
    category = 'PAGAR NUSA';
  } else if (row.code?.startsWith('LMB-GRU') || row.code?.includes('GURU')) {
    category = 'GURU';
  } else if (row.code?.startsWith('LMB-ANS') || row.code?.includes('ANSOR')) {
    category = 'ANSOR';
  } else if (!category) {
    category = 'SMP/MTs';
  }

  return {
    id: row.id || `comp-${row.code || Date.now()}`,
    code: row.code || 'LMB-00',
    title: row.title || 'Cabang Lomba',
    category,
    targetAudience: row.target_audience || 'Peserta Santri',
    description: row.description || '',
    rules: Array.isArray(row.rules) ? row.rules : (typeof row.rules === 'string' ? JSON.parse(row.rules) : []),
    prizes: typeof row.prizes === 'object' && row.prizes !== null 
      ? row.prizes 
      : {
          first: 'Trofi Juara I + Piagam + Uang Pembinaan',
          second: 'Trofi Juara II + Piagam + Uang Pembinaan',
          third: 'Trofi Juara III + Piagam + Uang Pembinaan',
        },
    registrationFee: row.registration_fee || 'Gratis',
    deadline: row.registration_deadline || '15 Oktober 2026',
    technicalMeeting: row.technical_meeting || '12 Oktober 2026',
    location: row.location || 'Kompleks MWC NU Poncokusumo',
    contactPerson: row.contact_person || 'Panitia HSN 2026',
    iconName: row.icon_name || 'Trophy',
    juknisUrl: row.juknis_url || undefined,
    juknisFileName: row.juknis_file_name || undefined,
  };
}

// Map Competition interface to Supabase database row
export function mapCompetitionToSupabase(comp: Competition): Record<string, any> {
  return {
    id: comp.id,
    code: comp.code,
    title: comp.title,
    category: comp.category,
    target_audience: comp.targetAudience,
    description: comp.description,
    rules: comp.rules || [],
    prizes: comp.prizes || {},
    registration_fee: comp.registrationFee || 'Gratis',
    registration_deadline: comp.deadline,
    technical_meeting: comp.technicalMeeting || '12 Oktober 2026',
    location: comp.location || 'Kompleks MWC NU Poncokusumo',
    contact_person: comp.contactPerson || 'Panitia HSN 2026',
    icon_name: comp.iconName || 'Trophy',
    juknis_url: comp.juknisUrl || null,
    juknis_file_name: comp.juknisFileName || null,
    is_active: true,
  };
}

// Test live connection to Supabase
export async function testSupabaseConnection(): Promise<{ 
  success: boolean; 
  message: string; 
  count?: number;
  tables?: { competitions: boolean; participants: boolean; admin_users?: boolean };
}> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();

  if (!client || !url) {
    return {
      success: false,
      message: 'Kredensial Supabase (URL atau Anon Key) belum diisi di CMS Admin.',
      tables: { competitions: false, participants: false, admin_users: false }
    };
  }

  try {
    // 1. Tes tabel competitions
    const { data: compData, error: compErr, count: compCount } = await client
      .from('competitions')
      .select('id, code, title', { count: 'exact', head: false })
      .limit(1);

    // 2. Tes tabel participants
    const { error: partErr, count: partCount } = await client
      .from('participants')
      .select('id, registration_number', { count: 'exact', head: false })
      .limit(1);

    // 3. Tes tabel admin_users
    const { error: userErr, count: userCount } = await client
      .from('admin_users')
      .select('id, username', { count: 'exact', head: false })
      .limit(1);

    // Periksa apakah ada error autentikasi (Anon Key salah/kadaluarsa)
    const allErrors = [compErr, partErr, userErr].filter(Boolean);
    const authError = allErrors.find((e: any) => {
      const msg = (e?.message || '') + (e?.details || '');
      return /invalid.*(key|jwt|apikey)|unauthorized|401|jws/i.test(msg);
    });

    if (authError) {
      return {
        success: false,
        message: `Kunci Anon Key Supabase tidak valid (${authError.message}). Harap salin ulang "anon public key" dari Dashboard Supabase: Project Settings → API.`,
        tables: { competitions: false, participants: false, admin_users: false }
      };
    }

    // Periksa jika ada error jaringan di respon
    const netError = allErrors.find((e: any) => {
      const msg = (e?.message || '') + (e?.details || '');
      return /failed to fetch|networkerror|load failed|enotfound/i.test(msg);
    });

    if (netError) {
      return {
        success: false,
        message: `Gagal menghubungi server database Supabase (${url}). Pastikan proyek Supabase dalam status Aktif (bukan Paused) dan URL API benar.`,
        tables: { competitions: false, participants: false, admin_users: false }
      };
    }

    const hasCompTable = !compErr;
    const hasPartTable = !partErr;
    const hasUserTable = !userErr;

    if (!hasCompTable && !hasPartTable && !hasUserTable) {
      return {
        success: false,
        message: 'Koneksi ke Supabase terhubung, namun tabel database belum ada. Harap salin & jalankan skrip SQL di Supabase SQL Editor.',
        tables: { competitions: false, participants: false, admin_users: false }
      };
    }

    const totalComps = compCount ?? compData?.length ?? 0;
    const totalParts = partCount ?? 0;
    const totalUsers = userCount ?? 0;

    return {
      success: true,
      message: `Terhubung & Siap! Ditemukan ${totalComps} lomba, ${totalParts} peserta, dan ${totalUsers} user panitia di Supabase.`,
      count: totalComps,
      tables: { competitions: hasCompTable, participants: hasPartTable, admin_users: hasUserTable }
    };
  } catch (err: any) {
    let friendly = err?.message || 'Kesalahan jaringan';
    if (friendly.includes('Failed to fetch') || friendly.includes('NetworkError') || friendly.includes('Load failed')) {
      friendly = `Gagal menghubungi Supabase (${url}). Pastikan: (1) URL Supabase benar, (2) Proyek Supabase aktif / tidak dijeda (paused), (3) Adblocker/Brave Shields tidak memblokir domain supabase.co.`;
    }
    return {
      success: false,
      message: friendly,
      tables: { competitions: false, participants: false }
    };
  }
}

// Direct lightweight ping tester to verify if Supabase API is reachable
export async function pingSupabaseEndpoint(customUrl?: string): Promise<{ reachable: boolean; status?: number; error?: string }> {
  const { url: defaultUrl } = getSupabaseCredentials();
  const targetUrl = sanitizeSupabaseUrl(customUrl || defaultUrl);

  if (!targetUrl) {
    return { reachable: false, error: 'URL Supabase belum diisi.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch(`${targetUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': getSupabaseCredentials().anonKey || 'public',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Any HTTP response (200, 401, 403, 404, etc.) means the domain is alive & reachable
    return { reachable: true, status: resp.status };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { reachable: false, error: 'Waktu tunggu habis (Timeout 7 detik). Proyek Supabase kemungkinan sedang dijeda (paused) atau jaringan lambat.' };
    }
    return { reachable: false, error: err?.message || 'Gagal menghubungi server Supabase (Failed to fetch).' };
  }
}

// Fetch all active competitions from Supabase
export async function fetchCompetitionsFromSupabase(): Promise<{ data: Competition[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { data, error } = await client
      .from('competitions')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error:', error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    const competitions = data.map(mapSupabaseToCompetition);
    return { data: competitions, error: null };
  } catch (err: any) {
    console.warn('Exception fetching from Supabase:', err);
    return { data: null, error: err.message || 'Gagal memuat data dari Supabase' };
  }
}

// Insert new competition
export async function insertCompetitionToSupabase(comp: Competition): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    let row = mapCompetitionToSupabase(comp);
    let attempts = 6;
    let lastError: any = null;
    let fallbackCategoryApplied = false;

    while (attempts > 0) {
      attempts--;
      const { error } = await client.from('competitions').insert([row]);
      if (!error) {
        return { success: true, error: null };
      }

      lastError = error;

      // 1. Cek jika database Supabase menolak enum baru ('PAUD/RA/TK' atau 'PAGAR NUSA')
      if (!fallbackCategoryApplied && isCategoryEnumError(error)) {
        fallbackCategoryApplied = true;
        if (row.category === 'PAUD/RA/TK') {
          console.warn('Supabase menolak enum PAUD/RA/TK, otomatis fallback ke PAUD/TK untuk kompatibilitas database...');
          row.category = 'PAUD/TK';
          continue;
        } else if (row.category === 'PAGAR NUSA') {
          console.warn('Supabase menolak enum PAGAR NUSA, otomatis fallback ke UMUM untuk kompatibilitas database...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'GURU') {
          console.warn('Supabase menolak enum GURU, otomatis fallback ke UMUM untuk kompatibilitas database...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'ANSOR') {
          console.warn('Supabase menolak enum ANSOR, otomatis fallback ke UMUM untuk kompatibilitas database...');
          row.category = 'UMUM';
          continue;
        }
      }

      const match = error.message?.match(/Could not find the '([^']+)' column of 'competitions'/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema cache missing column '${missingCol}' in competitions table. Auto-stripping and retrying...`);
        delete row[missingCol];
        continue;
      }
      break;
    }

    return { success: false, error: lastError?.message || 'Gagal menambahkan lomba ke Supabase' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambahkan lomba ke Supabase' };
  }
}

// Update existing competition
export async function updateCompetitionInSupabase(comp: Competition): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    let row = mapCompetitionToSupabase(comp);
    let attempts = 6;
    let lastError: any = null;
    let fallbackCategoryApplied = false;

    while (attempts > 0) {
      attempts--;
      const { error } = await client
        .from('competitions')
        .update(row)
        .eq('id', comp.id);

      if (!error) {
        return { success: true, error: null };
      }

      lastError = error;

      // 1. Cek fallback enum kategori
      if (!fallbackCategoryApplied && isCategoryEnumError(error)) {
        fallbackCategoryApplied = true;
        if (row.category === 'PAUD/RA/TK') {
          console.warn('Supabase menolak enum PAUD/RA/TK saat update, otomatis fallback ke PAUD/TK...');
          row.category = 'PAUD/TK';
          continue;
        } else if (row.category === 'PAGAR NUSA') {
          console.warn('Supabase menolak enum PAGAR NUSA saat update, otomatis fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'GURU') {
          console.warn('Supabase menolak enum GURU saat update, otomatis fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'ANSOR') {
          console.warn('Supabase menolak enum ANSOR saat update, otomatis fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        }
      }

      const match = error.message?.match(/Could not find the '([^']+)' column of 'competitions'/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema cache missing column '${missingCol}' in competitions table. Auto-stripping and retrying...`);
        delete row[missingCol];
        continue;
      }
      break;
    }

    return { success: false, error: lastError?.message || 'Gagal memperbarui lomba di Supabase' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui lomba di Supabase' };
  }
}

// Delete competition with cascade support for referenced participants
export async function deleteCompetitionFromSupabase(id: string): Promise<{ success: boolean; error: string | null; isForeignKeyError?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    // 1. Hapus pendaftar/peserta yang terdaftar pada cabang lomba ini terlebih dahulu di Supabase
    //    Hal ini menjamin penghapusan tidak terblokir oleh constraint foreign key 'participants_competition_id_fkey'
    try {
      await client.from('participants').delete().eq('competition_id', id);
    } catch (partErr) {
      console.warn('Peringatan: Gagal menghapus relasi peserta di Supabase sebelum hapus lomba:', partErr);
    }

    // 2. Hapus cabang lomba dari tabel competitions
    const { error } = await client.from('competitions').delete().eq('id', id);

    if (error) {
      const isFk = 
        error.message?.toLowerCase().includes('foreign key') || 
        error.message?.toLowerCase().includes('participants_competition_id_fkey') ||
        error.message?.toLowerCase().includes('referenced by a foreign key');

      // Jika masih terkendala foreign key (misalnya ada pendaftar baru masuk atau nama kolom lain),
      // coba lepaskan referensi kolom competition_id menjadi NULL lalu ulangi delete
      if (isFk) {
        try {
          await client.from('participants').update({ competition_id: null }).eq('competition_id', id);
          const retry = await client.from('competitions').delete().eq('id', id);
          if (!retry.error) {
            return { success: true, error: null };
          }
        } catch (_) {}
      }

      return { 
        success: false, 
        error: error.message,
        isForeignKeyError: isFk
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus lomba dari Supabase' };
  }
}

// Sync/Seed all competitions to Supabase in bulk (with automatic schema-cache self healing)
export async function syncAllCompetitionsToSupabase(competitions: Competition[]): Promise<{ success: boolean; count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const listToSync = competitions && competitions.length > 0 ? competitions : INITIAL_COMPETITIONS;
    let rows = listToSync.map(mapCompetitionToSupabase);

    let attempts = 6;
    let lastError: any = null;
    let fallbackCategoryApplied = false;

    while (attempts > 0) {
      attempts--;
      // Upsert all rows by primary key (id)
      const { error } = await client
        .from('competitions')
        .upsert(rows, { onConflict: 'id' });

      if (!error) {
        return { success: true, count: rows.length, error: null };
      }

      lastError = error;

      // 1. Cek jika database Supabase belum mendukung enum baru ('PAUD/RA/TK' atau 'PAGAR NUSA')
      if (!fallbackCategoryApplied && isCategoryEnumError(error)) {
        fallbackCategoryApplied = true;
        console.warn('Supabase menolak enum kategori pada sync. Mengonversi PAUD/RA/TK -> PAUD/TK dan PAGAR NUSA/GURU/ANSOR -> UMUM untuk database lama...');
        rows = rows.map((r) => {
          let cat = r.category;
          if (cat === 'PAUD/RA/TK') cat = 'PAUD/TK';
          else if (cat === 'PAGAR NUSA' || cat === 'GURU' || cat === 'ANSOR') cat = 'UMUM';
          return { ...r, category: cat };
        });
        continue;
      }

      // 2. Periksa apakah ada kolom yang tidak ditemukan di schema cache Supabase (seperti juknis_file_name, juknis_url, dll.)
      const match = error.message?.match(/Could not find the '([^']+)' column of 'competitions'/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema missing column '${missingCol}' in competitions table. Auto-stripping '${missingCol}' from sync payload and retrying...`);
        rows = rows.map((r) => {
          const clone = { ...r };
          delete clone[missingCol];
          return clone;
        });
        continue;
      }
      break;
    }

    return { success: false, count: 0, error: lastError?.message || 'Gagal melakukan sinkronisasi massal' };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Gagal melakukan sinkronisasi massal' };
  }
}

// Map participant row from Supabase to ParticipantRegistration
export function mapSupabaseToParticipant(row: any): any {
  let category = row.category;
  if (category === 'PAUD/TK') {
    category = 'PAUD/RA/TK';
  } else if (!category) {
    category = 'SMP/MTs';
  }

  return {
    id: row.id || `reg-${Date.now()}`,
    registrationNumber: row.registration_number || 'HSN26-REG',
    fullName: row.full_name || '',
    institution: row.institution || '',
    category,
    birthDate: row.birth_date || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    competitionId: row.competition_id || '',
    competitionTitle: row.competition_title || '',
    documentName: row.document_name || undefined,
    documentUrl: row.document_url || undefined,
    paymentProofName: row.payment_proof_name || undefined,
    paymentProofUrl: row.payment_proof_url || undefined,
    status: row.status === 'Terverifikasi' ? 'Terverifikasi' : row.status === 'Ditolak' ? 'Ditolak' : 'Menunggu',
    registeredAt: row.registered_at ? new Date(row.registered_at).toLocaleString('id-ID') : '',
    workSubmissionType: row.work_submission_type || (row.work_file_url ? 'file' : row.work_drive_link ? 'drive' : undefined),
    workFileName: row.work_file_name || undefined,
    workFileUrl: row.work_file_url || undefined,
    workDriveUrl: row.work_drive_link || undefined,
    workNotes: row.work_notes || undefined,
    workSubmittedAt: row.work_submitted_at ? new Date(row.work_submitted_at).toLocaleString('id-ID') : undefined,
  };
}

// Map ParticipantRegistration to Supabase participants table row
export function mapParticipantToSupabase(p: any): Record<string, any> {
  // Pastikan format tanggal birth_date adalah YYYY-MM-DD atau null jika kosong
  let cleanBirthDate: string | null = null;
  if (p.birthDate && typeof p.birthDate === 'string' && p.birthDate.trim().length >= 4) {
    cleanBirthDate = p.birthDate.trim();
  }

  const fullAddress = p.district || p.regency || p.province
    ? [
        (p.address || '').trim(),
        p.district ? `Kec. ${p.district.trim()}` : '',
        p.regency ? p.regency.trim() : '',
        p.province ? p.province.trim() : ''
      ].filter(Boolean).join(', ')
    : (p.address || '').trim();

  const row: Record<string, any> = {
    registration_number: p.registrationNumber,
    full_name: (p.fullName || '').trim(),
    institution: (p.institution || '').trim(),
    category: p.category,
    whatsapp: (p.whatsapp || '').trim(),
    status: p.status === 'Terverifikasi' ? 'Terverifikasi' : p.status === 'Ditolak' ? 'Ditolak' : 'Menunggu Verifikasi',
  };

  // Kolom opsional profil & perlombaan (hanya sertakan jika ada isinya)
  if (cleanBirthDate) row.birth_date = cleanBirthDate;
  if (p.email && p.email.trim()) row.email = p.email.trim();
  if (fullAddress) row.address = fullAddress;
  if (p.competitionId) row.competition_id = p.competitionId;
  if (p.competitionTitle) row.competition_title = p.competitionTitle;
  if (p.documentName) row.document_name = p.documentName;
  if (p.documentUrl) row.document_url = p.documentUrl;
  if (p.paymentProofName) row.payment_proof_name = p.paymentProofName;
  if (p.paymentProofUrl) row.payment_proof_url = p.paymentProofUrl;

  // Kolom berkas karya: HANYA sertakan jika peserta sudah mengunggah/mengisi karya
  // Hal ini mencegah error "Could not find the 'work_submitted_at' column of 'participants' in the schema cache"
  // pada database Supabase yang belum menjalankan migrasi kolom karya.
  if (p.workSubmissionType) row.work_submission_type = p.workSubmissionType;
  if (p.workFileName) row.work_file_name = p.workFileName;
  if (p.workFileUrl) row.work_file_url = p.workFileUrl;
  if (p.workDriveUrl) row.work_drive_link = p.workDriveUrl;
  if (p.workNotes) row.work_notes = p.workNotes;
  if (p.workSubmittedAt) {
    try {
      row.work_submitted_at = new Date(p.workSubmittedAt).toISOString();
    } catch {
      row.work_submitted_at = new Date().toISOString();
    }
  }

  return row;
}

// Insert new participant registration into Supabase (with automatic schema-cache self healing)
export async function insertParticipantToSupabase(participant: any): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      success: false, 
      error: 'Kredensial Supabase (URL & Anon Key) belum diisi di CMS Admin. Data tersimpan di penyimpanan lokal.' 
    };
  }

  try {
    let row = mapParticipantToSupabase(participant);
    let attempts = 25;
    let lastError: any = null;
    let fallbackCategoryApplied = false;

    while (attempts > 0) {
      attempts--;
      const { error } = await client.from('participants').insert([row]);
      if (!error) {
        return { success: true, error: null };
      }

      lastError = error;

      // 1. Cek jika database Supabase belum mendukung enum kategori baru
      if (!fallbackCategoryApplied && isCategoryEnumError(error)) {
        fallbackCategoryApplied = true;
        if (row.category === 'PAUD/RA/TK') {
          console.warn('Supabase peserta menolak enum PAUD/RA/TK, fallback ke PAUD/TK...');
          row.category = 'PAUD/TK';
          continue;
        } else if (row.category === 'PAGAR NUSA') {
          console.warn('Supabase peserta menolak enum PAGAR NUSA, fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'GURU') {
          console.warn('Supabase peserta menolak enum GURU, fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        } else if (row.category === 'ANSOR') {
          console.warn('Supabase peserta menolak enum ANSOR, fallback ke UMUM...');
          row.category = 'UMUM';
          continue;
        }
      }

      // 2. Cek jika kolom belum ada di schema cache tabel participants Supabase (misal work_submitted_at, payment_proof_name, dll.)
      const missingMatch = 
        error.message?.match(/Could not find the ['"]([^'"]+)['"] column of ['"]participants['"]/i) ||
        error.message?.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation ['"]?participants['"]? does not exist/i) ||
        error.message?.match(/Could not find the '([^']+)' column/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`Supabase schema missing column '${missingCol}' in participants table. Auto-stripping '${missingCol}' and retrying...`);
        delete row[missingCol];
        continue;
      }

      // 3. Cek jika terjadi error foreign key pada competition_id karena tabel competitions belum terisi di Supabase
      if (row.competition_id && (
        error.code === '23503' || 
        error.message?.toLowerCase().includes('foreign key') || 
        error.message?.toLowerCase().includes('violates foreign key constraint') ||
        error.message?.toLowerCase().includes('competition_id')
      )) {
        console.warn('Foreign key competition_id fallback: mencoba simpan ulang dengan competition_id null...', error.message);
        row.competition_id = null;
        continue;
      }

      break;
    }

    if (lastError) {
      console.warn('Error inserting participant to Supabase:', lastError);
      let friendlyError = lastError.message;
      if (lastError.code === '42P01' || lastError.message?.toLowerCase().includes('does not exist')) {
        friendlyError = 'Tabel "participants" belum dibuat di Supabase. Jalankan skrip SQL di Supabase SQL Editor.';
      } else if (lastError.code === '42501' || lastError.message?.toLowerCase().includes('violates row-level security policy')) {
        friendlyError = 'Izin RLS Supabase menolak INSERT publik. Buka Supabase SQL Editor dan jalankan Policy RLS peserta.';
      }
      return { success: false, error: friendlyError };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('Exception inserting participant to Supabase:', err);
    let errMsg = err?.message || 'Gagal menyimpan data ke Supabase';
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('Load failed')) {
      const { url } = getSupabaseCredentials();
      errMsg = `Koneksi ke Supabase terputus (Failed to fetch). ` +
        `Kemungkinan: Proyek Supabase sedang dijeda (paused) di dashboard, ` +
        `URL (${url || 'belum diisi'}) tidak dapat diakses, atau diblokir adblocker/jaringan.`;
    }
    return { success: false, error: errMsg };
  }
}

// Fetch all participants from Supabase
export async function fetchParticipantsFromSupabase(): Promise<{ data: any[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    // Coba ambil dan urutkan berdasarkan registered_at
    let { data, error } = await client
      .from('participants')
      .select('*')
      .order('registered_at', { ascending: false });

    // Fallback jika kolom registered_at belum ada di skema tabel Supabase
    if (error && (error.message?.includes('registered_at') || error.code === '42703')) {
      const retry = await client.from('participants').select('*');
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) return { data: [], error: null };

    const parsed = data.map(mapSupabaseToParticipant);
    return { data: parsed, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal memuat peserta dari Supabase' };
  }
}

// Bulk sync all participants from local state to Supabase
export async function syncAllParticipantsToSupabase(
  participants: any[]
): Promise<{ success: boolean; count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client belum dikonfigurasi.' };
  }

  if (!participants || participants.length === 0) {
    return { success: true, count: 0, error: null };
  }

  try {
    let rows = participants.map(mapParticipantToSupabase);
    let attempts = 25;
    let lastError: any = null;
    let fallbackCategoryApplied = false;

    while (attempts > 0) {
      attempts--;
      // Upsert by registration_number
      const { error } = await client
        .from('participants')
        .upsert(rows, { onConflict: 'registration_number' });

      if (!error) {
        return { success: true, count: rows.length, error: null };
      }

      lastError = error;

      // 1. Cek jika database menolak enum kategori baru
      if (!fallbackCategoryApplied && isCategoryEnumError(error)) {
        fallbackCategoryApplied = true;
        console.warn('Supabase peserta sync menolak enum kategori, fallback ke format lama...');
        rows = rows.map((r) => {
          let cat = r.category;
          if (cat === 'PAUD/RA/TK') cat = 'PAUD/TK';
          else if (cat === 'PAGAR NUSA' || cat === 'GURU' || cat === 'ANSOR') cat = 'UMUM';
          return { ...r, category: cat };
        });
        continue;
      }

      // Check if column missing in schema cache
      const match = 
        error.message?.match(/Could not find the ['"]([^'"]+)['"] column of ['"]participants['"]/i) ||
        error.message?.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation ['"]?participants['"]? does not exist/i) ||
        error.message?.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema missing column '${missingCol}' in participants. Stripping and retrying...`);
        rows = rows.map((r) => {
          const clone = { ...r };
          delete clone[missingCol];
          return clone;
        });
        continue;
      }

      // Check foreign key constraint on competition_id
      if (
        error.code === '23503' ||
        error.message?.toLowerCase().includes('foreign key') ||
        error.message?.toLowerCase().includes('violates foreign key constraint') ||
        error.message?.toLowerCase().includes('competition_id')
      ) {
        console.warn('Foreign key issue on competition_id, setting to null and retrying...');
        rows = rows.map((r) => ({ ...r, competition_id: null }));
        continue;
      }

      break;
    }

    return { success: false, count: 0, error: lastError?.message || 'Gagal sinkronisasi data peserta ke Supabase' };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Gagal sinkronisasi data peserta ke Supabase' };
  }
}

// Update participant verification status
export async function updateParticipantStatusInSupabase(
  registrationNumberOrId: string,
  status: 'Terverifikasi' | 'Menunggu' | 'Ditolak'
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const dbStatus = status === 'Terverifikasi' ? 'Terverifikasi' : status === 'Ditolak' ? 'Ditolak' : 'Menunggu Verifikasi';
    const key = (registrationNumberOrId || '').trim();

    // 1. Coba update via registration_number (paling akurat & selalu berupa string VARCHAR)
    const { data: regMatch, error: regErr } = await client
      .from('participants')
      .update({ status: dbStatus })
      .eq('registration_number', key)
      .select('id, registration_number');

    if (!regErr && regMatch && regMatch.length > 0) {
      return { success: true, error: null };
    }

    // 2. Jika key berupa UUID atau Integer, coba update berdasarkan kolom id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const isNum = /^\d+$/.test(key);
    if (isUuid || isNum) {
      const { data: idMatch, error: idErr } = await client
        .from('participants')
        .update({ status: dbStatus })
        .eq('id', key)
        .select('id');
      if (!idErr && idMatch && idMatch.length > 0) {
        return { success: true, error: null };
      }
    }

    if (regErr) {
      return { success: false, error: regErr.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui status di Supabase' };
  }
}

// Update or submit participant work (file JPG/PNG or Google Drive link)
export async function updateParticipantWorkInSupabase(
  registrationNumber: string,
  workData: {
    workSubmissionType?: 'file' | 'drive';
    workFileName?: string;
    workFileUrl?: string;
    workDriveUrl?: string;
    workNotes?: string;
    workSubmittedAt?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi. Data tersimpan di sistem lokal.' };
  }

  try {
    const regNum = registrationNumber.trim();
    const nowIso = workData.workSubmittedAt || new Date().toISOString();

    // 1. Update di tabel participants
    let updatePayload: Record<string, any> = {
      work_submission_type: workData.workSubmissionType || null,
      work_file_name: workData.workFileName || null,
      work_file_url: workData.workFileUrl || null,
      work_drive_link: workData.workDriveUrl || null,
      work_notes: workData.workNotes || null,
      work_submitted_at: nowIso,
    };

    let attempts = 4;
    let lastError: any = null;

    while (attempts > 0) {
      attempts--;
      const { error } = await client
        .from('participants')
        .update(updatePayload)
        .eq('registration_number', regNum);

      if (!error) {
        lastError = null;
        break;
      }
      lastError = error;

      // Schema-cache auto stripping jika kolom tertentu belum ditambahkan di Supabase
      const missingMatch = error.message?.match(/Could not find the '([^']+)' column of 'participants'/i);
      if (missingMatch && missingMatch[1]) {
        console.warn(`Kolom '${missingMatch[1]}' belum ada di tabel participants Supabase. Melewati kolom ini dan mencoba kembali...`);
        delete updatePayload[missingMatch[1]];
        continue;
      }
      break;
    }

    // 2. Upayakan juga catat di tabel participant_works jika tabel telah dibuat
    try {
      await client.from('participant_works').insert([
        {
          registration_number: regNum,
          submission_type: workData.workSubmissionType,
          work_file_name: workData.workFileName || null,
          work_file_url: workData.workFileUrl || null,
          work_drive_link: workData.workDriveUrl || null,
          work_notes: workData.workNotes || null,
          submitted_at: nowIso,
        },
      ]);
    } catch {
      // Abaikan jika tabel participant_works belum dibuat
    }

    if (lastError) {
      return { success: false, error: lastError.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan karya ke Supabase.' };
  }
}

// Delete participant registration from Supabase
export async function deleteParticipantFromSupabase(
  registrationNumberOrId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const key = (registrationNumberOrId || '').trim();

    // 1. Hapus berdasarkan registration_number
    const { error: regErr } = await client
      .from('participants')
      .delete()
      .eq('registration_number', key);

    if (!regErr) {
      return { success: true, error: null };
    }

    // 2. Jika key berupa UUID atau Integer, coba hapus berdasarkan id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const isNum = /^\d+$/.test(key);
    if (isUuid || isNum) {
      const { error: idErr } = await client
        .from('participants')
        .delete()
        .eq('id', key);

      if (!idErr) {
        return { success: true, error: null };
      }
    }

    return { success: false, error: regErr.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus data peserta dari Supabase' };
  }
}

// Purge all initial mock/sample participants from Supabase table permanently
export async function purgeMockParticipantsFromSupabase(): Promise<{ success: boolean; count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { data, error } = await client
      .from('participants')
      .delete()
      .or('registration_number.ilike.HSN-2026-00%,registration_number.ilike.HSN26-%-000%,id.ilike.reg-00%')
      .select('id');

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || 0, error: null };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Gagal membersihkan data dummy peserta' };
  }
}

export const DELETE_MOCK_PARTICIPANTS_SQL = `-- ==============================================================================
-- SKRIP HAPUS DATA CONTOH/DUMMY PESERTA AWAL SECARA PERMANEN DI SUPABASE
-- Jalankan di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

DELETE FROM public.participants 
WHERE registration_number LIKE 'HSN-2026-00%' 
   OR registration_number LIKE 'HSN26-%-000%' 
   OR id LIKE 'reg-00%';

-- Muat ulang cache schema PostgREST Supabase
NOTIFY pgrst, 'reload schema';
`;

// Upload file to Supabase Storage bucket (e.g. bukti pembayaran or dokumen mandat)
export async function uploadFileToSupabaseStorage(
  bucketName: string,
  folder: string,
  file: File
): Promise<{ success: boolean; url: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, url: null, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'dat';
    const cleanFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      return { success: false, url: null, error: error.message };
    }

    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    return {
      success: true,
      url: publicUrlData?.publicUrl || null,
      error: null,
    };
  } catch (err: any) {
    return { success: false, url: null, error: err.message || 'Gagal mengupload file ke Storage' };
  }
}

// Insert contact message to Supabase contact_messages table
export async function insertContactMessageToSupabase(message: {
  name: string;
  email?: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { error } = await client.from('contact_messages').insert([
      {
        sender_name: message.name.trim(),
        sender_email: message.email ? message.email.trim() : null,
        subject: message.subject ? message.subject.trim() : 'Pesan dari Website HSN 2026',
        message: message.message.trim(),
      },
    ]);

    if (error) {
      console.warn('Error inserting contact message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan pesan kontak ke Supabase' };
  }
}

// -----------------------------------------------------------------------------
// ADMIN USERS (PANITIA & CMS ACCESS) SYNCHRONIZATION
// -----------------------------------------------------------------------------

// Map database row to AdminUser interface
export function mapSupabaseToAdminUser(row: any): AdminUser {
  return {
    id: row.id || `user-${Date.now()}`,
    fullName: row.full_name || 'Panitia HSN 2026',
    username: (row.username || '').toLowerCase().trim(),
    password: row.password || undefined,
    role: normalizePanitiaRole(row.role || 'Sekretariat Utama HSN 2026'),
    email: row.email || '',
    phone: row.phone || '',
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '01 Oktober 2026',
    isActive: row.is_active ?? true,
  };
}

// Map AdminUser to Supabase admin_users table row
export function mapAdminUserToSupabase(u: AdminUser): Record<string, any> {
  return {
    id: u.id,
    full_name: (u.fullName || '').trim(),
    username: (u.username || '').toLowerCase().trim(),
    password: u.password || 'santri2026',
    role: u.role || 'Sekretariat Utama HSN 2026',
    email: u.email ? u.email.trim() : null,
    phone: u.phone ? u.phone.trim() : null,
    is_active: u.isActive ?? true,
  };
}

// Fetch all admin users from Supabase admin_users table
export async function fetchAdminUsersFromSupabase(): Promise<{ data: AdminUser[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { data, error } = await client
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) return { data: [], error: null };

    const parsed = data.map(mapSupabaseToAdminUser);
    const valid = parsed.filter((u) => !isUserDeleted(u.id, u.username));

    // Bersihkan data dari Supabase jika ada akun yang telah dihapus di lokal
    parsed.forEach((u) => {
      if (isUserDeleted(u.id, u.username)) {
        const query = u.username 
          ? client.from('admin_users').delete().or(`id.eq.${u.id},username.eq.${u.username}`)
          : client.from('admin_users').delete().eq('id', u.id);
        query.then(() => {}, (err: any) => console.warn(err));
      }
    });

    return { data: valid, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal memuat data user panitia dari Supabase' };
  }
}

// Helper to detect if admin_users table does not exist in Supabase PostgREST schema cache
export function isMissingAdminUsersTable(error: any): boolean {
  if (!error) return false;
  const msg = ((error.message || '') + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase();
  const code = (error.code || '').toString();
  return (
    code === '42P01' ||
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the public.admin_users') ||
    msg.includes('relation "public.admin_users" does not exist') ||
    msg.includes('relation "admin_users" does not exist') ||
    (msg.includes('admin_users') && msg.includes('does not exist'))
  );
}

export const ADMIN_USERS_SETUP_SQL = `-- ==============================================================================
-- SKRIP TABEL AKUN PANITIA (ADMIN_USERS): FESTIVAL HARI SANTRI 2026
-- Salin dan jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kebijakan Row Level Security (RLS) untuk Akses Anon Key & CMS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all admin_users" ON public.admin_users;
CREATE POLICY "Public all admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

-- Muat ulang cache schema PostgREST Supabase agar tabel langsung terbaca
NOTIFY pgrst, 'reload schema';
`;

export const FIX_FOREIGN_KEY_CASCADE_SQL = `-- ==============================================================================
-- SKRIP PERBAIKAN FOREIGN KEY CASCADE: TABEL COMPETITIONS & PARTICIPANTS
-- Mengatasi error: "referenced by a foreign key constraint from table 'participants'"
-- Jalankan di Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Hapus constraint Foreign Key lama pada tabel participants (yang memblokir delete lomba)
ALTER TABLE IF EXISTS public.participants 
  DROP CONSTRAINT IF EXISTS participants_competition_id_fkey;

-- 2. Pasang kembali constraint dengan aturan ON DELETE CASCADE
-- (Saat cabang lomba dihapus di Supabase Table Editor maupun Website,
--  data pendaftar terkait otomatis terhapus tanpa penolakan foreign key)
ALTER TABLE IF EXISTS public.participants 
  ADD CONSTRAINT participants_competition_id_fkey 
  FOREIGN KEY (competition_id) 
  REFERENCES public.competitions(id) 
  ON DELETE CASCADE;

-- 3. Muat ulang cache schema PostgREST Supabase
NOTIFY pgrst, 'reload schema';
`;

export const FIX_CATEGORY_ENUM_SQL = `-- ==============================================================================
-- SKRIP PERBAIKAN KATEGORI LOMBA (PAUD/RA/TK, PAGAR NUSA, GURU & ANSOR) DI SUPABASE
-- Mengatasi Error:
-- 1. ERROR: invalid input value for enum category_generation_enum
-- 2. ERROR 0A000: cannot alter type of a column used by a view or rule (view_rekap_peserta_lomba & view_pendaftar_terbaru)
-- Jalankan di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Lepaskan view dependen sementara agar ALTER COLUMN tidak terblokir (Error 0A000)
--    Semua view yang bergantung pada kolom category dilepas terlebih dahulu dengan CASCADE
DROP VIEW IF EXISTS public.view_rekap_peserta_lomba CASCADE;
DROP VIEW IF EXISTS public.view_pendaftar_terbaru CASCADE;

-- 2. Jadikan kolom category bertipe VARCHAR(100) fleksibel pada tabel competitions & participants
--    Hal ini membebaskan sistem dari batasan tipe ENUM lama untuk selamanya
ALTER TABLE IF EXISTS public.competitions 
  ALTER COLUMN category TYPE VARCHAR(100) USING category::text;

ALTER TABLE IF EXISTS public.participants 
  ALTER COLUMN category TYPE VARCHAR(100) USING category::text;

-- 3. Hapus batasan CHECK constraint jika ada
ALTER TABLE IF EXISTS public.competitions 
  DROP CONSTRAINT IF EXISTS competitions_category_check;

ALTER TABLE IF EXISTS public.participants 
  DROP CONSTRAINT IF EXISTS participants_category_check;

-- 4. Migrasikan data lama dari 'PAUD/TK' menjadi 'PAUD/RA/TK'
UPDATE public.competitions 
  SET category = 'PAUD/RA/TK' 
  WHERE category = 'PAUD/TK';

UPDATE public.participants 
  SET category = 'PAUD/RA/TK' 
  WHERE category = 'PAUD/TK';

-- 5. Bangun kembali view_rekap_peserta_lomba dengan tipe baru agar fitur pelaporan tetap aktif
CREATE OR REPLACE VIEW public.view_rekap_peserta_lomba AS
SELECT 
  c.id AS competition_id,
  c.code AS competition_code,
  c.title AS competition_title,
  c.category AS competition_category,
  COUNT(p.id) AS total_pendaftar,
  COUNT(CASE WHEN p.status = 'Terverifikasi' THEN 1 END) AS total_terverifikasi,
  COUNT(CASE WHEN p.status = 'Menunggu Verifikasi' THEN 1 END) AS total_menunggu,
  COUNT(CASE WHEN p.status = 'Finalis' THEN 1 END) AS total_finalis
FROM public.competitions c
LEFT JOIN public.participants p ON c.id = p.competition_id
GROUP BY c.id, c.code, c.title, c.category
ORDER BY c.code ASC;

-- 6. Bangun kembali view_pendaftar_terbaru dengan tipe baru
CREATE OR REPLACE VIEW public.view_pendaftar_terbaru AS
SELECT 
  p.registration_number,
  p.full_name,
  p.institution,
  p.category,
  p.competition_title,
  p.whatsapp,
  p.status,
  p.registered_at
FROM public.participants p
ORDER BY p.registered_at DESC;

-- 7. Muat ulang cache schema PostgREST Supabase agar perubahan langsung aktif
NOTIFY pgrst, 'reload schema';
`;

// Bulk sync all admin users from CMS to Supabase admin_users table
export async function syncAllAdminUsersToSupabase(
  users: AdminUser[]
): Promise<{ success: boolean; count: number; error: string | null; missingTable?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client belum dikonfigurasi.', missingTable: false };
  }

  if (!users || users.length === 0) {
    return { success: true, count: 0, error: null, missingTable: false };
  }

  try {
    let rows = users.map(mapAdminUserToSupabase);
    let attempts = 4;
    let lastError: any = null;

    while (attempts > 0) {
      attempts--;
      const { error } = await client
        .from('admin_users')
        .upsert(rows, { onConflict: 'id' });

      if (!error) {
        return { success: true, count: rows.length, error: null, missingTable: false };
      }

      lastError = error;

      if (isMissingAdminUsersTable(error)) {
        return {
          success: false,
          count: 0,
          missingTable: true,
          error: 'Tabel "admin_users" belum dibuat di database Supabase Anda. Harap buat tabel ini melalui Supabase SQL Editor.',
        };
      }

      // Self healing if schema missing columns
      const match = error.message?.match(/Could not find the '([^']+)' column of 'admin_users'/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema missing column '${missingCol}' in admin_users. Stripping and retrying...`);
        rows = rows.map((r) => {
          const clone = { ...r };
          delete clone[missingCol];
          return clone;
        });
        continue;
      }

      break;
    }

    if (isMissingAdminUsersTable(lastError)) {
      return {
        success: false,
        count: 0,
        missingTable: true,
        error: 'Tabel "admin_users" belum dibuat di database Supabase Anda. Harap buat tabel ini melalui Supabase SQL Editor.',
      };
    }

    return { success: false, count: 0, error: lastError?.message || 'Gagal sinkronisasi data user panitia ke Supabase', missingTable: false };
  } catch (err: any) {
    const missing = isMissingAdminUsersTable(err);
    return { 
      success: false, 
      count: 0, 
      missingTable: missing,
      error: missing 
        ? 'Tabel "admin_users" belum dibuat di database Supabase Anda. Harap buat tabel ini melalui Supabase SQL Editor.' 
        : (err.message || 'Gagal sinkronisasi data user panitia ke Supabase') 
    };
  }
}

// Insert single admin user to Supabase
export async function insertAdminUserToSupabase(user: AdminUser): Promise<{ success: boolean; error: string | null; missingTable?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi.', missingTable: false };

  try {
    const row = mapAdminUserToSupabase(user);
    const { error } = await client.from('admin_users').upsert([row], { onConflict: 'id' });
    if (error) {
      if (isMissingAdminUsersTable(error)) {
        return { success: false, error: 'Tabel "admin_users" belum ada di Supabase.', missingTable: true };
      }
      return { success: false, error: error.message, missingTable: false };
    }
    return { success: true, error: null, missingTable: false };
  } catch (err: any) {
    const missing = isMissingAdminUsersTable(err);
    return { success: false, error: err.message || 'Gagal menyimpan user panitia ke Supabase', missingTable: missing };
  }
}

// Update single admin user in Supabase
export async function updateAdminUserInSupabase(user: AdminUser): Promise<{ success: boolean; error: string | null; missingTable?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi.', missingTable: false };

  try {
    const row = mapAdminUserToSupabase(user);
    const { error } = await client.from('admin_users').update(row).eq('id', user.id);
    if (error) {
      if (isMissingAdminUsersTable(error)) {
        return { success: false, error: 'Tabel "admin_users" belum ada di Supabase.', missingTable: true };
      }
      return { success: false, error: error.message, missingTable: false };
    }
    return { success: true, error: null, missingTable: false };
  } catch (err: any) {
    const missing = isMissingAdminUsersTable(err);
    return { success: false, error: err.message || 'Gagal memperbarui user panitia di Supabase', missingTable: missing };
  }
}

// Delete admin user from Supabase (by ID and/or username)
export async function deleteAdminUserFromSupabase(
  id: string,
  username?: string
): Promise<{ success: boolean; error: string | null; missingTable?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi.', missingTable: false };

  try {
    let query = client.from('admin_users').delete();
    if (username && username.trim()) {
      query = query.or(`id.eq.${id},username.eq.${username.trim()}`);
    } else {
      query = query.eq('id', id);
    }
    const { error } = await query;
    if (error) {
      if (isMissingAdminUsersTable(error)) {
        return { success: false, error: 'Tabel "admin_users" belum ada di Supabase.', missingTable: true };
      }
      return { success: false, error: error.message, missingTable: false };
    }
    return { success: true, error: null, missingTable: false };
  } catch (err: any) {
    const missing = isMissingAdminUsersTable(err);
    return { success: false, error: err.message || 'Gagal menghapus user panitia dari Supabase', missingTable: missing };
  }
}


