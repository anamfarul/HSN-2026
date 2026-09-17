import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Competition, CategoryGeneration, AdminUser } from '../types';
import { INITIAL_COMPETITIONS } from '../data/initialData';

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

// Map database row to app's Competition interface
export function mapSupabaseToCompetition(row: any): Competition {
  return {
    id: row.id || `comp-${row.code || Date.now()}`,
    code: row.code || 'LMB-00',
    title: row.title || 'Cabang Lomba',
    category: (row.category as CategoryGeneration) || 'SMP/MTs',
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

    while (attempts > 0) {
      attempts--;
      const { error } = await client.from('competitions').insert([row]);
      if (!error) {
        return { success: true, error: null };
      }

      lastError = error;
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

// Delete competition
export async function deleteCompetitionFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const { error } = await client.from('competitions').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
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
      // Periksa apakah ada kolom yang tidak ditemukan di schema cache Supabase (seperti juknis_file_name, juknis_url, dll.)
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
  return {
    id: row.id || `reg-${Date.now()}`,
    registrationNumber: row.registration_number || 'HSN26-REG',
    fullName: row.full_name || '',
    institution: row.institution || '',
    category: row.category || 'SMP/MTs',
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
  };
}

// Map ParticipantRegistration to Supabase participants table row
export function mapParticipantToSupabase(p: any): Record<string, any> {
  // Pastikan format tanggal birth_date adalah YYYY-MM-DD atau null jika kosong
  let cleanBirthDate: string | null = null;
  if (p.birthDate && typeof p.birthDate === 'string' && p.birthDate.trim().length >= 4) {
    cleanBirthDate = p.birthDate.trim();
  }

  return {
    registration_number: p.registrationNumber,
    full_name: (p.fullName || '').trim(),
    institution: (p.institution || '').trim(),
    category: p.category,
    birth_date: cleanBirthDate,
    whatsapp: (p.whatsapp || '').trim(),
    email: p.email ? p.email.trim() : null,
    address: (p.address || '').trim(),
    competition_id: p.competitionId || null,
    competition_title: p.competitionTitle || 'Perlombaan HSN 2026',
    document_name: p.documentName || null,
    document_url: p.documentUrl || null,
    payment_proof_name: p.paymentProofName || null,
    payment_proof_url: p.paymentProofUrl || null,
    status: p.status === 'Terverifikasi' ? 'Terverifikasi' : p.status === 'Ditolak' ? 'Ditolak' : 'Menunggu Verifikasi',
  };
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
    let attempts = 6;
    let lastError: any = null;

    while (attempts > 0) {
      attempts--;
      const { error } = await client.from('participants').insert([row]);
      if (!error) {
        return { success: true, error: null };
      }

      lastError = error;

      // 1. Cek jika kolom belum ada di schema cache tabel participants Supabase (misal payment_proof_name, payment_proof_url, document_name, dll.)
      const missingMatch = error.message?.match(/Could not find the '([^']+)' column of 'participants'/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`Supabase schema missing column '${missingCol}' in participants table. Auto-stripping '${missingCol}' and retrying...`);
        delete row[missingCol];
        continue;
      }

      // 2. Cek jika terjadi error foreign key pada competition_id karena tabel competitions belum terisi di Supabase
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
    const { data, error } = await client
      .from('participants')
      .select('*')
      .order('registered_at', { ascending: false });

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
    let attempts = 6;
    let lastError: any = null;

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

      // Check if column missing in schema cache
      const match = error.message?.match(/Could not find the '([^']+)' column of 'participants'/i);
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
    
    // Attempt update by registration_number or by id
    const { error } = await client
      .from('participants')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .or(`registration_number.eq.${registrationNumberOrId},id.eq.${registrationNumberOrId}`);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui status di Supabase' };
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
    const { error } = await client
      .from('participants')
      .delete()
      .or(`registration_number.eq.${registrationNumberOrId},id.eq.${registrationNumberOrId}`);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus data peserta dari Supabase' };
  }
}

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
    role: row.role || 'Sekretariat Utama HSN 2026',
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
    return { data: parsed, error: null };
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

// Delete admin user from Supabase
export async function deleteAdminUserFromSupabase(id: string): Promise<{ success: boolean; error: string | null; missingTable?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi.', missingTable: false };

  try {
    const { error } = await client.from('admin_users').delete().eq('id', id);
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


