import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Competition, CategoryGeneration } from '../types';
import { INITIAL_COMPETITIONS } from '../data/initialData';

// Helper to get active credentials from environment or localStorage
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('hsn2026_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('hsn2026_supabase_anon_key') || '' : '';

  const url = (storedUrl || envUrl).trim();
  const anonKey = (storedKey || envKey).trim();

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem('hsn2026_supabase_url', url.trim());
    } else {
      localStorage.removeItem('hsn2026_supabase_url');
    }

    if (anonKey.trim()) {
      localStorage.setItem('hsn2026_supabase_anon_key', anonKey.trim());
    } else {
      localStorage.removeItem('hsn2026_supabase_anon_key');
    }
  }
  // Reset cached client instance
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

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

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return cachedClient;
}

export function isSupabaseConnected(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.includes('.supabase.co'));
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
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; count?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Kredensial Supabase (URL atau Anon Key) belum diisi.',
    };
  }

  try {
    const { data, error, count } = await client
      .from('competitions')
      .select('id, code, title', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Koneksi gagal ke tabel 'competitions': ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Terhubung ke Supabase! Ditemukan ${count ?? data?.length ?? 0} data di tabel competitions.`,
      count: count ?? data?.length ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Kesalahan jaringan'}`,
    };
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
  return {
    registration_number: p.registrationNumber,
    full_name: p.fullName,
    institution: p.institution,
    category: p.category,
    birth_date: p.birthDate || null,
    whatsapp: p.whatsapp,
    email: p.email || null,
    address: p.address,
    competition_id: p.competitionId || null,
    competition_title: p.competitionTitle,
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
    return { success: false, error: 'Supabase client belum dikonfigurasi.' };
  }

  try {
    const row = mapParticipantToSupabase(participant);
    const { error } = await client.from('participants').insert([row]);

    if (error) {
      console.warn('Error inserting participant to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('Exception inserting participant to Supabase:', err);
    return { success: false, error: err.message || 'Gagal menyimpan data ke Supabase' };
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

