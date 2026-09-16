import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Competition, CategoryGeneration } from '../types';
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
  tables?: { competitions: boolean; participants: boolean };
}> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();

  if (!client || !url) {
    return {
      success: false,
      message: 'Kredensial Supabase (URL atau Anon Key) belum diisi di CMS Admin.',
      tables: { competitions: false, participants: false }
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

    const hasCompTable = !compErr;
    const hasPartTable = !partErr;

    if (!hasCompTable && !hasPartTable) {
      return {
        success: false,
        message: 'Koneksi ke Supabase terhubung, namun tabel "competitions" & "participants" belum ada. Harap salin & jalankan skrip SQL di Supabase SQL Editor.',
        tables: { competitions: false, participants: false }
      };
    }

    if (!hasPartTable) {
      return {
        success: false,
        message: `Tabel "participants" (pendaftaran) belum ada atau izin RLS belum diatur (${partErr?.message}). Data pendaftaran belum bisa tersimpan ke Supabase.`,
        tables: { competitions: hasCompTable, participants: false }
      };
    }

    const totalComps = compCount ?? compData?.length ?? 0;
    const totalParts = partCount ?? 0;

    return {
      success: true,
      message: `Terhubung & Siap! Ditemukan ${totalComps} data lomba & ${totalParts} pendaftar di Supabase.`,
      count: totalComps,
      tables: { competitions: hasCompTable, participants: hasPartTable }
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
    const row = mapCompetitionToSupabase(comp);
    const { error } = await client.from('competitions').insert([row]);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
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
    const row = mapCompetitionToSupabase(comp);
    const { error } = await client
      .from('competitions')
      .update(row)
      .eq('id', comp.id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
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

// Sync/Seed all competitions to Supabase in bulk
export async function syncAllCompetitionsToSupabase(competitions: Competition[]): Promise<{ success: boolean; count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const listToSync = competitions && competitions.length > 0 ? competitions : INITIAL_COMPETITIONS;
    const rows = listToSync.map(mapCompetitionToSupabase);

    // Upsert all rows by primary key (id)
    const { error } = await client
      .from('competitions')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length, error: null };
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

// Insert new participant registration into Supabase
export async function insertParticipantToSupabase(participant: any): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      success: false, 
      error: 'Kredensial Supabase (URL & Anon Key) belum diisi di CMS Admin. Data tersimpan di penyimpanan lokal.' 
    };
  }

  try {
    const row = mapParticipantToSupabase(participant);
    let { error } = await client.from('participants').insert([row]);

    // Jika terjadi error foreign key pada competition_id karena tabel competitions belum terisi di Supabase
    if (error && (
      error.code === '23503' || 
      error.message?.toLowerCase().includes('foreign key') || 
      error.message?.toLowerCase().includes('violates foreign key constraint') ||
      error.message?.toLowerCase().includes('competition_id')
    )) {
      console.warn('Foreign key competition_id fallback: mencoba simpan ulang dengan competition_id null...', error.message);
      const fallbackRow = { ...row, competition_id: null };
      const retryResult = await client.from('participants').insert([fallbackRow]);
      if (!retryResult.error) {
        return { success: true, error: null };
      }
      error = retryResult.error;
    }

    if (error) {
      console.warn('Error inserting participant to Supabase:', error);
      let friendlyError = error.message;
      if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
        friendlyError = 'Tabel "participants" belum dibuat di Supabase. Jalankan skrip SQL di Supabase SQL Editor.';
      } else if (error.code === '42501' || error.message?.toLowerCase().includes('violates row-level security policy')) {
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

