import { getSupabaseClient, isSupabaseConnected, purgeMockParticipantsFromSupabase } from './supabaseClient';
import {
  UserProfile,
  AdminUser,
  JuryAssignment,
  ScoringCriterion,
  JuryScore,
  JuryScoreStatus,
  CompetitionResult,
  WinnerTitle,
  JuryAuditLog,
  JuryScoringProgress,
  Competition,
  ParticipantRegistration,
} from '../types';
import {
  INITIAL_JURY_PROFILES,
  INITIAL_SCORING_CRITERIA,
  INITIAL_JURY_ASSIGNMENTS,
} from '../data/initialJuryData';
import {
  getRegisteredAdminUsers,
  saveRegisteredAdminUsers,
} from '../data/initialUsers';
import { COMPETITIONS } from '../data/initialData';

// Storage keys for local fallback (v7: strictly synchronized with CMS Panitia Cabang Lomba & Supabase Realtime)
export const STORAGE_PROFILES = 'hsn2026_jury_profiles_v4';
const STORAGE_CRITERIA = 'hsn2026_scoring_criteria_v4';
const STORAGE_ASSIGNMENTS = 'hsn2026_jury_assignments_v7';
const STORAGE_SCORES = 'hsn2026_jury_scores_v4';
const STORAGE_RESULTS = 'hsn2026_competition_results_v4';
const STORAGE_AUDIT = 'hsn2026_jury_audit_logs_v4';
export const STORAGE_DELETED_PROFILES = 'hsn2026_deleted_jury_profiles_v1';
export const STORAGE_DELETED_ASSIGNMENTS = 'hsn2026_deleted_jury_assignments_v1';
export const STORAGE_DELETED_CRITERIA = 'hsn2026_deleted_scoring_criteria_v1';

export function getDeletedProfileIds(): string[] {
  return getLocal<string[]>(STORAGE_DELETED_PROFILES, []);
}

export function getDeletedAssignmentIds(): string[] {
  return getLocal<string[]>(STORAGE_DELETED_ASSIGNMENTS, []);
}

export function getDeletedCriteriaIds(): string[] {
  return getLocal<string[]>(STORAGE_DELETED_CRITERIA, []);
}

export const isMockAssignment = (a: any): boolean => {
  if (!a) return false;
  const id = String(a.id || '').toLowerCase();
  const jId = String(a.juryId || a.jury_id || '').toLowerCase();
  const cId = String(a.competitionId || a.competition_id || '').toLowerCase();
  return (
    /^assign-0\d\d$/.test(id) ||
    id.includes('mock') ||
    id.includes('dummy') ||
    jId.includes('mock') ||
    jId.includes('dummy') ||
    cId.includes('mock') ||
    cId.includes('dummy')
  );
};

// Cleanup any old legacy storage keys to eliminate outdated / mismatched competitions and purge dummy scores
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'hsn2026_jury_assignments_list',
      'hsn2026_jury_assignments',
      'hsn2026_jury_assignments_v1',
      'hsn2026_jury_assignments_v2',
      'hsn2026_jury_assignments_v3',
      'hsn2026_jury_assignments_v4',
      'hsn2026_jury_assignments_v5',
      'hsn2026_jury_assignments_v6',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));

    // Bersihkan nilai dummy yang mengacu pada peserta contoh awal
    const rawScores = localStorage.getItem(STORAGE_SCORES);
    if (rawScores) {
      const parsedScores = JSON.parse(rawScores);
      if (Array.isArray(parsedScores)) {
        const cleaned = parsedScores.filter((s) => !isMockScore(s));
        if (cleaned.length !== parsedScores.length) {
          localStorage.setItem(STORAGE_SCORES, JSON.stringify(cleaned));
        }
      }
    }

    // Bersihkan penugasan dummy jika masih tersimpan di local storage
    const rawAssignments = localStorage.getItem(STORAGE_ASSIGNMENTS);
    if (rawAssignments) {
      const parsedAssignments = JSON.parse(rawAssignments);
      if (Array.isArray(parsedAssignments)) {
        const cleaned = parsedAssignments.filter((a) => !isMockAssignment(a));
        if (cleaned.length !== parsedAssignments.length) {
          localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(cleaned));
        }
      }
    }
  } catch {}
}

// ==============================================================================
// 0. COMPETITION ID NORMALIZATION & RESOLVER HELPER
// ==============================================================================
export const COMPETITION_ID_ALIASES: Record<string, string> = {
  'lomba-dolanan-santri': 'comp-1',
  'permainan-tradisional': 'comp-1',
  'lomba-video-santri': 'comp-2',
  'comp-video-kreatif': 'comp-2',
  'video-kreatif': 'comp-2',
  'lomba-poster-santri': 'comp-3',
  'comp-poster-digital': 'comp-3',
  'poster-digital': 'comp-3',
  'santri-cup': 'comp-4',
  'sepak-bola': 'comp-4',
  'lomba-orasi-santri': 'comp-5',
  'orasi-santri': 'comp-5',
  'public-speaking': 'comp-5',
  'podcast-santri': 'comp-6',
  'content-podcast': 'comp-6',
  'women-creativepreneur': 'comp-7',
  'fatayat-umkm': 'comp-7',
  'outbound-muslimat': 'comp-8',
  'inovasi-muslimat': 'comp-8',
  'silat-santri': 'comp-9',
  'pagar-nusa': 'comp-9',
  'media-pembelajaran': 'comp-10',
  'lomba-guru': 'comp-10',
  'baris-berbaris': 'comp-11',
  'pbb-banser': 'comp-11',
  'banser-ansor': 'comp-11',
};

export function normalizeCompId(id?: string): string {
  if (!id) return '';
  const clean = id.trim().toLowerCase();
  return COMPETITION_ID_ALIASES[clean] || id;
}

// Helper generator ID juri (UUID v4 agar kompatibel dengan tipe UUID maupun TEXT di PostgreSQL/Supabase)
export function generateJuryUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUuid(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function getStableUuid(rawId?: string): string {
  if (!rawId) return generateJuryUuid();
  const clean = rawId.trim();
  if (isUuid(clean)) return clean.toLowerCase();
  const storageKey = `hsn_stable_uuid_${clean.toLowerCase()}`;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = localStorage.getItem(storageKey);
      if (existing && isUuid(existing)) return existing.toLowerCase();
    }
  } catch {}

  // Deterministic UUID v4 hash dari string ID
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2d;
  let h3 = 0x5f356495;
  let h4 = 0x12b9b0a1;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch << 1), 0x01000193);
    h3 = Math.imul(h3 ^ (ch << 2), 0x01000193);
    h4 = Math.imul(h4 ^ (ch << 3), 0x01000193);
  }
  const toHex8 = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const p1 = toHex8(h1);
  const p2 = toHex8(h2).substring(0, 4);
  const p3 = '4' + toHex8(h2).substring(5, 8);
  const p4 = ((parseInt(toHex8(h3).substring(0, 2), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + toHex8(h3).substring(2, 4);
  const p5 = toHex8(h4) + toHex8(h3).substring(4, 8);
  const deterministicUuid = `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(storageKey, deterministicUuid);
    }
  } catch {}
  return deterministicUuid;
}

export function resolveCompetition(
  competitionsList: Competition[],
  competitionId?: string,
  competitionTitle?: string
): Competition | undefined {
  if (!competitionsList || competitionsList.length === 0) return undefined;
  if (!competitionId && !competitionTitle) return undefined;
  
  const normId = competitionId ? normalizeCompId(competitionId) : undefined;
  const cleanCompId = competitionId ? competitionId.trim().toLowerCase() : '';

  // 1. Direct ID match
  if (normId) {
    const matched = competitionsList.find((c) => c.id.toLowerCase() === normId.toLowerCase());
    if (matched) return matched;
  }

  // 2. Stable UUID match (jika competition_id di database disimpan dalam format UUID)
  if (cleanCompId) {
    const matchedByUuid = competitionsList.find(
      (c) => getStableUuid(c.id).toLowerCase() === cleanCompId || (c.code && getStableUuid(c.code).toLowerCase() === cleanCompId)
    );
    if (matchedByUuid) return matchedByUuid;
  }

  // 3. Direct code match (misal LMB-SMP-01)
  if (competitionId) {
    const matched = competitionsList.find((c) => c.code?.toLowerCase() === cleanCompId);
    if (matched) return matched;
  }

  // 4. Exact title match
  if (competitionTitle) {
    const cleanTitle = competitionTitle.toLowerCase().trim();
    const matched = competitionsList.find((c) => c.title.toLowerCase().trim() === cleanTitle);
    if (matched) return matched;
  }

  // 5. Fuzzy / Contains title match
  if (competitionTitle) {
    const cleanTitle = competitionTitle.toLowerCase().trim();
    const matched = competitionsList.find((c) => {
      const cTitle = c.title.toLowerCase().trim();
      return cTitle.includes(cleanTitle) || cleanTitle.includes(cTitle);
    });
    if (matched) return matched;
  }

  return undefined;
}

// ==============================================================================
// 1. DATA SANITIZATION & LOCAL STORAGE HELPERS
// ==============================================================================
export const isInitialMockParticipant = (p: any): boolean => {
  if (!p) return false;
  const id = String(p.id || '').toLowerCase();
  const regNo = String(p.registrationNumber || p.registration_number || '').toUpperCase();
  const fullName = String(p.fullName || p.full_name || '').toLowerCase();

  return (
    id.startsWith('reg-00') ||
    regNo.startsWith('HSN-2026-00') ||
    regNo.startsWith('HSN26-SMP-0001') ||
    regNo.startsWith('HSN26-SMA-0002') ||
    regNo.startsWith('HSN26-IPNU-0003') ||
    regNo.startsWith('HSN26-FAT-0004') ||
    regNo.startsWith('HSN26-PAUD-0005') ||
    fullName.includes('ahmad faiz al-hafidz') ||
    fullName.includes('siti nur khadijah') ||
    fullName.includes('rizki bayu pratama') ||
    fullName.includes('umi kalsum') ||
    fullName.includes('muhammad bilal ramadhan') ||
    fullName.includes('ahmad fauzi rabbani') ||
    fullName.includes('siti maryam azzahra') ||
    fullName.includes('m. rizqi maulana')
  );
};

export const isMockScore = (s: JuryScore): boolean => {
  if (!s) return false;
  const pId = String(s.participantId || '').toLowerCase();
  const sId = String(s.id || '').toLowerCase();
  return (
    pId.startsWith('reg-00') ||
    pId.startsWith('hsn-2026-00') ||
    pId.startsWith('hsn26-smp-0001') ||
    pId.startsWith('hsn26-sma-0002') ||
    pId.startsWith('hsn26-ipnu-0003') ||
    pId.startsWith('hsn26-fat-0004') ||
    pId.startsWith('hsn26-paud-0005') ||
    pId.includes('mock') ||
    pId.includes('dummy') ||
    sId.includes('mock') ||
    sId.includes('dummy')
  );
};

/**
 * Helper authoritative untuk memeriksa apakah penugasan (assignment) cocok dengan dewan juri tertentu.
 * Menjamin konsistensi 100% antara CMS PENILAIAN JURI dan PORTAL JURI (/juri).
 * Menghandle pencocokan ID langsung, normalisasi alias (misal juri-001 <-> jury-001), email, username, dan UUID.
 */
export function isAssignmentForJury(
  assignment: JuryAssignment,
  jury: { id?: string; email?: string; username?: string; role?: string } | null
): boolean {
  if (!assignment || !jury) return false;
  if (!assignment.isActive) return false;

  const aJuryId = (assignment.juryId || '').toLowerCase().trim();
  const jId = (jury.id || '').toLowerCase().trim();

  // 1. Direct ID match
  if (aJuryId && jId && aJuryId === jId) return true;

  // 2. Normalized alias e.g. juri-001 vs jury-001
  const normA = aJuryId.replace(/^juri-/, 'jury-');
  const normJ = jId.replace(/^juri-/, 'jury-');
  if (normA && normJ && normA === normJ) return true;

  // 3. Stable UUID match
  if (jId && getStableUuid(jId).toLowerCase() === aJuryId) return true;
  if (aJuryId && getStableUuid(aJuryId).toLowerCase() === jId) return true;

  // 4. Email match (case-insensitive)
  if (jury.email && assignment.juryEmail) {
    if (jury.email.toLowerCase().trim() === assignment.juryEmail.toLowerCase().trim()) return true;
  }

  // 5. Username match
  if (jury.username) {
    const cleanUser = jury.username.toLowerCase().trim();
    if (aJuryId === cleanUser || normA === cleanUser) return true;
  }

  return false;
}

// Client ID unik untuk mengenali pengirim dan mencegah echo-loop broadcast Supabase Realtime
const CLIENT_INSTANCE_ID = `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
let notifyDebounceTimer: any = null;

// Multi-subscriber registry untuk Supabase Realtime channel agar CMS dan Portal tidak saling memutus koneksi
type RealtimeCallback = (tableName: string, payload: any) => void;
const realtimeListeners = new Set<RealtimeCallback>();
let activeRealtimeChannel: any = null;

export function initJuryRealtimeSubscription(onUpdate?: RealtimeCallback): () => void {
  if (onUpdate) {
    realtimeListeners.add(onUpdate);
  }

  const supabase = getSupabaseClient();
  if (!isSupabaseConnected() || !supabase) {
    return () => {
      if (onUpdate) realtimeListeners.delete(onUpdate);
    };
  }

  try {
    if (!activeRealtimeChannel) {
      const channelName = 'jury_realtime_hub';
      const channel = supabase.channel(channelName);

      const handleTableChange = (table: string, payload: any) => {
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('hsn2026_jury_data_updated', {
                detail: { key: table, payload, source: 'supabase_realtime', senderId: payload?.senderId, timestamp: Date.now() },
              })
            );
          } catch {}
        }
        realtimeListeners.forEach((listener) => {
          try {
            listener(table, payload);
          } catch (e) {
            console.warn('Realtime listener error:', e);
          }
        });
      };

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jury_assignments' }, (p) => handleTableChange('jury_assignments', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (p) => handleTableChange('jury_profiles', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_criteria' }, (p) => handleTableChange('scoring_criteria', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jury_scores' }, (p) => handleTableChange('jury_scores', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, (p) => handleTableChange('competition_results', p))
        .on('broadcast', { event: 'jury_updated' }, (p) => {
          // Abaikan broadcast yang dikirim oleh instance tab/window ini sendiri agar tidak looping
          if (p?.payload?.senderId === CLIENT_INSTANCE_ID) {
            return;
          }
          const key = p?.payload?.key || 'all';
          handleTableChange(key, p?.payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Connected to Supabase Realtime
          }
        });

      activeRealtimeChannel = channel;
    }

    return () => {
      if (onUpdate) {
        realtimeListeners.delete(onUpdate);
      }
    };
  } catch (err) {
    console.warn('Error subscribing to jury realtime:', err);
    return () => {
      if (onUpdate) realtimeListeners.delete(onUpdate);
    };
  }
}

export function notifyJuryDataChanged(key?: string, data?: any): void {
  if (notifyDebounceTimer) {
    clearTimeout(notifyDebounceTimer);
  }

  // Debounce notification agar operasi beruntun tidak membanjiri CPU dan network
  notifyDebounceTimer = setTimeout(() => {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('hsn2026_jury_data_updated', {
            detail: { key, data, senderId: CLIENT_INSTANCE_ID, timestamp: Date.now() },
          })
        );
      } catch {}
    }

    // Broadcast ke seluruh tab & perangkat lain via Supabase Realtime
    try {
      if (activeRealtimeChannel) {
        activeRealtimeChannel.send({
          type: 'broadcast',
          event: 'jury_updated',
          payload: { key, senderId: CLIENT_INSTANCE_ID, timestamp: Date.now() },
        });
      }
    } catch {}
  }, 150);
}

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

// setLocal hanya menyimpan ke localStorage tanpa memicu notifikasi event (mencegah loop rekursif)
function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ==============================================================================
// 2. FORMULA PENILAIAN (STANDAR KONSISTEN)
// ==============================================================================
/**
 * Rumus:
 * nilai berbobot = (nilai juri / nilai maksimal) * bobot
 * total nilai = jumlah seluruh nilai berbobot
 */
export function calculateJuryTotal(
  scores: Record<string, number>,
  criteria: ScoringCriterion[]
): number {
  let total = 0;
  for (const crit of criteria) {
    if (!crit.isActive) continue;
    const raw = scores[crit.id] ?? 0;
    const boundedRaw = Math.max(0, Math.min(crit.maxScore, Number(raw) || 0));
    const weighted = (boundedRaw / (crit.maxScore || 100)) * crit.weight;
    total += weighted;
  }
  return Number(total.toFixed(2));
}

/**
 * Validasi apakah jumlah bobot kriteria aktif tepat 100%
 */
export function validateCriteriaWeights(criteria: ScoringCriterion[]): {
  isValid: boolean;
  totalWeight: number;
  message: string;
} {
  const activeCriteria = criteria.filter((c) => c.isActive);
  const totalWeight = activeCriteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
  const rounded = Number(totalWeight.toFixed(2));

  if (Math.abs(rounded - 100) < 0.01) {
    return { isValid: true, totalWeight: rounded, message: 'Total bobot pas 100% (Sempurna)' };
  } else if (rounded < 100) {
    return {
      isValid: false,
      totalWeight: rounded,
      message: `Total bobot saat ini ${rounded}%. Kurang ${(100 - rounded).toFixed(1)}% lagi untuk mencapai 100%.`,
    };
  } else {
    return {
      isValid: false,
      totalWeight: rounded,
      message: `Total bobot ${rounded}%. Melebihi batas 100% sebesar ${(rounded - 100).toFixed(1)}%.`,
    };
  }
}

// ==============================================================================
// 3. AUDIT LOGS SERVICE
// ==============================================================================
export async function createAuditLog(entry: {
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  notes?: string;
}): Promise<void> {
  const logItem: JuryAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...entry,
    createdAt: new Date().toISOString(),
  };

  // Local storage
  const currentLogs = getLocal<JuryAuditLog[]>(STORAGE_AUDIT, []);
  setLocal(STORAGE_AUDIT, [logItem, ...currentLogs.slice(0, 499)]);

  // Supabase if available
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_audit_logs').insert({
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_value: entry.oldValue,
        new_value: entry.newValue,
        notes: entry.notes,
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  }
}

export async function getJuryAuditLogs(): Promise<JuryAuditLog[]> {
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const { data, error } = await supabase
        .from('jury_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          userName: d.notes?.split('oleh: ')[1] || 'Sistem',
          action: d.action,
          entityType: d.entity_type,
          entityId: d.entity_id,
          oldValue: d.old_value,
          newValue: d.new_value,
          notes: d.notes,
          createdAt: d.created_at,
        }));
      }
    } catch {}
  }
  return getLocal<JuryAuditLog[]>(STORAGE_AUDIT, []);
}

// ==============================================================================
// 4. JURY PROFILES SERVICE
// ==============================================================================
export async function getJuryProfiles(): Promise<UserProfile[]> {
  const deletedIds = new Set(getDeletedProfileIds());
  const supabase = getSupabaseClient();
  const connected = isSupabaseConnected() && Boolean(supabase);

  // Baca profil lokal yang ada saat ini terlebih dahulu
  const localList = getLocal<UserProfile[]>(STORAGE_PROFILES, []).filter((p) => !deletedIds.has(p.id));

  // ==============================================================================
  // A. SUPABASE TERHUBUNG: SINKRONISASI DATABASE SUPABASE DENGAN LOKAL
  // ==============================================================================
  if (connected && supabase) {
    try {
      let remoteList: UserProfile[] = [];

      // 1a. Coba ambil dari tabel public.jury_profiles (tabel khusus profil juri)
      let juryProfilesErr: any = null;
      try {
        const { data: jpRows, error: jpErr } = await supabase
          .from('jury_profiles')
          .select('*')
          .order('created_at', { ascending: true });

        juryProfilesErr = jpErr;
        if (!jpErr && jpRows && Array.isArray(jpRows) && jpRows.length > 0) {
          for (const p of jpRows) {
            const email = (p.email || '').trim().toLowerCase();
            const username = (p.username || '').trim().toLowerCase() || (email.includes('@') ? email.split('@')[0] : email) || p.id;
            remoteList.push({
              id: p.id,
              fullName: p.full_name || p.fullName || 'Dewan Juri',
              email: email,
              role: 'jury' as const,
              institution: p.institution || 'MWC NU Poncokusumo',
              phone: p.phone || '',
              isActive: p.is_active !== undefined ? Boolean(p.is_active) : (p.isActive ?? true),
              username: username,
              password: p.password || 'santri2026',
              createdAt: p.created_at || p.createdAt || new Date().toISOString(),
              updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
            });
          }
        }
      } catch {}

      // 1b. Coba ambil dari tabel public.profile_juri atau public.jury_profile jika pengguna menggunakan nama tersebut
      try {
        const { data: pjRows, error: pjErr } = await supabase
          .from('profile_juri')
          .select('*')
          .order('created_at', { ascending: true });

        if (!pjErr && pjRows && Array.isArray(pjRows) && pjRows.length > 0) {
          for (const p of pjRows) {
            const email = (p.email || '').trim().toLowerCase();
            const username = (p.username || '').trim().toLowerCase() || (email.includes('@') ? email.split('@')[0] : email) || p.id;
            const exists = remoteList.some((r) => r.id === p.id || (r.username && r.username === username) || (r.email && r.email === email));
            if (!exists) {
              remoteList.push({
                id: p.id,
                fullName: p.full_name || p.fullName || p.name || 'Dewan Juri',
                email: email,
                role: 'jury' as const,
                institution: p.institution || 'MWC NU Poncokusumo',
                phone: p.phone || '',
                isActive: p.is_active !== undefined ? Boolean(p.is_active) : (p.isActive ?? true),
                username: username,
                password: p.password || 'santri2026',
                createdAt: p.created_at || p.createdAt || new Date().toISOString(),
                updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
              });
            }
          }
        }
      } catch {}

      // 1c. Coba ambil seluruh data dari tabel public.profiles di Supabase
      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!profileErr && profileRows && Array.isArray(profileRows) && profileRows.length > 0) {
        for (const p of profileRows) {
          const email = (p.email || '').trim().toLowerCase();
          const username = (p.username || '').trim().toLowerCase() || (email.includes('@') ? email.split('@')[0] : email) || p.id;
          const password = p.password || 'santri2026';

          const exists = remoteList.some((r) => r.id === p.id || (r.username && r.username === username) || (r.email && r.email === email));
          if (!exists) {
            remoteList.push({
              id: p.id,
              fullName: p.full_name || p.fullName || 'Dewan Juri',
              email: email,
              role: 'jury' as const,
              institution: p.institution || 'MWC NU Poncokusumo',
              phone: p.phone || '',
              isActive: p.is_active !== undefined ? Boolean(p.is_active) : (p.isActive ?? true),
              username: username,
              password: password,
              createdAt: p.created_at || p.createdAt || new Date().toISOString(),
              updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
            });
          }
        }
      }

      // 2. Periksa juga tabel admin_users untuk akun dengan peran dewan juri
      try {
        const { data: allAdminRows, error: aErr } = await supabase
          .from('admin_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!aErr && allAdminRows && allAdminRows.length > 0) {
          const adminRows = allAdminRows.filter((u: any) => {
            const r = String(u.role || '').toLowerCase();
            return r.includes('juri') || r.includes('jury');
          });

          if (adminRows.length > 0) {
            const adminJuries: UserProfile[] = adminRows.map((u: any) => {
              const email = (u.email || '').trim().toLowerCase();
              const username = (u.username || '').trim().toLowerCase() || (email.includes('@') ? email.split('@')[0] : u.id);
              return {
                id: u.id,
                fullName: u.full_name || u.name || u.fullName || 'Dewan Juri',
                email: email,
                role: 'jury' as const,
                institution: u.division || 'MWC NU Poncokusumo',
                phone: u.phone || '',
                isActive: u.is_active !== undefined ? Boolean(u.is_active) : true,
                username: username,
                password: u.password || 'santri2026',
                createdAt: u.created_at || u.createdAt || new Date().toISOString(),
                updatedAt: u.updated_at || u.updatedAt || new Date().toISOString(),
              };
            });

            // Gabungkan akun juri dari admin_users yang belum ada di remoteList
            for (const aj of adminJuries) {
              const ajUser = String(aj.username || '').toLowerCase();
              const ajEmail = String(aj.email || '').toLowerCase();
              const exists = remoteList.some((r) => {
                if (r.id === aj.id) return true;
                const rUser = String(r.username || '').toLowerCase();
                const rEmail = String(r.email || '').toLowerCase();
                return (rUser && ajUser && rUser === ajUser) || (rEmail && ajEmail && rEmail === ajEmail);
              });
              if (!exists) {
                remoteList.push(aj);
              }
            }
          }
        }
      } catch {}

      // 3. JIKA QUERY SUPABASE TIDAK ERROR:
      const hasAnyProfileQuerySucceeded = !profileErr || !juryProfilesErr;
      if (hasAnyProfileQuerySucceeded) {
        // Jika di Supabase remote masih kosong:
        if (remoteList.length === 0) {
          // CEK APAKAH ADA PROFIL DI LOKAL YANG TELAH DIBUAT USER:
          // PENTING: JANGAN MENGHAPUS PROFIL LOKAL JIKA USER BARU SAJA MENAMBAHKANNYA!
          if (localList.length > 0) {
            // Push dan sinkronkan data lokal yang baru dibuat ke Supabase
            for (const lp of localList) {
              const pPayload = {
                id: lp.id,
                full_name: lp.fullName,
                email: lp.email,
                username: lp.username,
                password: lp.password,
                role: 'jury',
                institution: lp.institution,
                phone: lp.phone,
                is_active: lp.isActive,
                updated_at: lp.updatedAt,
              };
              try {
                await supabase.from('jury_profiles').upsert(pPayload, { onConflict: 'id' });
              } catch {}
              try {
                await supabase.from('profiles').upsert(pPayload, { onConflict: 'id' });
              } catch {}
              try {
                await supabase.from('admin_users').upsert([
                  {
                    id: lp.id,
                    full_name: lp.fullName,
                    username: lp.username,
                    email: lp.email,
                    password: lp.password,
                    role: 'Dewan Juri',
                    phone: lp.phone,
                    is_active: lp.isActive,
                    updated_at: lp.updatedAt,
                  },
                ], { onConflict: 'id' });
              } catch {}
            }
            return localList;
          } else {
            // Database Supabase memang bersih/kosong dan belum ada juri lokal
            return [];
          }
        } else {
          // Bersihkan blacklist deletedIds lokal untuk akun yang ada di database Supabase
          const currentDeleted = new Set(getDeletedProfileIds());
          let changedDeleted = false;
          remoteList.forEach((p) => {
            if (currentDeleted.has(p.id)) {
              currentDeleted.delete(p.id);
              changedDeleted = true;
            }
          });
          if (changedDeleted) {
            setLocal(STORAGE_DELETED_PROFILES, Array.from(currentDeleted));
          }

          const validRemote = remoteList.filter((p) => !currentDeleted.has(p.id));

          // Merge dengan akun lokal yang baru saja ditambahkan pengguna agar tidak hilang
          const merged = [...validRemote];
          for (const lp of localList) {
            const lpUser = String(lp.username || '').toLowerCase();
            const lpEmail = String(lp.email || '').toLowerCase();
            const alreadyInMerged = merged.some((m) => {
              if (m.id === lp.id) return true;
              const mUser = String(m.username || '').toLowerCase();
              const mEmail = String(m.email || '').toLowerCase();
              return (mUser && lpUser && mUser === lpUser) || (mEmail && lpEmail && mEmail === lpEmail);
            });
            if (!alreadyInMerged) {
              merged.push(lp);
            }
          }

          setLocal(STORAGE_PROFILES, merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Gagal membaca remote profiles dari Supabase:', err);
    }
  }

  // ==============================================================================
  // B. FALLBACK OFFLINE / SUPABASE BELUM TERHUBUNG:
  // Gunakan data lokal, dan jika belum ada data sama sekali baru gunakan INITIAL_JURY_PROFILES
  // ==============================================================================
  if (localList.length > 0) {
    return localList;
  }

  return INITIAL_JURY_PROFILES.filter((p) => !deletedIds.has(p.id));
}

/**
 * Helper authoritative untuk memastikan profil dewan juri tersimpan di tabel-tabel Supabase
 * (profiles, admin_users, jury_profiles, profile_juri).
 * Menggunakan pendekatan multi-payload adaptif agar tahan terhadap berbagai variasi skema database
 * (kolom hilang, foreign key auth.users, dsb).
 * Mengembalikan ID juri yang benar-benar valid dan tersimpan di database Supabase.
 */
export async function ensureJuryProfileInSupabase(
  supabase: any,
  jury: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
    password?: string;
    role?: string;
    institution?: string;
    phone?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<{ success: boolean; validJuryId: string; errorMsg?: string }> {
  const normEmail = (jury.email || '').toLowerCase().trim();
  const normUser = (jury.username || '').toLowerCase().trim();
  const juryPass = jury.password || 'santri2026';
  const stableUuid = isUuid(jury.id) ? jury.id : getStableUuid(jury.id);
  let resolvedId = stableUuid;
  const now = new Date().toISOString();
  let anyTableSuccess = false;
  let profileSaved = false;
  let lastErrorMsg = '';

  // 1. Cek apakah juri sudah ada di Supabase di tabel profiles, admin_users, atau jury_profiles
  try {
    const [{ data: dbProfiles }, { data: dbAdminUsers }, { data: dbJuryProfiles }] = await Promise.all([
      supabase.from('profiles').select('*').limit(100),
      supabase.from('admin_users').select('*').limit(100),
      supabase.from('jury_profiles').select('*').limit(100),
    ]);

    // Prioritaskan pencocokan langsung pada tabel public.profiles (agar aman dari foreign key jury_assignments)
    const matchedProfileRow = (dbProfiles || []).find((r: any) => {
      const sid = String(r.id || '').toLowerCase();
      if (sid === jury.id.toLowerCase() || sid === stableUuid.toLowerCase()) return true;
      if (normEmail && r.email && String(r.email).toLowerCase().trim() === normEmail) return true;
      if (normUser && r.username && String(r.username).toLowerCase().trim() === normUser) return true;
      if (jury.fullName && (r.full_name || r.name) && String(r.full_name || r.name).toLowerCase().trim() === jury.fullName.toLowerCase().trim()) return true;
      return false;
    });

    if (matchedProfileRow?.id) {
      resolvedId = String(matchedProfileRow.id);
      profileSaved = true;
      anyTableSuccess = true;
    } else {
      const allDbRows = [
        ...(dbAdminUsers || []),
        ...(dbJuryProfiles || []),
      ];

      const matchedRow = allDbRows.find((r: any) => {
        const sid = String(r.id || '').toLowerCase();
        if (sid === jury.id.toLowerCase() || sid === stableUuid.toLowerCase()) return true;
        if (normEmail && r.email && String(r.email).toLowerCase().trim() === normEmail) return true;
        if (normUser && r.username && String(r.username).toLowerCase().trim() === normUser) return true;
        return false;
      });

      if (matchedRow?.id) {
        resolvedId = String(matchedRow.id);
      }
    }
  } catch {}

  // 2. Simpan ke tabel profiles dengan adaptasi kolom berlapis jika belum ada di profiles
  let authAttempted = false;
  const idCandidates = Array.from(new Set([resolvedId, stableUuid, jury.id].filter(Boolean)));

  for (const candidateId of idCandidates) {
    if (profileSaved) break;

    const profileVariants = [
      // Varian 1: Skema lengkap kustom
      {
        id: candidateId,
        full_name: jury.fullName,
        email: jury.email,
        username: jury.username || (normEmail.includes('@') ? normEmail.split('@')[0] : normEmail),
        password: juryPass,
        role: jury.role || 'jury',
        institution: jury.institution || 'MWC NU Poncokusumo',
        phone: jury.phone || '',
        is_active: jury.isActive ?? true,
        updated_at: now,
      },
      // Varian 2: Tanpa password (karena di Supabase standar password tidak ada di profiles)
      {
        id: candidateId,
        full_name: jury.fullName,
        email: jury.email,
        username: jury.username || (normEmail.includes('@') ? normEmail.split('@')[0] : normEmail),
        role: jury.role || 'jury',
        institution: jury.institution || 'MWC NU Poncokusumo',
        phone: jury.phone || '',
        is_active: jury.isActive ?? true,
      },
      // Varian 3: Standar profiles umum (id, full_name, email, role)
      {
        id: candidateId,
        full_name: jury.fullName,
        email: jury.email,
        role: 'jury',
        is_active: true,
      },
      // Varian 4: Standar dengan nama 'name'
      {
        id: candidateId,
        name: jury.fullName,
        email: jury.email,
        role: 'jury',
      },
      // Varian 5: Minimalis (id & email)
      {
        id: candidateId,
        email: jury.email,
      },
      // Varian 6: Minimalis ID saja
      {
        id: candidateId,
      },
    ];

    for (const pv of profileVariants) {
      const { error: pErr } = await supabase.from('profiles').upsert(pv, { onConflict: 'id' });
      if (!pErr) {
        profileSaved = true;
        anyTableSuccess = true;
        resolvedId = candidateId;
        break;
      }

      // Jika error foreign key pada profiles (berarti profiles.id REFERENCES auth.users(id))
      const pErrMsg = (pErr.message || '').toLowerCase();
      if (!authAttempted && (pErrMsg.includes('foreign key') || pErrMsg.includes('violates foreign key'))) {
        authAttempted = true;
        try {
          const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: normEmail,
            password: juryPass,
            options: { data: { full_name: jury.fullName, role: 'jury' } },
          });
          let authId = authData?.user?.id;
          if (!authId && authErr?.message?.toLowerCase().includes('already registered')) {
            const { data: signData } = await supabase.auth.signInWithPassword({
              email: normEmail,
              password: juryPass,
            });
            authId = signData?.user?.id;
          }
          if (authId) {
            resolvedId = authId;
            for (const retryPv of profileVariants) {
              const { error: retryErr } = await supabase
                .from('profiles')
                .upsert({ ...retryPv, id: authId }, { onConflict: 'id' });
              if (!retryErr) {
                profileSaved = true;
                anyTableSuccess = true;
                break;
              }
            }
            if (profileSaved) break;
          }
        } catch {}
      } else {
        lastErrorMsg = pErr.message;
      }
    }
  }

  // 3. Simpan juga ke admin_users
  try {
    const adminVariants = [
      {
        id: resolvedId,
        full_name: jury.fullName,
        username: jury.username || (normEmail.includes('@') ? normEmail.split('@')[0] : normEmail),
        email: jury.email,
        password: juryPass,
        role: 'Dewan Juri',
        phone: jury.phone || '',
        is_active: jury.isActive ?? true,
        updated_at: now,
      },
      {
        id: resolvedId,
        name: jury.fullName,
        username: jury.username || (normEmail.includes('@') ? normEmail.split('@')[0] : normEmail),
        email: jury.email,
        password: juryPass,
        role: 'Dewan Juri',
      },
      {
        id: resolvedId,
        email: jury.email,
        password: juryPass,
      },
      {
        id: resolvedId,
        email: jury.email,
      },
    ];
    for (const av of adminVariants) {
      const { error: aErr } = await supabase.from('admin_users').upsert([av], { onConflict: 'id' });
      if (!aErr) {
        anyTableSuccess = true;
        break;
      }
    }
  } catch {}

  // 4. Simpan juga ke jury_profiles & profile_juri
  try {
    const jpVariants = [
      {
        id: resolvedId,
        full_name: jury.fullName,
        email: jury.email,
        username: jury.username || (normEmail.includes('@') ? normEmail.split('@')[0] : normEmail),
        password: juryPass,
        role: jury.role || 'jury',
        institution: jury.institution || 'MWC NU Poncokusumo',
        phone: jury.phone || '',
        is_active: jury.isActive ?? true,
        updated_at: now,
      },
      {
        id: resolvedId,
        full_name: jury.fullName,
        email: jury.email,
        role: 'jury',
      },
      {
        id: resolvedId,
        email: jury.email,
      },
    ];
    for (const jpv of jpVariants) {
      const { error: jpErr } = await supabase.from('jury_profiles').upsert(jpv, { onConflict: 'id' });
      if (!jpErr) {
        anyTableSuccess = true;
        break;
      }
    }
    for (const jpv of jpVariants) {
      const { error: pjErr } = await supabase.from('profile_juri').upsert(jpv, { onConflict: 'id' });
      if (!pjErr) {
        anyTableSuccess = true;
        break;
      }
    }
  } catch {}

  return { success: anyTableSuccess, validJuryId: resolvedId, errorMsg: lastErrorMsg };
}

export async function saveJuryProfile(
  profile: Partial<UserProfile> & { fullName: string; email?: string },
  adminName: string = 'Admin'
): Promise<{ success: boolean; data?: UserProfile; message?: string; supabaseSynced?: boolean; supabaseError?: string }> {
  // Gunakan ID yang ada atau generate UUID v4 baru (kompatibel penuh dengan tipe UUID di Supabase)
  const id = profile.id || generateJuryUuid();
  const now = new Date().toISOString();

  // Hapus dari blacklist terhapus jika sebelumnya pernah ditandai
  const deletedSet = new Set(getDeletedProfileIds());
  if (deletedSet.has(id)) {
    deletedSet.delete(id);
    setLocal(STORAGE_DELETED_PROFILES, Array.from(deletedSet));
  }

  const rawName = (profile.fullName || '').trim();
  const cleanUsername =
    (profile.username || '').trim().toLowerCase() ||
    (profile.email && profile.email.includes('@') ? profile.email.split('@')[0].trim().toLowerCase() : '') ||
    rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) ||
    `juri_${Date.now().toString().slice(-4)}`;
  const cleanEmail =
    (profile.email || '').trim().toLowerCase() || `${cleanUsername}@hsnponcokusumo.nu`;
  const cleanPassword = (profile.password || '').trim() || 'santri2026';

  const finalProfile: UserProfile = {
    id,
    fullName: rawName || 'Dewan Juri HSN 2026',
    email: cleanEmail,
    role: 'jury',
    institution: profile.institution?.trim() || 'MWC NU Poncokusumo',
    phone: profile.phone?.trim() || '',
    isActive: profile.isActive ?? true,
    username: cleanUsername,
    password: cleanPassword,
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };

  // 1. Local storage update untuk profil juri
  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, []);
  const existsIdx = list.findIndex(
    (p) =>
      p.id === id ||
      (p.email && finalProfile.email && String(p.email).toLowerCase() === String(finalProfile.email).toLowerCase()) ||
      (p.username && finalProfile.username && String(p.username).toLowerCase() === String(finalProfile.username).toLowerCase())
  );
  let updatedList: UserProfile[];
  if (existsIdx >= 0) {
    const old = list[existsIdx];
    updatedList = list.map((p, idx) => (idx === existsIdx ? finalProfile : p));
    createAuditLog({
      action: 'UPDATE_JURY_PROFILE',
      entityType: 'jury_profile',
      entityId: id,
      oldValue: old,
      newValue: finalProfile,
      notes: `Profil juri ${finalProfile.fullName} diperbarui oleh: ${adminName}`,
    });
  } else {
    updatedList = [...list, finalProfile];
    createAuditLog({
      action: 'CREATE_JURY_PROFILE',
      entityType: 'jury_profile',
      entityId: id,
      newValue: finalProfile,
      notes: `Juri baru ${finalProfile.fullName} ditambahkan oleh: ${adminName}`,
    });
  }
  setLocal(STORAGE_PROFILES, updatedList);

  // 2. Sinkronkan juga ke daftar akun panitia lokal (getRegisteredAdminUsers / saveRegisteredAdminUsers)
  // agar tampil juga di tab CMS PANITIA (Kelola Panitia / Users)
  try {
    const adminUsers = getRegisteredAdminUsers();
    const existingAdminIdx = adminUsers.findIndex(
      (u) =>
        u.id === finalProfile.id ||
        (u.username && finalProfile.username && String(u.username).toLowerCase() === String(finalProfile.username).toLowerCase()) ||
        (u.email && finalProfile.email && String(u.email).toLowerCase() === String(finalProfile.email).toLowerCase())
    );
    const adminUserEntry: AdminUser = {
      id: finalProfile.id,
      fullName: finalProfile.fullName,
      username: finalProfile.username,
      password: finalProfile.password,
      role: 'Dewan Juri',
      email: finalProfile.email,
      phone: finalProfile.phone || '',
      createdAt: finalProfile.createdAt,
      isActive: finalProfile.isActive,
    };
    if (existingAdminIdx >= 0) {
      adminUsers[existingAdminIdx] = { ...adminUsers[existingAdminIdx], ...adminUserEntry };
    } else {
      adminUsers.unshift(adminUserEntry);
    }
    saveRegisteredAdminUsers(adminUsers);
  } catch (err) {
    console.warn('Sync to registered admin users note:', err);
  }

  // 3. Supabase update (Simpan ke tabel admin_users & profiles via helper adaptif)
  let supabaseSynced = false;
  let supabaseErrorMsg: string | undefined = undefined;

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const ensRes = await ensureJuryProfileInSupabase(supabase, finalProfile);
      supabaseSynced = ensRes.success;
      if (!ensRes.success) {
        supabaseErrorMsg = ensRes.errorMsg || 'Tabel profil di Supabase belum siap';
      }
    } catch (err: any) {
      supabaseErrorMsg = err?.message;
      console.warn('Supabase upsert profiles exception:', err);
    }
  }

  notifyJuryDataChanged('jury_profiles', updatedList);
  return {
    success: true,
    data: finalProfile,
    supabaseSynced: isSupabaseConnected() ? supabaseSynced : undefined,
    supabaseError: supabaseSynced ? undefined : supabaseErrorMsg,
  };
}

export async function toggleJuryStatus(
  juryId: string,
  isActive: boolean,
  adminName: string = 'Admin'
): Promise<boolean> {
  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, []);
  const updated = list.map((p) => (p.id === juryId ? { ...p, isActive, updatedAt: new Date().toISOString() } : p));
  setLocal(STORAGE_PROFILES, updated);

  createAuditLog({
    action: isActive ? 'ACTIVATE_JURY' : 'DEACTIVATE_JURY',
    entityType: 'jury_profile',
    entityId: juryId,
    notes: `Status akun juri diubah menjadi ${isActive ? 'Aktif' : 'Non-aktif'} oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    const stableId = getStableUuid(juryId);
    try {
      await supabase.from('jury_profiles').update({ is_active: isActive }).eq('id', juryId);
      if (stableId !== juryId) await supabase.from('jury_profiles').update({ is_active: isActive }).eq('id', stableId);
    } catch {}
    try {
      await supabase.from('profile_juri').update({ is_active: isActive }).eq('id', juryId);
      if (stableId !== juryId) await supabase.from('profile_juri').update({ is_active: isActive }).eq('id', stableId);
    } catch {}
    try {
      await supabase.from('profiles').update({ is_active: isActive }).eq('id', juryId);
      if (stableId !== juryId) await supabase.from('profiles').update({ is_active: isActive }).eq('id', stableId);
    } catch {}
    try {
      await supabase.from('admin_users').update({ is_active: isActive }).eq('id', juryId);
      if (stableId !== juryId) await supabase.from('admin_users').update({ is_active: isActive }).eq('id', stableId);
    } catch {}
  }
  notifyJuryDataChanged('jury_profiles', updated);
  return true;
}

export async function deleteJuryProfile(
  juryId: string,
  adminName: string = 'Admin'
): Promise<boolean> {
  const deletedProfiles = new Set(getDeletedProfileIds());
  deletedProfiles.add(juryId);
  setLocal(STORAGE_DELETED_PROFILES, Array.from(deletedProfiles));

  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, []);
  const target = list.find((p) => p.id === juryId);
  const updated = list.filter((p) => p.id !== juryId);
  setLocal(STORAGE_PROFILES, updated);

  // Bersihkan seluruh penugasan juri ini dari penyimpanan lokal
  const assignments = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const removedAssignments = assignments.filter((a) => a.juryId === juryId);
  const updatedAssignments = assignments.filter((a) => a.juryId !== juryId);
  setLocal(STORAGE_ASSIGNMENTS, updatedAssignments);

  const deletedAssignments = new Set(getDeletedAssignmentIds());
  removedAssignments.forEach((a) => deletedAssignments.add(a.id));
  setLocal(STORAGE_DELETED_ASSIGNMENTS, Array.from(deletedAssignments));

  if (target) {
    createAuditLog({
      action: 'DELETE_JURY_PROFILE',
      entityType: 'jury_profile',
      entityId: juryId,
      oldValue: target,
      notes: `Akun dewan juri ${target.fullName} (${target.email}) dihapus permanen oleh: ${adminName}`,
    });
  }

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    const stableId = getStableUuid(juryId);
    try {
      await supabase.from('jury_assignments').delete().eq('jury_id', juryId);
      if (stableId !== juryId) await supabase.from('jury_assignments').delete().eq('jury_id', stableId);
    } catch {}
    try {
      await supabase.from('jury_profiles').delete().eq('id', juryId);
      if (stableId !== juryId) await supabase.from('jury_profiles').delete().eq('id', stableId);
    } catch {}
    try {
      await supabase.from('profile_juri').delete().eq('id', juryId);
      if (stableId !== juryId) await supabase.from('profile_juri').delete().eq('id', stableId);
    } catch {}
    try {
      await supabase.from('profiles').delete().eq('id', juryId);
      if (stableId !== juryId) await supabase.from('profiles').delete().eq('id', stableId);
    } catch {}
    try {
      await supabase.from('admin_users').delete().eq('id', juryId);
      if (stableId !== juryId) await supabase.from('admin_users').delete().eq('id', stableId);
    } catch {}
  }

  notifyJuryDataChanged('jury_profiles', updated);
  notifyJuryDataChanged('jury_assignments', updatedAssignments);
  return true;
}

export function getAvailableCompetitions(): Competition[] {
  try {
    const raw = typeof window !== 'undefined'
      ? (localStorage.getItem('hsn2026_custom_competitions_v1') || localStorage.getItem('hsn2026_custom_competitions'))
      : null;
    const custom = raw ? JSON.parse(raw) : [];
    const combined = [...custom, ...COMPETITIONS.filter((c) => !custom.some((cust: any) => cust.id === c.id))];
    const rawDeleted = typeof window !== 'undefined'
      ? (localStorage.getItem('hsn2026_deleted_competitions_v1') || localStorage.getItem('hsn2026_deleted_competitions'))
      : null;
    const deleted = rawDeleted ? JSON.parse(rawDeleted) : [];
    return combined.filter((c) => !deleted.includes(c.id));
  } catch {
    return COMPETITIONS;
  }
}

// ==============================================================================
// 5. JURY ASSIGNMENTS SERVICE
// ==============================================================================
export async function getJuryAssignments(
  customCompetitions?: Competition[],
  knownJuries?: UserProfile[]
): Promise<JuryAssignment[]> {
  let rawList: JuryAssignment[] = [];
  let fetchedFromRemote = false;
  const supabase = getSupabaseClient();

  if (isSupabaseConnected() && supabase) {
    try {
      let data: any[] | null = null;
      let error: any = null;

      // 1. Coba query lengkap dengan relasi profiles dan competitions jika tersedia
      try {
        const res = await supabase
          .from('jury_assignments')
          .select(`
            id,
            jury_id,
            competition_id,
            assigned_by,
            is_active,
            created_at,
            profiles:jury_id (full_name, email, institution),
            competitions:competition_id (title, category)
          `)
          .eq('is_active', true);
        if (!res.error && res.data) {
          data = res.data;
        } else {
          error = res.error;
        }
      } catch (e) {
        error = e;
      }

      // 2. Jika join error (foreign key belum terbentuk di Supabase), fallback ke query langsung tanpa join
      if (error || !data) {
        const plainRes = await supabase
          .from('jury_assignments')
          .select('*')
          .eq('is_active', true);
        if (!plainRes.error && plainRes.data) {
          data = plainRes.data;
          error = null;
        }
      }

      if (!error && data !== null) {
        fetchedFromRemote = true;
        rawList = data.map((d: any) => ({
          id: d.id,
          juryId: d.jury_id || d.juryId,
          competitionId: normalizeCompId(d.competition_id || d.competitionId),
          assignedBy: d.assigned_by || d.assignedBy || 'Admin CMS',
          isActive: d.is_active !== undefined ? d.is_active : (d.isActive ?? true),
          createdAt: d.created_at || d.createdAt,
          juryName: d.jury_name || d.juryName || d.profiles?.full_name,
          juryEmail: d.jury_email || d.juryEmail || d.profiles?.email,
          juryInstitution: d.jury_institution || d.juryInstitution || d.profiles?.institution,
          competitionTitle: d.competition_title || d.competitionTitle || d.competitions?.title,
          competitionCategory: d.competition_category || d.competitionCategory || d.competitions?.category,
        }));
      }
    } catch (err) {
      console.warn('Gagal membaca penugasan dari Supabase:', err);
    }
  }

  // Ambil data lokal terlebih dahulu untuk sinkronisasi hybrid
  const localAssignments = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);

  // Jika remote Supabase aktif dan berhasil di-fetch:
  // Gabungkan remote Supabase dan data lokal (hindari terhapusnya penugasan yang baru ditambahkan admin!)
  if (fetchedFromRemote) {
    const mergedMap = new Map<string, JuryAssignment>();
    // 1. Masukkan data remote dari Supabase
    for (const r of rawList) {
      if (r && r.isActive) {
        const key = `${r.juryId}:${r.competitionId}`;
        mergedMap.set(key, r);
      }
    }
    // 2. Pertahankan data lokal yang aktif dan belum disinkronkan ke remote
    for (const l of localAssignments) {
      if (l && l.isActive) {
        const key = `${l.juryId}:${l.competitionId}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, l);
        }
      }
    }
    rawList = Array.from(mergedMap.values());
  } else {
    // Fallback offline / Supabase belum terkoneksi: gunakan local storage
    rawList = localAssignments;
    if (!rawList || rawList.length === 0) {
      return [];
    }
  }

  // Bersihkan penugasan mock/dummy
  rawList = rawList.filter((a) => !isMockAssignment(a));
  if (rawList.length === 0) {
    setLocal(STORAGE_ASSIGNMENTS, []);
    return [];
  }

  // Filter out any explicitly deleted assignments and profiles
  const deletedAssignIds = new Set(getDeletedAssignmentIds());
  const deletedJuryIds = new Set(getDeletedProfileIds());
  rawList = rawList.filter((a) => !deletedAssignIds.has(a.id) && !deletedJuryIds.has(a.juryId));
  if (rawList.length === 0) {
    setLocal(STORAGE_ASSIGNMENTS, []);
    return [];
  }

  // Active competitions authoritative list from CMS Panitia
  const allComps = customCompetitions && customCompetitions.length > 0 ? customCompetitions : getAvailableCompetitions();
  const validCompMap = new Map(allComps.map((c) => [c.id, c]));
  const localJuries = getLocal<UserProfile[]>(STORAGE_PROFILES, []);
  const juries = (knownJuries && knownJuries.length > 0)
    ? knownJuries
    : (localJuries.length > 0 ? localJuries : await getJuryProfiles());

  // Self-heal and strictly sanitize assignments: ONLY keep assignments that belong to valid competitions AND registered active juries!
  let normalizedList: JuryAssignment[] = rawList
    .map((a) => {
      if (!a || !a.isActive) return null;

      // 1. Direct ID match first
      let comp = validCompMap.get(a.competitionId);
      // 2. Alias match if not found
      if (!comp && a.competitionId) {
        const aliasId = COMPETITION_ID_ALIASES[a.competitionId.toLowerCase()];
        if (aliasId) comp = validCompMap.get(aliasId);
      }
      // 3. Fallback resolve
      if (!comp) {
        comp = resolveCompetition(allComps, a.competitionId, a.competitionTitle);
      }
      // If competition does not exist in CMS Panitia, drop this assignment!
      if (!comp) return null;

      // 4. Must match a registered active dewan juri (NO orphan / ghost / unassigned records allowed!)
      let jury = juries.find((j) => (isAssignmentForJury(a, j) || j.id === a.juryId || (a.juryEmail && j.email?.toLowerCase() === a.juryEmail.toLowerCase())) && j.isActive);
      
      const juryIdToUse = jury?.id || a.juryId;
      const juryNameToUse = jury?.fullName || a.juryName || 'Dewan Juri';
      const juryEmailToUse = jury?.email || a.juryEmail || '';
      const juryInstToUse = jury?.institution || a.juryInstitution || 'MWC NU Poncokusumo';

      return {
        id: a.id || `assign-${juryIdToUse}-${comp.id}`,
        juryId: juryIdToUse,
        competitionId: comp.id,
        competitionTitle: comp.title,
        competitionCategory: comp.category,
        juryName: juryNameToUse,
        juryEmail: juryEmailToUse,
        juryInstitution: juryInstToUse,
        assignedBy: a.assignedBy || 'Admin CMS',
        isActive: true,
        createdAt: a.createdAt || new Date().toISOString(),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null) as JuryAssignment[];

  // Strictly deduplicate assignments by juryId + competitionId to avoid ghost duplicates
  const uniqueAssignMap = new Map<string, JuryAssignment>();
  for (const a of normalizedList) {
    const key = `${a.juryId}:${a.competitionId}`;
    if (!uniqueAssignMap.has(key)) {
      uniqueAssignMap.set(key, a);
    }
  }
  normalizedList = Array.from(uniqueAssignMap.values());

  // Re-save sanitized and synchronized assignments to local storage
  setLocal(STORAGE_ASSIGNMENTS, normalizedList);

  return normalizedList;
}

export function syncJuryAssignmentsOnCompetitionUpdate(updatedComp: Competition): void {
  try {
    const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
    const updated = current.map((a) => {
      if (
        a.competitionId === updatedComp.id ||
        resolveCompetition([updatedComp], a.competitionId, a.competitionTitle)?.id === updatedComp.id
      ) {
        return {
          ...a,
          competitionId: updatedComp.id,
          competitionTitle: updatedComp.title,
          competitionCategory: updatedComp.category,
        };
      }
      return a;
    });
    setLocal(STORAGE_ASSIGNMENTS, updated);
  } catch {}
}

export function syncJuryAssignmentsOnCompetitionDelete(deletedCompId: string): void {
  try {
    const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
    const updated = current.filter((a) => a.competitionId !== deletedCompId);
    setLocal(STORAGE_ASSIGNMENTS, updated);

    const supabase = getSupabaseClient();
    if (isSupabaseConnected() && supabase) {
      Promise.resolve(supabase.from('jury_assignments').delete().eq('competition_id', deletedCompId)).catch(() => {});
    }
  } catch {}
}

export async function assignJuryToCompetition(
  juryId: string,
  competitionId: string,
  adminName: string = 'Admin',
  competitionTitle?: string,
  competitionCategory?: string,
  customCompetitions?: Competition[]
): Promise<{ success: boolean; message?: string; supabaseSynced?: boolean; supabaseError?: string }> {
  const allComps = customCompetitions && customCompetitions.length > 0 ? customCompetitions : getAvailableCompetitions();
  const targetComp = allComps.find((c) => c.id === competitionId) || resolveCompetition(allComps, competitionId, competitionTitle);
  if (!targetComp) {
    return { success: false, message: 'Cabang lomba tidak ditemukan di CMS Panitia.' };
  }
  const effectiveCompId = targetComp.id;
  const effectiveCompTitle = targetComp.title;
  const effectiveCompCat = targetComp.category;

  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, INITIAL_JURY_ASSIGNMENTS)
    .filter((a) => allComps.some((c) => c.id === a.competitionId));

  const juries = await getJuryProfiles();
  const matchedJury = juries.find((j) => (isAssignmentForJury({ juryId } as any, j) || j.id === juryId || j.email.toLowerCase() === juryId.toLowerCase()) && j.isActive);
  if (!matchedJury) {
    return { success: false, message: 'Dewan juri tidak ditemukan atau tidak aktif di CMS.' };
  }
  const canonicalJuryId = matchedJury.id;

  const exists = current.some((a) => {
    if (!a.isActive) return false;
    const sameComp = a.competitionId === effectiveCompId || normalizeCompId(a.competitionId) === normalizeCompId(effectiveCompId);
    if (!sameComp) return false;
    return isAssignmentForJury(a, matchedJury);
  });

  if (exists) {
    return { success: false, message: 'Juri ini telah ditugaskan pada cabang lomba tersebut.' };
  }

  const assignmentId = `assign-${canonicalJuryId}-${effectiveCompId}`;

  // Pastikan ID penugasan ini dihapus dari daftar blacklist penugasan yang pernah dihapus
  const deletedAssigns = new Set(getDeletedAssignmentIds());
  if (deletedAssigns.has(assignmentId)) {
    deletedAssigns.delete(assignmentId);
  }
  // Hapus juga variasi ID yang merujuk juri dan lomba yang sama dari blacklist
  const cleanedDeletedList = Array.from(deletedAssigns).filter(
    (id) => !(id.includes(canonicalJuryId) && id.includes(effectiveCompId))
  );
  setLocal(STORAGE_DELETED_ASSIGNMENTS, cleanedDeletedList);

  const newAssignment: JuryAssignment = {
    id: assignmentId,
    juryId: canonicalJuryId,
    competitionId: effectiveCompId,
    isActive: true,
    juryName: matchedJury.fullName,
    juryEmail: matchedJury.email,
    juryInstitution: matchedJury.institution,
    competitionTitle: effectiveCompTitle,
    competitionCategory: effectiveCompCat,
    assignedBy: adminName,
    createdAt: new Date().toISOString(),
  };

  const updated = [
    ...current.filter((a) => !(isAssignmentForJury(a, matchedJury) && a.competitionId === effectiveCompId)),
    newAssignment,
  ];
  setLocal(STORAGE_ASSIGNMENTS, updated);

  createAuditLog({
    action: 'ASSIGN_JURY',
    entityType: 'jury_assignment',
    entityId: newAssignment.id,
    newValue: newAssignment,
    notes: `Juri ${matchedJury.fullName} ditugaskan pada lomba ${effectiveCompTitle} oleh: ${adminName}`,
  });

  let supabaseSynced = false;
  let supabaseErrorMsg: string | undefined = undefined;

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const stableJuryUuid = getStableUuid(canonicalJuryId);
      const stableAssignUuid = isUuid(assignmentId) ? assignmentId : getStableUuid(assignmentId);
      const stableCompUuid = getStableUuid(effectiveCompId);

      // Cari ID kompetisi nyata di Supabase (menghindari error "invalid input syntax for type uuid" saat relasi/filter)
      let remoteCompId: string | undefined = undefined;
      try {
        const { data: dbComps } = await supabase.from('competitions').select('id, code, title');
        if (dbComps && dbComps.length > 0) {
          const matched = dbComps.find((rc: any) => {
            const sid = String(rc.id);
            if (sid === effectiveCompId) return true;
            if (isUuid(effectiveCompId) && sid.toLowerCase() === effectiveCompId.toLowerCase()) return true;
            if (sid === stableCompUuid) return true;
            if (rc.code && (String(rc.code).toLowerCase() === effectiveCompId.toLowerCase() || (targetComp.code && String(rc.code).toLowerCase() === targetComp.code.toLowerCase()))) return true;
            if (rc.title && (String(rc.title).toLowerCase() === effectiveCompTitle.toLowerCase() || String(rc.title).toLowerCase() === effectiveCompId.toLowerCase())) return true;
            if (normalizeCompId(sid).toLowerCase() === normalizeCompId(effectiveCompId).toLowerCase()) return true;
            return false;
          });
          if (matched?.id) {
            remoteCompId = String(matched.id);
          }
        }
      } catch {}

      if (!remoteCompId) {
        remoteCompId = isUuid(effectiveCompId) ? effectiveCompId : stableCompUuid;
      }

      // 1. Pastikan kompetisi ada di tabel competitions Supabase (mencegah foreign key violation)
      try {
        const compPayload = {
          id: remoteCompId,
          code: targetComp.code || effectiveCompId,
          title: effectiveCompTitle,
          category: effectiveCompCat,
          short_desc: (targetComp as any).shortDesc || (targetComp as any).description || effectiveCompTitle,
          full_desc: (targetComp as any).fullDesc || (targetComp as any).description || targetComp.title,
          is_active: true,
        };
        await supabase.from('competitions').upsert(compPayload, { onConflict: 'id' });
        if (remoteCompId !== effectiveCompId && !isUuid(effectiveCompId)) {
          try {
            await supabase.from('competitions').upsert({ ...compPayload, id: effectiveCompId }, { onConflict: 'id' });
          } catch {}
        }
      } catch {}

      // 2. Pastikan profil juri ada di Supabase via helper adaptif
      const ensJury = await ensureJuryProfileInSupabase(supabase, matchedJury);
      const remoteJuryId = ensJury.validJuryId;

      // 3. Periksa apakah baris penugasan sudah ada di Supabase menggunakan UUID yang valid
      let existingRemoteAssignmentId: string | undefined = undefined;
      const safeJuryUuid = isUuid(remoteJuryId) ? remoteJuryId : stableJuryUuid;
      const safeCompUuid = isUuid(remoteCompId) ? remoteCompId : stableCompUuid;

      try {
        const { data, error } = await supabase
          .from('jury_assignments')
          .select('id')
          .eq('jury_id', safeJuryUuid)
          .eq('competition_id', safeCompUuid)
          .limit(1);
        if (!error && data && data.length > 0 && data[0]?.id) {
          existingRemoteAssignmentId = String(data[0].id);
        }
      } catch {}

      // Jika belum ditemukan dan teks ID berbeda
      if (!existingRemoteAssignmentId && (!isUuid(canonicalJuryId) || !isUuid(effectiveCompId))) {
        try {
          const { data: txtData, error: txtErr } = await supabase
            .from('jury_assignments')
            .select('id')
            .eq('jury_id', canonicalJuryId)
            .eq('competition_id', effectiveCompId)
            .limit(1);
          if (!txtErr && txtData && txtData.length > 0 && txtData[0]?.id) {
            existingRemoteAssignmentId = String(txtData[0].id);
          }
        } catch {}
      }

      // 4. Jika baris sudah ada di Supabase: UPDATE baris tersebut (TANPA mengubah kolom id)
      if (existingRemoteAssignmentId) {
        const updatePayloads = [
          {
            competition_title: effectiveCompTitle,
            competition_category: effectiveCompCat,
            assigned_by: adminName,
            is_active: true,
            jury_name: matchedJury.fullName,
            jury_email: matchedJury.email,
            jury_institution: matchedJury.institution || '',
          },
          {
            is_active: true,
            assigned_by: adminName,
          },
          {
            is_active: true,
          },
        ];

        for (const up of updatePayloads) {
          const { error: updErr } = await supabase
            .from('jury_assignments')
            .update(up)
            .eq('id', existingRemoteAssignmentId);
          if (!updErr) {
            supabaseSynced = true;
            break;
          } else {
            const upMsg = (updErr.message || '').toLowerCase();
            if (!upMsg.includes('uuid')) {
              supabaseErrorMsg = updErr.message;
            }
          }
        }
      }

      // 5. Jika belum ada atau update di atas belum berhasil, lakukan INSERT multi-skema
      if (!supabaseSynced) {
        const candidatePairs = [
          // 1. All-UUID (Paling aman untuk standar Supabase/PostgreSQL dengan tipe UUID)
          { id: stableAssignUuid, juryId: safeJuryUuid, compId: safeCompUuid },
          // 2. Auto ID (tanpa id eksplisit, UUID columns)
          { id: undefined, juryId: safeJuryUuid, compId: safeCompUuid },
          // 3. Text schema (hanya jika kolom bertipe TEXT)
          ...((!isUuid(canonicalJuryId) || !isUuid(effectiveCompId)) ? [
            { id: assignmentId, juryId: canonicalJuryId, compId: effectiveCompId },
            { id: stableAssignUuid, juryId: canonicalJuryId, compId: effectiveCompId },
          ] : [])
        ];

        for (const pair of candidatePairs) {
          if (supabaseSynced) break;

          const basePayload: any = {
            jury_id: pair.juryId,
            competition_id: pair.compId,
            assigned_by: adminName,
            is_active: true,
            created_at: newAssignment.createdAt,
          };
          if (pair.id) basePayload.id = pair.id;

          const fullPayload = {
            ...basePayload,
            competition_title: effectiveCompTitle,
            competition_category: effectiveCompCat,
            jury_name: matchedJury.fullName,
            jury_email: matchedJury.email,
            jury_institution: matchedJury.institution || '',
          };

          const variants = [fullPayload, basePayload, { jury_id: pair.juryId, competition_id: pair.compId, is_active: true, ...(pair.id ? { id: pair.id } : {}) }];

          for (const variant of variants) {
            if (supabaseSynced) break;

            // 1. Coba INSERT
            const { error: insErr } = await supabase.from('jury_assignments').insert(variant as any);
            if (!insErr) {
              supabaseSynced = true;
              break;
            }

            const em = (insErr.message || '').toLowerCase();
            // Jika duplicate / unique constraint violation, update baris yang sudah ada
            if (em.includes('unique') || em.includes('duplicate')) {
              const { error: updErr } = await supabase
                .from('jury_assignments')
                .update({ is_active: true, assigned_by: adminName })
                .eq('jury_id', pair.juryId)
                .eq('competition_id', pair.compId);
              if (!updErr) {
                supabaseSynced = true;
                break;
              }
            }

            // Jika ada ID, coba UPSERT onConflict 'id'
            if (variant.id) {
              const { error: upsErr } = await supabase
                .from('jury_assignments')
                .upsert(variant as any, { onConflict: 'id' });
              if (!upsErr) {
                supabaseSynced = true;
                break;
              }
            }

            // Coba UPSERT onConflict 'jury_id,competition_id'
            const { error: upsJcErr } = await supabase
              .from('jury_assignments')
              .upsert(variant as any, { onConflict: 'jury_id,competition_id' });
            if (!upsJcErr) {
              supabaseSynced = true;
              break;
            }

            const jcEm = (upsJcErr.message || '').toLowerCase();
            if (!em.includes('uuid') && !jcEm.includes('uuid')) {
              supabaseErrorMsg = insErr.message || upsJcErr.message;
            }
          }
        }
      }
    } catch (err: any) {
      const errMsg = (err?.message || '').toLowerCase();
      if (!errMsg.includes('uuid')) {
        supabaseErrorMsg = err?.message;
      }
      console.warn('Gagal menyimpan penugasan ke Supabase:', err);
    }
  }

  // Bersihkan error message jika memuat 'uuid' agar pengguna tidak melihat pesan teknis
  if (supabaseErrorMsg && supabaseErrorMsg.toLowerCase().includes('uuid')) {
    supabaseErrorMsg = 'Penyesuaian format ID di database Supabase sedang berlangsung. Pastikan tabel jury_assignments siap.';
  }

  notifyJuryDataChanged('jury_assignments', updated);
  return {
    success: true,
    supabaseSynced: isSupabaseConnected() ? supabaseSynced : undefined,
    supabaseError: supabaseSynced ? undefined : supabaseErrorMsg,
  };
}

export async function removeJuryAssignment(
  assignmentId: string,
  adminName: string = 'Admin',
  reason?: string
): Promise<boolean> {
  const deletedAssignments = new Set(getDeletedAssignmentIds());
  deletedAssignments.add(assignmentId);
  setLocal(STORAGE_DELETED_ASSIGNMENTS, Array.from(deletedAssignments));

  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const target = current.find((a) => a.id === assignmentId);
  const updated = current.filter((a) => a.id !== assignmentId);
  setLocal(STORAGE_ASSIGNMENTS, updated);

  if (target) {
    createAuditLog({
      action: 'REMOVE_JURY_ASSIGNMENT',
      entityType: 'jury_assignment',
      entityId: assignmentId,
      oldValue: target,
      notes: `Penugasan juri ${target.juryName || target.juryId} pada lomba ${target.competitionTitle || target.competitionId} dibatalkan oleh: ${adminName}. Alasan: ${reason || 'Perubahan susunan dewan juri'}`,
    });
  }

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const stableAssignUuid = getStableUuid(assignmentId);
      if (isUuid(assignmentId)) {
        await supabase.from('jury_assignments').delete().eq('id', assignmentId);
      }
      await supabase.from('jury_assignments').delete().eq('id', stableAssignUuid);
      if (!isUuid(assignmentId)) {
        try { await supabase.from('jury_assignments').delete().eq('id', assignmentId); } catch {}
      }

      // Hapus juga berdasarkan pasangan jury_id dan competition_id
      if (target?.juryId && target?.competitionId) {
        const stableJId = getStableUuid(target.juryId);
        const stableCId = getStableUuid(target.competitionId);
        // Hapus dengan UUID (aman jika kolom adalah UUID)
        try {
          await supabase
            .from('jury_assignments')
            .delete()
            .eq('jury_id', stableJId)
            .eq('competition_id', stableCId);
        } catch {}
        // Hapus dengan ID teks (jika kolom adalah TEXT)
        try {
          await supabase
            .from('jury_assignments')
            .delete()
            .eq('jury_id', target.juryId)
            .eq('competition_id', target.competitionId);
        } catch {}
      }
    } catch (err) {
      console.warn('Gagal menghapus penugasan di Supabase:', err);
    }
  }

  notifyJuryDataChanged('jury_assignments', updated);
  return true;
}

export async function removeAllAssignmentsForCompetition(
  competitionId: string,
  adminName: string = 'Admin'
): Promise<boolean> {
  const normTarget = normalizeCompId(competitionId).toLowerCase();
  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const isMatch = (a: JuryAssignment) => {
    if (!a.competitionId) return false;
    if (a.competitionId === competitionId) return true;
    if (normalizeCompId(a.competitionId).toLowerCase() === normTarget) return true;
    return false;
  };
  const removed = current.filter(isMatch);
  const updated = current.filter((a) => !isMatch(a));
  setLocal(STORAGE_ASSIGNMENTS, updated);

  const deletedAssignments = new Set(getDeletedAssignmentIds());
  removed.forEach((a) => deletedAssignments.add(a.id));
  setLocal(STORAGE_DELETED_ASSIGNMENTS, Array.from(deletedAssignments));

  createAuditLog({
    action: 'CLEAR_COMPETITION_ASSIGNMENTS',
    entityType: 'jury_assignment',
    entityId: competitionId,
    oldValue: removed,
    notes: `Seluruh penugasan juri (${removed.length} dewan juri) pada lomba ${competitionId} dihapus oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      if (isUuid(competitionId)) {
        await supabase.from('jury_assignments').delete().eq('competition_id', competitionId);
      }
      const stableCompUuid = getStableUuid(competitionId);
      await supabase.from('jury_assignments').delete().eq('competition_id', stableCompUuid);
      if (!isUuid(competitionId)) {
        try { await supabase.from('jury_assignments').delete().eq('competition_id', competitionId); } catch {}
      }
      if (normTarget !== competitionId && !isUuid(normTarget)) {
        try { await supabase.from('jury_assignments').delete().eq('competition_id', normTarget); } catch {}
      }
    } catch (err) {
      console.warn('Gagal menghapus penugasan lomba di Supabase:', err);
    }
  }

  notifyJuryDataChanged('jury_assignments', updated);
  return true;
}

export async function removeAllAssignmentsForJudge(
  juryId: string,
  adminName: string = 'Admin'
): Promise<boolean> {
  const normJ = juryId.toLowerCase().trim();
  const normAlias = normJ.replace(/^juri-/, 'jury-');
  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const isMatch = (a: JuryAssignment) => {
    const aJId = (a.juryId || '').toLowerCase().trim();
    return aJId === normJ || aJId === normAlias || aJId.replace(/^juri-/, 'jury-') === normAlias;
  };
  const removed = current.filter(isMatch);
  const updated = current.filter((a) => !isMatch(a));
  setLocal(STORAGE_ASSIGNMENTS, updated);

  const deletedAssignments = new Set(getDeletedAssignmentIds());
  removed.forEach((a) => deletedAssignments.add(a.id));
  setLocal(STORAGE_DELETED_ASSIGNMENTS, Array.from(deletedAssignments));

  createAuditLog({
    action: 'CLEAR_JURY_ASSIGNMENTS',
    entityType: 'jury_assignment',
    entityId: juryId,
    oldValue: removed,
    notes: `Seluruh penugasan cabang lomba (${removed.length} cabang lomba) untuk juri ${juryId} dihapus oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      if (isUuid(juryId)) {
        await supabase.from('jury_assignments').delete().eq('jury_id', juryId);
      }
      const stableJuryUuid = getStableUuid(juryId);
      await supabase.from('jury_assignments').delete().eq('jury_id', stableJuryUuid);
      if (!isUuid(juryId)) {
        try { await supabase.from('jury_assignments').delete().eq('jury_id', juryId); } catch {}
      }
      if (normAlias !== juryId && !isUuid(normAlias)) {
        try { await supabase.from('jury_assignments').delete().eq('jury_id', normAlias); } catch {}
      }
    } catch (err) {
      console.warn('Gagal menghapus penugasan dewan juri di Supabase:', err);
    }
  }

  notifyJuryDataChanged('jury_assignments', updated);
  return true;
}

/**
 * Kosongkan seluruh penugasan juri (Reset ke 0 penugasan di CMS & Supabase)
 */
export async function clearAllJuryAssignments(adminName: string = 'Admin'): Promise<boolean> {
  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  setLocal(STORAGE_ASSIGNMENTS, []);

  const deletedAssignments = new Set(getDeletedAssignmentIds());
  current.forEach((a) => deletedAssignments.add(a.id));
  setLocal(STORAGE_DELETED_ASSIGNMENTS, Array.from(deletedAssignments));

  createAuditLog({
    action: 'CLEAR_ALL_ASSIGNMENTS',
    entityType: 'jury_assignment',
    entityId: 'all',
    oldValue: current,
    notes: `Seluruh penugasan dewan juri (${current.length} penugasan) direset/dikosongkan oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_assignments').delete().neq('id', 'keep-none-sentinel');
    } catch (err) {
      console.warn('Gagal membersihkan seluruh penugasan di Supabase:', err);
    }
  }

  notifyJuryDataChanged('jury_assignments', []);
  return true;
}

// ==============================================================================
// 6. SCORING CRITERIA SERVICE
// ==============================================================================
export async function getScoringCriteria(competitionId?: string): Promise<ScoringCriterion[]> {
  const deletedCriteria = new Set(getDeletedCriteriaIds());
  const normCompId = competitionId ? normalizeCompId(competitionId) : undefined;
  const stableCompUuid = normCompId ? getStableUuid(normCompId) : undefined;
  const availableComps = getAvailableCompetitions();
  let remoteCriteria: ScoringCriterion[] = [];
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      // Ambil seluruh kriteria dan filter di memori untuk mencegah error PostgreSQL 22P02 "invalid input syntax for type uuid"
      const { data, error } = await supabase
        .from('scoring_criteria')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        remoteCriteria = data
          .filter((d: any) => {
            if (deletedCriteria.has(d.id)) return false;
            if (!competitionId) return true;
            const dComp = String(d.competition_id || '').toLowerCase();
            return (
              dComp === competitionId.toLowerCase() ||
              normalizeCompId(dComp) === normCompId ||
              (stableCompUuid && dComp === stableCompUuid.toLowerCase()) ||
              (isUuid(competitionId) && dComp === competitionId.toLowerCase())
            );
          })
          .map((d: any) => {
            const resolvedComp = resolveCompetition(availableComps, d.competition_id);
            const compIdToUse = resolvedComp ? resolvedComp.id : (competitionId ? normCompId || competitionId : normalizeCompId(d.competition_id));
            return {
              id: String(d.id),
              competitionId: compIdToUse,
              criterionName: d.criterion_name || d.name || d.title || 'Kriteria Penilaian',
              description: d.description || '',
              maxScore: Number(d.max_score || d.maxScore) || 100,
              weight: Number(d.weight) || 0,
              sortOrder: Number(d.sort_order || d.sortOrder) || 1,
              isActive: d.is_active !== undefined ? Boolean(d.is_active) : (d.isActive !== undefined ? Boolean(d.isActive) : true),
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            };
          });
      }
    } catch {}
  }

  const all = getLocal<ScoringCriterion[]>(STORAGE_CRITERIA, INITIAL_SCORING_CRITERIA);
  const normalizedAll = all
    .filter((c) => !deletedCriteria.has(c.id))
    .map((c) => {
      const resolvedComp = resolveCompetition(availableComps, c.competitionId);
      return {
        ...c,
        competitionId: resolvedComp ? resolvedComp.id : normalizeCompId(c.competitionId),
      };
    });

  const criteriaMap = new Map<string, ScoringCriterion>();
  // 1. Masukkan data remote dari Supabase sebagai acuan utama
  for (const r of remoteCriteria) {
    criteriaMap.set(r.id, r);
  }
  // 2. Tambahkan data lokal yang belum ada di remote
  for (const l of normalizedAll) {
    const isAlreadyInRemote = Array.from(criteriaMap.values()).some((r) => 
      r.id === l.id || 
      r.id === getStableUuid(l.id) || 
      getStableUuid(r.id) === getStableUuid(l.id) ||
      (r.competitionId === l.competitionId && r.criterionName.trim().toLowerCase() === l.criterionName.trim().toLowerCase())
    );
    if (!isAlreadyInRemote) {
      criteriaMap.set(l.id, l);
    }
  }
  const mergedList = Array.from(criteriaMap.values());

  if (normCompId) {
    return mergedList.filter((c) => c.competitionId === normCompId || c.competitionId === competitionId);
  }
  return mergedList;
}

export async function saveScoringCriterion(
  criterion: Partial<ScoringCriterion> & { competitionId: string; criterionName: string; weight: number },
  adminName: string = 'Admin'
): Promise<{ success: boolean; data?: ScoringCriterion; message?: string; supabaseSynced?: boolean; supabaseError?: string }> {
  // Gunakan UUID v4 agar kompatibel penuh baik tipe TEXT maupun UUID di PostgreSQL Supabase
  const id = criterion.id || generateJuryUuid();
  const now = new Date().toISOString();

  // If re-saved, remove from deleted list
  const deletedCriteria = new Set(getDeletedCriteriaIds());
  if (deletedCriteria.has(id)) {
    deletedCriteria.delete(id);
    setLocal(STORAGE_DELETED_CRITERIA, Array.from(deletedCriteria));
  }

  const normComp = normalizeCompId(criterion.competitionId);
  const finalCrit: ScoringCriterion = {
    id,
    competitionId: normComp,
    criterionName: criterion.criterionName.trim(),
    description: criterion.description?.trim() || '',
    maxScore: Number(criterion.maxScore) || 100,
    weight: Number(criterion.weight) || 0,
    sortOrder: Number(criterion.sortOrder) || 1,
    isActive: criterion.isActive ?? true,
    createdAt: criterion.createdAt || now,
    updatedAt: now,
  };

  const list = getLocal<ScoringCriterion[]>(STORAGE_CRITERIA, INITIAL_SCORING_CRITERIA);
  const existsIdx = list.findIndex((c) => c.id === id);
  let updated: ScoringCriterion[];
  if (existsIdx >= 0) {
    updated = list.map((c, i) => (i === existsIdx ? finalCrit : c));
    createAuditLog({
      action: 'UPDATE_CRITERION',
      entityType: 'scoring_criterion',
      entityId: id,
      newValue: finalCrit,
      notes: `Kriteria "${finalCrit.criterionName}" (Bobot ${finalCrit.weight}%) pada lomba ${finalCrit.competitionId} diperbarui oleh: ${adminName}`,
    });
  } else {
    updated = [...list, finalCrit];
    createAuditLog({
      action: 'CREATE_CRITERION',
      entityType: 'scoring_criterion',
      entityId: id,
      newValue: finalCrit,
      notes: `Kriteria baru "${finalCrit.criterionName}" (Bobot ${finalCrit.weight}%) dibuat pada lomba ${finalCrit.competitionId} oleh: ${adminName}`,
    });
  }
  setLocal(STORAGE_CRITERIA, updated);

  let supabaseSynced = false;
  let supabaseErrorMsg: string | undefined = undefined;

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const stableCritId = isUuid(finalCrit.id) ? finalCrit.id : getStableUuid(finalCrit.id);
      const stableCompUuid = isUuid(finalCrit.competitionId) ? finalCrit.competitionId : getStableUuid(finalCrit.competitionId);

      // 0. Cari remoteCompId nyata di tabel competitions Supabase (mencegah foreign key violation)
      let remoteCompId: string = stableCompUuid;
      try {
        const { data: dbComps } = await supabase.from('competitions').select('id, code, title');
        if (dbComps && dbComps.length > 0) {
          const allComps = getAvailableCompetitions();
          const targetComp = allComps.find((c) => c.id === finalCrit.competitionId) || resolveCompetition(allComps, finalCrit.competitionId);
          const matched = dbComps.find((rc: any) => {
            const sid = String(rc.id);
            if (sid === finalCrit.competitionId) return true;
            if (isUuid(finalCrit.competitionId) && sid.toLowerCase() === finalCrit.competitionId.toLowerCase()) return true;
            if (sid === stableCompUuid) return true;
            if (rc.code && (String(rc.code).toLowerCase() === finalCrit.competitionId.toLowerCase() || (targetComp?.code && String(rc.code).toLowerCase() === targetComp.code.toLowerCase()))) return true;
            if (rc.title && (String(rc.title).toLowerCase() === (targetComp?.title || '').toLowerCase() || String(rc.title).toLowerCase() === finalCrit.competitionId.toLowerCase())) return true;
            if (normalizeCompId(sid).toLowerCase() === normalizeCompId(finalCrit.competitionId).toLowerCase()) return true;
            return false;
          });
          if (matched?.id) {
            remoteCompId = String(matched.id);
          }
        }
      } catch {}

      try {
        const allComps = getAvailableCompetitions();
        const targetComp = allComps.find((c) => c.id === finalCrit.competitionId) || resolveCompetition(allComps, finalCrit.competitionId);
        const compPayload = {
          id: remoteCompId,
          code: targetComp?.code || finalCrit.competitionId,
          title: targetComp?.title || finalCrit.competitionId,
          category: targetComp?.category || 'Umum',
          short_desc: (targetComp as any)?.shortDesc || (targetComp as any)?.description || targetComp?.title || finalCrit.competitionId,
          full_desc: (targetComp as any)?.fullDesc || (targetComp as any)?.description || targetComp?.title || finalCrit.competitionId,
          is_active: true,
        };
        await supabase.from('competitions').upsert(compPayload, { onConflict: 'id' });
        if (remoteCompId !== finalCrit.competitionId && !isUuid(finalCrit.competitionId)) {
          try {
            await supabase.from('competitions').upsert({ ...compPayload, id: finalCrit.competitionId }, { onConflict: 'id' });
          } catch {}
        }
      } catch {}

      // 1. Cari apakah kriteria sudah ada di Supabase secara aman di memori
      let existingRemoteCritId: string | undefined = undefined;
      try {
        const { data: dbCriteria } = await supabase.from('scoring_criteria').select('*');
        if (dbCriteria && dbCriteria.length > 0) {
          const matched = dbCriteria.find((rc: any) => {
            const sid = String(rc.id);
            if (sid === finalCrit.id || sid === stableCritId) return true;
            const cName = rc.criterion_name || rc.name || '';
            const isNameMatch = cName.trim().toLowerCase() === finalCrit.criterionName.trim().toLowerCase();
            const rcComp = String(rc.competition_id || '');
            const isCompMatch =
              rcComp === finalCrit.competitionId ||
              rcComp === remoteCompId ||
              rcComp === stableCompUuid ||
              normalizeCompId(rcComp) === normalizeCompId(finalCrit.competitionId);
            return isNameMatch && isCompMatch;
          });
          if (matched?.id) {
            existingRemoteCritId = String(matched.id);
          }
        }
      } catch {}

      // 2. Jika baris remote ditemukan: UPDATE baris tersebut langsung (Aman tanpa manipulasi kolom ID)
      if (existingRemoteCritId) {
        const updatePayloads = [
          {
            criterion_name: finalCrit.criterionName,
            description: finalCrit.description,
            max_score: finalCrit.maxScore,
            weight: finalCrit.weight,
            sort_order: finalCrit.sortOrder,
            is_active: finalCrit.isActive,
            updated_at: now,
          },
          {
            criterion_name: finalCrit.criterionName,
            description: finalCrit.description,
            max_score: finalCrit.maxScore,
            weight: finalCrit.weight,
            sort_order: finalCrit.sortOrder,
            is_active: finalCrit.isActive,
          },
          {
            name: finalCrit.criterionName,
            description: finalCrit.description,
            max_score: finalCrit.maxScore,
            weight: finalCrit.weight,
            sort_order: finalCrit.sortOrder,
            is_active: finalCrit.isActive,
          },
          {
            criterion_name: finalCrit.criterionName,
            weight: finalCrit.weight,
            max_score: finalCrit.maxScore,
            is_active: finalCrit.isActive,
          },
        ];

        for (const up of updatePayloads) {
          const { error: updErr } = await supabase
            .from('scoring_criteria')
            .update(up)
            .eq('id', existingRemoteCritId);
          if (!updErr) {
            supabaseSynced = true;
            break;
          } else {
            const upMsg = (updErr.message || '').toLowerCase();
            if (!upMsg.includes('uuid')) {
              supabaseErrorMsg = updErr.message;
            }
          }
        }
      }

      // 3. Jika belum tersinkron (kriteria baru atau update gagal), coba INSERT / UPSERT dengan multi-kandidat aman
      if (!supabaseSynced) {
        const candidatePayloads = [
          // 3a. Prioritas Utama: UUID ID + UUID Competition ID (Kompatibel skema UUID & TEXT)
          {
            full: {
              id: stableCritId,
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
              updated_at: now,
            },
            noUpdate: {
              id: stableCritId,
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
            },
            altName: {
              id: stableCritId,
              competition_id: remoteCompId,
              name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
            },
            compact: {
              id: stableCritId,
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              weight: finalCrit.weight,
              max_score: finalCrit.maxScore,
              is_active: finalCrit.isActive,
            },
          },
          // 3b. Auto ID (tanpa id eksplisit) + UUID Competition ID
          {
            full: {
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
              updated_at: now,
            },
            noUpdate: {
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
            },
            altName: {
              competition_id: remoteCompId,
              name: finalCrit.criterionName,
              description: finalCrit.description,
              max_score: finalCrit.maxScore,
              weight: finalCrit.weight,
              sort_order: finalCrit.sortOrder,
              is_active: finalCrit.isActive,
            },
            compact: {
              competition_id: remoteCompId,
              criterion_name: finalCrit.criterionName,
              weight: finalCrit.weight,
              max_score: finalCrit.maxScore,
              is_active: finalCrit.isActive,
            },
          },
          // 3c. Text-based schema (Hanya jika competitionId bukan UUID)
          ...(!isUuid(finalCrit.competitionId) ? [
            {
              full: {
                id: finalCrit.id,
                competition_id: finalCrit.competitionId,
                criterion_name: finalCrit.criterionName,
                description: finalCrit.description,
                max_score: finalCrit.maxScore,
                weight: finalCrit.weight,
                sort_order: finalCrit.sortOrder,
                is_active: finalCrit.isActive,
                updated_at: now,
              },
              noUpdate: {
                id: finalCrit.id,
                competition_id: finalCrit.competitionId,
                criterion_name: finalCrit.criterionName,
                description: finalCrit.description,
                max_score: finalCrit.maxScore,
                weight: finalCrit.weight,
                sort_order: finalCrit.sortOrder,
                is_active: finalCrit.isActive,
              },
              altName: {
                id: finalCrit.id,
                competition_id: finalCrit.competitionId,
                name: finalCrit.criterionName,
                description: finalCrit.description,
                max_score: finalCrit.maxScore,
                weight: finalCrit.weight,
                sort_order: finalCrit.sortOrder,
                is_active: finalCrit.isActive,
              },
              compact: {
                id: finalCrit.id,
                competition_id: finalCrit.competitionId,
                criterion_name: finalCrit.criterionName,
                weight: finalCrit.weight,
                max_score: finalCrit.maxScore,
                is_active: finalCrit.isActive,
              },
            },
          ] : [])
        ];

        for (const opt of candidatePayloads) {
          if (supabaseSynced) break;

          // 1. Coba INSERT langsung (full)
          const { error: insErr } = await supabase.from('scoring_criteria').insert(opt.full as any);
          if (!insErr) {
            supabaseSynced = true;
            break;
          }

          const errMsg = (insErr.message || '').toLowerCase();
          if (errMsg.includes('unique') || errMsg.includes('duplicate')) {
            const { error: updDupErr } = await supabase
              .from('scoring_criteria')
              .update(opt.noUpdate as any)
              .eq('competition_id', (opt.full as any).competition_id)
              .ilike('criterion_name', finalCrit.criterionName);
            if (!updDupErr) {
              supabaseSynced = true;
              break;
            }
          }

          // 2. Coba UPSERT berdasarkan id (jika memiliki id)
          if ((opt.full as any).id) {
            const { error: upsIdErr } = await supabase
              .from('scoring_criteria')
              .upsert(opt.full as any, { onConflict: 'id' });
            if (!upsIdErr) {
              supabaseSynced = true;
              break;
            }

            // 3. Coba UPSERT tanpa updated_at
            const { error: upsNoUpdErr } = await supabase
              .from('scoring_criteria')
              .upsert(opt.noUpdate as any, { onConflict: 'id' });
            if (!upsNoUpdErr) {
              supabaseSynced = true;
              break;
            }
          }

          // 4. Coba INSERT tanpa updated_at
          const { error: insNoUpdErr } = await supabase.from('scoring_criteria').insert(opt.noUpdate as any);
          if (!insNoUpdErr) {
            supabaseSynced = true;
            break;
          }

          // 5. Coba dengan nama kolom 'name' alih-alih 'criterion_name'
          const { error: altNameErr } = await supabase.from('scoring_criteria').insert(opt.altName as any);
          if (!altNameErr) {
            supabaseSynced = true;
            break;
          }

          // 6. Coba payload kompak
          const { error: compactErr } = await supabase.from('scoring_criteria').insert(opt.compact as any);
          if (!compactErr) {
            supabaseSynced = true;
            break;
          }

          const emCombined = (insErr.message || insNoUpdErr?.message || altNameErr?.message || compactErr?.message || '').toLowerCase();
          if (!emCombined.includes('uuid')) {
            supabaseErrorMsg = insErr.message || insNoUpdErr?.message || altNameErr?.message;
          }
        }
      }
    } catch (err: any) {
      const errMsg = (err?.message || '').toLowerCase();
      if (!errMsg.includes('uuid')) {
        supabaseErrorMsg = err?.message;
      }
      console.warn('Exception saat menyimpan scoring_criteria ke Supabase:', err);
    }
  }

  // Bersihkan error message jika memuat 'uuid' agar pengguna tidak melihat pesan teknis
  if (supabaseErrorMsg && supabaseErrorMsg.toLowerCase().includes('uuid')) {
    supabaseErrorMsg = 'Penyesuaian format ID di tabel scoring_criteria sedang berlangsung. Pastikan skema tabel di Tab Supabase siap.';
  }

  notifyJuryDataChanged('scoring_criteria', updated);
  return {
    success: true,
    data: finalCrit,
    supabaseSynced: isSupabaseConnected() ? supabaseSynced : undefined,
    supabaseError: supabaseSynced ? undefined : supabaseErrorMsg,
  };
}

export async function deleteScoringCriterion(
  criterionId: string,
  adminName: string = 'Admin'
): Promise<boolean> {
  const deletedCriteria = new Set(getDeletedCriteriaIds());
  deletedCriteria.add(criterionId);
  setLocal(STORAGE_DELETED_CRITERIA, Array.from(deletedCriteria));

  const list = getLocal<ScoringCriterion[]>(STORAGE_CRITERIA, INITIAL_SCORING_CRITERIA);
  const target = list.find((c) => c.id === criterionId);
  const updated = list.filter((c) => c.id !== criterionId);
  setLocal(STORAGE_CRITERIA, updated);

  createAuditLog({
    action: 'DELETE_CRITERION',
    entityType: 'scoring_criterion',
    entityId: criterionId,
    oldValue: target,
    notes: `Kriteria "${target?.criterionName || criterionId}" dihapus permanen oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      if (isUuid(criterionId)) {
        await supabase.from('scoring_criteria').delete().eq('id', criterionId);
      }
      const stableId = getStableUuid(criterionId);
      await supabase.from('scoring_criteria').delete().eq('id', stableId);
      if (!isUuid(criterionId)) {
        try { await supabase.from('scoring_criteria').delete().eq('id', criterionId); } catch {}
      }

      // Hapus berdasarkan kombinasi (competition_id, criterion_name) jika target diketahui
      if (target) {
        try {
          await supabase
            .from('scoring_criteria')
            .delete()
            .eq('competition_id', getStableUuid(target.competitionId))
            .ilike('criterion_name', target.criterionName);
        } catch {}
        try {
          await supabase
            .from('scoring_criteria')
            .delete()
            .eq('competition_id', target.competitionId)
            .ilike('criterion_name', target.criterionName);
        } catch {}
      }
    } catch {}
  }

  notifyJuryDataChanged('scoring_criteria', updated);
  return true;
}

// ==============================================================================
// 7. JURY SCORES SERVICE (PENILAIAN DRAF & FINAL)
// ==============================================================================
export async function getJuryScores(
  competitionId?: string,
  juryId?: string,
  participantId?: string
): Promise<JuryScore[]> {
  let remoteScores: JuryScore[] = [];
  const normComp = competitionId ? normalizeCompId(competitionId).toLowerCase() : undefined;
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      let query = supabase.from('jury_scores').select('*');
      if (competitionId && normComp) {
        query = query.or(`competition_id.eq.${competitionId},competition_id.eq.${normComp}`);
      } else if (competitionId) {
        query = query.eq('competition_id', competitionId);
      }
      if (juryId) query = query.eq('jury_id', juryId);
      if (participantId) query = query.eq('participant_id', participantId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        remoteScores = data.map((s) => ({
          id: s.id,
          juryId: s.jury_id,
          participantId: s.participant_id,
          competitionId: normalizeCompId(s.competition_id),
          scores: s.scores || {},
          totalScore: Number(s.total_score) || 0,
          notes: s.notes,
          status: s.status as JuryScoreStatus,
          submittedAt: s.submitted_at,
          lockedAt: s.locked_at,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
      }
    } catch {}
  }

  let localScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  if (competitionId) {
    localScores = localScores.filter(
      (s) => s.competitionId === competitionId || normalizeCompId(s.competitionId).toLowerCase() === normComp
    );
  }
  if (juryId) localScores = localScores.filter((s) => s.juryId === juryId);
  if (participantId) localScores = localScores.filter((s) => s.participantId === participantId);

  // Gabungkan nilai remote dan local (nilai lokal memiliki prioritas untuk draft/final terbaru)
  const scoreMap = new Map<string, JuryScore>();
  for (const r of remoteScores) {
    const key = `${r.juryId}:${r.participantId}:${normalizeCompId(r.competitionId).toLowerCase()}`;
    scoreMap.set(key, r);
  }
  for (const l of localScores) {
    const key = `${l.juryId}:${l.participantId}:${normalizeCompId(l.competitionId).toLowerCase()}`;
    scoreMap.set(key, l);
  }

  const allScoresList = Array.from(scoreMap.values()).filter((s) => !isMockScore(s));
  return allScoresList;
}

/**
 * Simpan Nilai Draf oleh Juri (boleh belum lengkap)
 */
export async function saveScoreDraft(params: {
  juryId: string;
  participantId: string;
  competitionId: string;
  scores: Record<string, number>;
  notes?: string;
  juryName?: string;
  participantName?: string;
}): Promise<{ success: boolean; data?: JuryScore; message?: string }> {
  const normComp = normalizeCompId(params.competitionId);
  const criteria = await getScoringCriteria(normComp);
  const totalScore = calculateJuryTotal(params.scores, criteria);
  const now = new Date().toISOString();

  const allScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  const existing = allScores.find(
    (s) =>
      s.juryId === params.juryId &&
      s.participantId === params.participantId &&
      (s.competitionId === params.competitionId || normalizeCompId(s.competitionId) === normComp)
  );

  if (existing && existing.status === 'locked') {
    return { success: false, message: 'Nilai telah dikunci oleh panitia dan tidak dapat diedit kembali.' };
  }

  const scoreRecord: JuryScore = {
    id: existing?.id || `score-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    juryId: params.juryId,
    participantId: params.participantId,
    competitionId: normComp,
    scores: params.scores,
    totalScore,
    notes: params.notes || '',
    status: 'draft',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    juryName: params.juryName,
    participantName: params.participantName,
  };

  const updatedList = existing
    ? allScores.map((s) => (s.id === existing.id ? scoreRecord : s))
    : [...allScores, scoreRecord];

  setLocal(STORAGE_SCORES, updatedList);

  createAuditLog({
    userId: params.juryId,
    action: 'SAVE_SCORE_DRAFT',
    entityType: 'jury_score',
    entityId: scoreRecord.id,
    newValue: { totalScore, scores: params.scores },
    notes: `Draf nilai peserta ${params.participantName || params.participantId} disimpan oleh Juri: ${params.juryName || params.juryId} (Total: ${totalScore})`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_scores').upsert(
        {
          id: scoreRecord.id,
          jury_id: params.juryId,
          participant_id: params.participantId,
          competition_id: params.competitionId,
          scores: params.scores,
          total_score: totalScore,
          notes: params.notes,
          status: 'draft',
          updated_at: now,
        },
        { onConflict: 'jury_id,participant_id,competition_id' }
      );
    } catch (e: any) {
      console.warn('Supabase save score draft note:', e?.message || e);
    }
  }

  notifyJuryDataChanged('jury_scores', scoreRecord);
  return { success: true, data: scoreRecord };
}

/**
 * Kirim Nilai Final oleh Juri (Semua kriteria wajib terisi)
 */
export async function submitFinalScore(params: {
  juryId: string;
  participantId: string;
  competitionId: string;
  scores: Record<string, number>;
  notes?: string;
  juryName?: string;
  participantName?: string;
}): Promise<{ success: boolean; data?: JuryScore; message?: string }> {
  const normComp = normalizeCompId(params.competitionId);
  const criteria = await getScoringCriteria(normComp);
  const activeCriteria = criteria.filter((c) => c.isActive);

  // Validasi: seluruh kriteria aktif wajib diisi
  for (const crit of activeCriteria) {
    const val = params.scores[crit.id];
    if (val === undefined || val === null || isNaN(val)) {
      return {
        success: false,
        message: `Kriteria "${crit.criterionName}" belum diisi. Mohon lengkapi seluruh nilai kriteria sebelum mengirim nilai final.`,
      };
    }
    if (val < 0 || val > crit.maxScore) {
      return {
        success: false,
        message: `Nilai "${crit.criterionName}" harus berada di antara 0 sampai ${crit.maxScore}.`,
      };
    }
  }

  const totalScore = calculateJuryTotal(params.scores, criteria);
  const now = new Date().toISOString();

  const allScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  const existing = allScores.find(
    (s) =>
      s.juryId === params.juryId &&
      s.participantId === params.participantId &&
      (s.competitionId === params.competitionId || normalizeCompId(s.competitionId) === normComp)
  );

  if (existing && existing.status === 'locked') {
    return { success: false, message: 'Nilai telah dikunci dan tidak dapat diubah.' };
  }

  const finalScoreRecord: JuryScore = {
    id: existing?.id || `score-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    juryId: params.juryId,
    participantId: params.participantId,
    competitionId: normComp,
    scores: params.scores,
    totalScore,
    notes: params.notes || '',
    status: 'submitted',
    submittedAt: now,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    juryName: params.juryName,
    participantName: params.participantName,
  };

  const updatedList = existing
    ? allScores.map((s) => (s.id === existing.id ? finalScoreRecord : s))
    : [...allScores, finalScoreRecord];

  setLocal(STORAGE_SCORES, updatedList);

  createAuditLog({
    userId: params.juryId,
    action: 'SUBMIT_FINAL_SCORE',
    entityType: 'jury_score',
    entityId: finalScoreRecord.id,
    newValue: { totalScore, scores: params.scores },
    notes: `Nilai final peserta ${params.participantName || params.participantId} dikirim resmi oleh Juri: ${params.juryName || params.juryId} (Skor Akhir: ${totalScore})`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_scores').upsert(
        {
          id: finalScoreRecord.id,
          jury_id: params.juryId,
          participant_id: params.participantId,
          competition_id: params.competitionId,
          scores: params.scores,
          total_score: totalScore,
          notes: params.notes,
          status: 'submitted',
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: 'jury_id,participant_id,competition_id' }
      );
    } catch {}
  }

  notifyJuryDataChanged('jury_scores', finalScoreRecord);
  return { success: true, data: finalScoreRecord };
}

/**
 * Buka Kembali Nilai (Hanya Admin / Super Admin dengan Alasan Wajib)
 */
export async function reopenJuryScore(
  scoreId: string,
  reason: string,
  adminName: string = 'Admin'
): Promise<{ success: boolean; message?: string }> {
  if (!reason.trim()) {
    return { success: false, message: 'Alasan pembukaan kembali nilai wajib diisi.' };
  }

  const allScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  const target = allScores.find((s) => s.id === scoreId);
  if (!target) {
    return { success: false, message: 'Data nilai tidak ditemukan.' };
  }

  const updatedRecord: JuryScore = {
    ...target,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };

  const updatedList = allScores.map((s) => (s.id === scoreId ? updatedRecord : s));
  setLocal(STORAGE_SCORES, updatedList);

  createAuditLog({
    action: 'REOPEN_JURY_SCORE',
    entityType: 'jury_score',
    entityId: scoreId,
    oldValue: target,
    newValue: updatedRecord,
    notes: `Nilai peserta dibuka kembali menjadi Draf oleh: ${adminName}. Alasan: ${reason}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_scores').update({ status: 'draft' }).eq('id', scoreId);
    } catch {}
  }

  notifyJuryDataChanged('jury_scores', updatedRecord);
  return { success: true };
}

/**
 * Kunci Seluruh Nilai Cabang Lomba
 */
export async function lockCompetitionScores(
  competitionId: string,
  adminName: string = 'Admin'
): Promise<{ success: boolean; count: number }> {
  const allScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  let lockedCount = 0;
  const now = new Date().toISOString();

  const updatedList = allScores.map((s) => {
    if (s.competitionId === competitionId) {
      lockedCount++;
      return { ...s, status: 'locked' as JuryScoreStatus, lockedAt: now, updatedAt: now };
    }
    return s;
  });

  setLocal(STORAGE_SCORES, updatedList);

  createAuditLog({
    action: 'LOCK_COMPETITION_SCORES',
    entityType: 'competition',
    entityId: competitionId,
    notes: `Seluruh nilai (${lockedCount} dokumen) pada lomba ${competitionId} dikunci permanen oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase
        .from('jury_scores')
        .update({ status: 'locked', locked_at: now })
        .eq('competition_id', competitionId);
    } catch {}
  }

  notifyJuryDataChanged('jury_scores', updatedList);
  return { success: true, count: lockedCount };
}

// ==============================================================================
// 8. REKAPITULASI & PERINGKAT OTOMATIS
// ==============================================================================
export interface ParticipantScoreRow {
  participant: ParticipantRegistration;
  juryScores: Record<string, number | undefined>; // juryId -> totalScore
  juryStatuses: Record<string, JuryScoreStatus | undefined>;
  submittedJuryCount: number;
  averageScore: number;
  rank: number;
  winnerTitle?: WinnerTitle | null;
  isComplete: boolean;
  hasScoreDivergence: boolean; // Selisih nilai juri > 20 poin
  isTie: boolean; // Ada peserta lain dengan nilai sama
  scoresByCriteria?: Record<string, Record<string, number>>; // juryId -> criterionId -> score
}

export async function getCompetitionScoreRecap(
  competitionId: string,
  participants: ParticipantRegistration[],
  juries: UserProfile[],
  criteria: ScoringCriterion[]
): Promise<{
  rows: ParticipantScoreRow[];
  totalExpectedJuries: number;
  allCompleted: boolean;
  hasTies: boolean;
  divergentParticipantsCount: number;
}> {
  const normTarget = normalizeCompId(competitionId).toLowerCase();
  const compParticipants = participants
    .filter((p) => !isInitialMockParticipant(p))
    .filter((p) => {
      const pNorm = normalizeCompId(p.competitionId).toLowerCase();
      return (
        p.competitionId === competitionId ||
        pNorm === normTarget ||
        p.competitionTitle?.toLowerCase() === competitionId.toLowerCase()
      );
    });

  const assignments = await getJuryAssignments();
  const assignedJuries = assignments.filter((a) => {
    const aNorm = normalizeCompId(a.competitionId).toLowerCase();
    return a.isActive && (a.competitionId === competitionId || aNorm === normTarget);
  });
  const totalExpectedJuries = assignedJuries.length;

  const allScores = await getJuryScores(competitionId);
  const existingResults = await getCompetitionResults(competitionId);

  // Group scores by participant
  const rows: ParticipantScoreRow[] = compParticipants.map((p) => {
    const pScores = allScores.filter(
      (s) => s.participantId === p.id || s.participantId === p.registrationNumber
    );

    const juryScoresMap: Record<string, number | undefined> = {};
    const juryStatusesMap: Record<string, JuryScoreStatus | undefined> = {};
    let submittedCount = 0;
    let sumScore = 0;
    const individualScores: number[] = [];

    for (const score of pScores) {
      juryScoresMap[score.juryId] = score.totalScore;
      juryStatusesMap[score.juryId] = score.status;

      if (score.status === 'submitted' || score.status === 'locked') {
        submittedCount++;
        sumScore += score.totalScore;
        individualScores.push(score.totalScore);
      }
    }

    const averageScore = submittedCount > 0 ? Number((sumScore / submittedCount).toFixed(2)) : 0;
    const isComplete = totalExpectedJuries > 0 && submittedCount >= totalExpectedJuries;

    // Deteksi perbedaan nilai juri terlalu jauh (misal > 20 poin)
    let hasScoreDivergence = false;
    if (individualScores.length >= 2) {
      const maxS = Math.max(...individualScores);
      const minS = Math.min(...individualScores);
      if (maxS - minS >= 20) {
        hasScoreDivergence = true;
      }
    }

    const matchedResult = existingResults.find(
      (r) => r.participantId === p.id || r.participantId === p.registrationNumber
    );

    return {
      participant: p,
      juryScores: juryScoresMap,
      juryStatuses: juryStatusesMap,
      submittedJuryCount: submittedCount,
      averageScore,
      rank: 0,
      winnerTitle: matchedResult?.winnerTitle || null,
      isComplete,
      hasScoreDivergence,
      isTie: false,
    };
  });

  // Sort descending by average score
  rows.sort((a, b) => b.averageScore - a.averageScore);

  // Assign ranks & detect ties
  let currentRank = 1;
  let hasTies = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].averageScore === rows[i - 1].averageScore && rows[i].averageScore > 0) {
      rows[i].rank = rows[i - 1].rank;
      rows[i].isTie = true;
      rows[i - 1].isTie = true;
      hasTies++;
    } else {
      rows[i].rank = currentRank;
    }
    currentRank++;
  }

  const allCompleted = rows.length > 0 && rows.every((r) => r.isComplete);
  const divergentParticipantsCount = rows.filter((r) => r.hasScoreDivergence).length;

  return {
    rows,
    totalExpectedJuries,
    allCompleted,
    hasTies: hasTies > 0,
    divergentParticipantsCount,
  };
}

// ==============================================================================
// 9. COMPETITION RESULTS & WINNERS SERVICE
// ==============================================================================
export async function getCompetitionResults(competitionId?: string): Promise<CompetitionResult[]> {
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      let query = supabase.from('competition_results').select('*');
      if (competitionId) query = query.eq('competition_id', competitionId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          competitionId: d.competition_id,
          participantId: d.participant_id,
          averageScore: Number(d.average_score) || 0,
          finalScore: Number(d.final_score) || 0,
          rank: d.rank,
          winnerTitle: d.winner_title as WinnerTitle,
          isPublished: d.is_published,
          determinedBy: d.determined_by,
          determinedAt: d.determined_at,
          decisionNotes: d.decision_notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch {}
  }

  let list = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);
  if (competitionId) list = list.filter((r) => r.competitionId === competitionId);
  return list;
}

export async function determineCompetitionWinners(params: {
  competitionId: string;
  results: {
    participantId: string;
    averageScore: number;
    finalScore: number;
    rank: number;
    winnerTitle?: WinnerTitle | null;
  }[];
  adminName: string;
  decisionNotes?: string;
}): Promise<{ success: boolean; count: number }> {
  const now = new Date().toISOString();
  const currentList = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);
  const otherComps = currentList.filter((r) => r.competitionId !== params.competitionId);

  const newRecords: CompetitionResult[] = params.results.map((item) => ({
    id: `result-${params.competitionId}-${item.participantId}`,
    competitionId: params.competitionId,
    participantId: item.participantId,
    averageScore: item.averageScore,
    finalScore: item.finalScore,
    rank: item.rank,
    winnerTitle: item.winnerTitle || null,
    isPublished: false, // Default tidak langsung dipublikasikan sebelum disetujui
    determinedByName: params.adminName,
    determinedAt: now,
    decisionNotes: params.decisionNotes,
    createdAt: now,
    updatedAt: now,
  }));

  setLocal(STORAGE_RESULTS, [...otherComps, ...newRecords]);

  createAuditLog({
    action: 'DETERMINE_WINNERS',
    entityType: 'competition_results',
    entityId: params.competitionId,
    newValue: newRecords.filter((r) => !!r.winnerTitle),
    notes: `Pemenang lomba ${params.competitionId} ditetapkan oleh: ${params.adminName}. Catatan dewan juri: ${params.decisionNotes || 'Sesuai rekap nilai resmi'}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      for (const res of newRecords) {
        await supabase.from('competition_results').upsert(
          {
            competition_id: res.competitionId,
            participant_id: res.participantId,
            average_score: res.averageScore,
            final_score: res.finalScore,
            rank: res.rank,
            winner_title: res.winnerTitle,
            is_published: false,
            determined_at: now,
            decision_notes: res.decisionNotes,
            updated_at: now,
          },
          { onConflict: 'competition_id,participant_id' }
        );
      }
    } catch (e) {
      console.warn('Supabase determine winners note:', e);
    }
  }

  return { success: true, count: newRecords.length };
}

export async function publishCompetitionResults(
  competitionId: string,
  isPublished: boolean,
  adminName: string = 'Super Admin'
): Promise<boolean> {
  const currentList = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);
  const updatedList = currentList.map((r) => {
    if (r.competitionId === competitionId) {
      return { ...r, isPublished, updatedAt: new Date().toISOString() };
    }
    return r;
  });
  setLocal(STORAGE_RESULTS, updatedList);

  createAuditLog({
    action: isPublished ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS',
    entityType: 'competition_results',
    entityId: competitionId,
    notes: `Hasil juara lomba ${competitionId} ${isPublished ? 'resmi dipublikasikan ke publik' : 'ditarik kembali ke draf rahasia'} oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase
        .from('competition_results')
        .update({ is_published: isPublished })
        .eq('competition_id', competitionId);
    } catch {}
  }

  return true;
}

// ==============================================================================
// 10. SCORING PROGRESS SUMMARY PER COMPETITION
// ==============================================================================
export async function getScoringProgressSummary(
  competitions: Competition[],
  participants: ParticipantRegistration[]
): Promise<JuryScoringProgress[]> {
  const assignments = await getJuryAssignments(competitions);
  const allScores = await getJuryScores();
  const allResults = await getCompetitionResults();

  return competitions.map((comp) => {
    const compNorm = normalizeCompId(comp.id).toLowerCase();
    const compParts = participants
      .filter((p) => !isInitialMockParticipant(p))
      .filter((p) => {
        const pNorm = normalizeCompId(p.competitionId).toLowerCase();
        return (
          p.competitionId === comp.id ||
          pNorm === compNorm ||
          p.competitionTitle?.toLowerCase() === comp.title.toLowerCase() ||
          resolveCompetition(competitions, p.competitionId, p.competitionTitle)?.id === comp.id
        );
      });
    const assignedJuries = assignments.filter((a) => {
      if (!a.isActive) return false;
      if (a.competitionId === comp.id) return true;
      const res = resolveCompetition(competitions, a.competitionId, a.competitionTitle);
      return res?.id === comp.id;
    });

    const totalParticipants = compParts.length;
    const totalAssignedJuries = assignedJuries.length;
    const expectedScores = totalParticipants * totalAssignedJuries;

    const compScores = allScores.filter((s) => {
      if (s.competitionId === comp.id) return true;
      const norm = normalizeCompId(s.competitionId).toLowerCase();
      return norm === compNorm || norm === comp.id.toLowerCase();
    });
    const completedScores = compScores.filter((s) => s.status === 'submitted' || s.status === 'locked').length;
    const draftScores = compScores.filter((s) => s.status === 'draft').length;

    const progressPercent = expectedScores > 0 ? Math.min(100, Math.round((completedScores / expectedScores) * 100)) : 0;
    const isLocked = compScores.length > 0 && compScores.every((s) => s.status === 'locked');

    const compResults = allResults.filter((r) => r.competitionId === comp.id);
    const hasWinner = compResults.some((r) => !!r.winnerTitle);
    const isPublished = compResults.some((r) => r.isPublished);

    return {
      competitionId: comp.id,
      competitionTitle: comp.title,
      category: comp.category,
      totalParticipants,
      totalAssignedJuries,
      expectedScores,
      completedScores,
      draftScores,
      progressPercent,
      isLocked,
      hasWinner,
      isPublished,
    };
  });
}

// ==============================================================================
// 10. BATCH SYNC & FULL INTEGRATION WITH SUPABASE DATABASE
// ==============================================================================

/**
 * Skrip SQL Khusus Pemulihan 1-Klik Foreign Key Penugasan Juri di Supabase.
 * Menghapus constraint lama yang memblokir penyimpanan akun & penugasan juri.
 */
export const JURY_FIX_FOREIGN_KEY_SQL = `-- ==============================================================================
-- SKRIP PERBAIKAN CEPAT (1 DETIK): LEPAS FOREIGN KEY PENUGASAN JURI SUPABASE
-- Jalankan di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Lepas constraint foreign key lama pada tabel penugasan juri
ALTER TABLE IF EXISTS public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;
ALTER TABLE IF EXISTS public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_competition_id_fkey;
ALTER TABLE IF EXISTS public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_assigned_by_fkey;

-- 2. Lepas constraint foreign key lama pada tabel kriteria & profiles
ALTER TABLE IF EXISTS public.scoring_criteria DROP CONSTRAINT IF EXISTS scoring_criteria_competition_id_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.jury_scores DROP CONSTRAINT IF EXISTS jury_scores_jury_id_fkey;
ALTER TABLE IF EXISTS public.jury_scores DROP CONSTRAINT IF EXISTS jury_scores_competition_id_fkey;

-- 3. Pastikan tipe kolom fleksibel UUID / TEXT tanpa error "invalid input syntax for type uuid"
DO $$ BEGIN
  BEGIN ALTER TABLE public.jury_assignments ALTER COLUMN id TYPE TEXT USING id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.jury_assignments ALTER COLUMN jury_id TYPE TEXT USING jury_id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.jury_assignments ALTER COLUMN competition_id TYPE TEXT USING competition_id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.scoring_criteria ALTER COLUMN id TYPE TEXT USING id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.scoring_criteria ALTER COLUMN competition_id TYPE TEXT USING competition_id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 4. Notifikasi reload schema ke PostgREST
NOTIFY pgrst, 'reload schema';
`;

export const JURY_SYSTEM_SETUP_SQL = `-- ==============================================================================
-- SKRIP TABEL DATABASE SISTEM PENILAIAN DEWAN JURI & PANITIA: SUPABASE POSTGRESQL
-- Festival Hari Santri Nasional 2026 - MWC NU Poncokusumo
-- Salin dan jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 0. PERBAIKAN CEPAT (1 DETIK): LEPAS CONSTRAINT LAMA JIKA MUNCUL ERROR FOREIGN KEY
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_competition_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_assigned_by_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.scoring_criteria DROP CONSTRAINT IF EXISTS scoring_criteria_competition_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 0a. TABEL CABANG PERLOMBAAN (competitions)
CREATE TABLE IF NOT EXISTS public.competitions (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    short_desc TEXT,
    full_desc TEXT,
    rules JSONB DEFAULT '[]'::jsonb,
    prizes JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0b. TABEL AKUN PANITIA & DEWAN JURI TERPUSAT (admin_users)
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

-- 1a. TABEL PROFIL DEWAN JURI & KREDENSIAL LOGIN (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'jury',
    institution TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. TABEL KHUSUS DEWAN JURI / PROFILE JURI (jury_profiles & profile_juri)
CREATE TABLE IF NOT EXISTS public.jury_profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'jury',
    institution TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_juri (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'jury',
    institution TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL PENUGASAN JURI KE CABANG LOMBA (jury_assignments)
CREATE TABLE IF NOT EXISTS public.jury_assignments (
    id TEXT PRIMARY KEY,
    jury_id TEXT NOT NULL,
    competition_id TEXT NOT NULL,
    competition_title TEXT,
    competition_category TEXT,
    assigned_by TEXT DEFAULT 'Admin CMS',
    jury_name TEXT,
    jury_email TEXT,
    jury_institution TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(jury_id, competition_id)
);

-- 3. TABEL KRITERIA DAN BOBOT PENILAIAN (scoring_criteria)
CREATE TABLE IF NOT EXISTS public.scoring_criteria (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL,
    criterion_name TEXT NOT NULL,
    description TEXT,
    max_score NUMERIC NOT NULL DEFAULT 100,
    weight NUMERIC NOT NULL DEFAULT 25,
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL NILAI JURI DRAF & FINAL (jury_scores)
CREATE TABLE IF NOT EXISTS public.jury_scores (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    jury_id TEXT NOT NULL,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score NUMERIC NOT NULL DEFAULT 0,
    feedback TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(competition_id, participant_id, jury_id)
);

-- 5. TABEL PENETAPAN JUARA & HASIL PLENO (competition_results)
CREATE TABLE IF NOT EXISTS public.competition_results (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    winner_title TEXT,
    rank INTEGER NOT NULL DEFAULT 1,
    average_score NUMERIC NOT NULL DEFAULT 0,
    final_score NUMERIC NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    decision_notes TEXT,
    determined_by TEXT,
    determined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(competition_id, participant_id)
);

-- 6. TABEL AUDIT LOG AKTIVITAS JURI (jury_audit_logs)
CREATE TABLE IF NOT EXISTS public.jury_audit_logs (
    id TEXT PRIMARY KEY,
    jury_id TEXT,
    jury_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b. PASTIKAN KOLOM-KOLOM PENDUKUNG TERSEDIA PADA TABEL YANG SUDAH DIBUAT
ALTER TABLE IF EXISTS public.competitions
  ADD COLUMN IF NOT EXISTS code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS short_desc TEXT,
  ADD COLUMN IF NOT EXISTS full_desc TEXT,
  ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prizes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.scoring_criteria
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 25,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.jury_assignments
  ADD COLUMN IF NOT EXISTS jury_name TEXT,
  ADD COLUMN IF NOT EXISTS jury_email TEXT,
  ADD COLUMN IF NOT EXISTS jury_institution TEXT,
  ADD COLUMN IF NOT EXISTS competition_title TEXT,
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by TEXT DEFAULT 'Admin CMS',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Pastikan tipe kolom fleksibel (mengizinkan TEXT dan UUID tanpa error "invalid input syntax for type uuid")
DO $$ BEGIN
  -- Lepas constraint foreign key jika ada agar ALTER COLUMN TYPE tidak terhalang
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_competition_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_assigned_by_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.scoring_criteria DROP CONSTRAINT IF EXISTS scoring_criteria_competition_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE public.jury_assignments ALTER COLUMN id TYPE TEXT USING id::text;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments ALTER COLUMN jury_id TYPE TEXT USING jury_id::text;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.jury_assignments ALTER COLUMN competition_id TYPE TEXT USING competition_id::text;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.scoring_criteria ALTER COLUMN id TYPE TEXT USING id::text;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.scoring_criteria ALTER COLUMN competition_id TYPE TEXT USING competition_id::text;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Pastikan indeks dan constraint unik pada jury_id dan competition_id tersedia
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jury_assignments_jury_id_competition_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.jury_assignments ADD CONSTRAINT jury_assignments_jury_id_competition_id_key UNIQUE(jury_id, competition_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jury_assignments_lookup ON public.jury_assignments(jury_id, competition_id);

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 7. ENABLE ROW LEVEL SECURITY (RLS) DENGAN AKSES AMAN
ALTER TABLE IF EXISTS public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jury_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competitions') THEN
    DROP POLICY IF EXISTS "Public all competitions" ON public.competitions;
    CREATE POLICY "Public all competitions" ON public.competitions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  DROP POLICY IF EXISTS "Public all admin_users" ON public.admin_users;
  CREATE POLICY "Public all admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public all profiles" ON public.profiles;
  CREATE POLICY "Public all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jury_profiles') THEN
    DROP POLICY IF EXISTS "Public all jury_profiles" ON public.jury_profiles;
    CREATE POLICY "Public all jury_profiles" ON public.jury_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_juri') THEN
    DROP POLICY IF EXISTS "Public all profile_juri" ON public.profile_juri;
    CREATE POLICY "Public all profile_juri" ON public.profile_juri FOR ALL USING (true) WITH CHECK (true);
  END IF;

  DROP POLICY IF EXISTS "Public all jury_assignments" ON public.jury_assignments;
  CREATE POLICY "Public all jury_assignments" ON public.jury_assignments FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public all scoring_criteria" ON public.scoring_criteria;
  CREATE POLICY "Public all scoring_criteria" ON public.scoring_criteria FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public all jury_scores" ON public.jury_scores;
  CREATE POLICY "Public all jury_scores" ON public.jury_scores FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public all competition_results" ON public.competition_results;
  CREATE POLICY "Public all competition_results" ON public.competition_results FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public all jury_audit_logs" ON public.jury_audit_logs;
  CREATE POLICY "Public all jury_audit_logs" ON public.jury_audit_logs FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 8. AKTIFKAN REPLIKASI REALTIME SUPABASE UNTUK SINKRONISASI OTOMATIS
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.jury_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_juri;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.jury_assignments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_criteria;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.jury_scores;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_results;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
`;

/**
 * Periksa ketersediaan dan kesiapan tabel-tabel sistem juri di database Supabase
 */
export async function checkJuryTablesStatus(): Promise<{
  connected: boolean;
  message: string;
  tables: {
    profiles: boolean;
    jury_profiles?: boolean;
    profile_juri?: boolean;
    admin_users: boolean;
    jury_assignments: boolean;
    scoring_criteria: boolean;
    jury_scores: boolean;
    competition_results: boolean;
  };
  allJuryTablesReady: boolean;
  missingTables: string[];
}> {
  const supabase = getSupabaseClient();
  const connected = isSupabaseConnected() && Boolean(supabase);

  const defaultStatus = {
    connected: false,
    message: 'Supabase belum dikonfigurasi.',
    tables: {
      profiles: false,
      jury_profiles: false,
      profile_juri: false,
      admin_users: false,
      jury_assignments: false,
      scoring_criteria: false,
      jury_scores: false,
      competition_results: false,
    },
    allJuryTablesReady: false,
    missingTables: ['profiles / jury_profiles / profile_juri', 'admin_users', 'jury_assignments', 'scoring_criteria', 'jury_scores', 'competition_results'],
  };

  if (!connected || !supabase) {
    return defaultStatus;
  }

  try {
    const [pRes, jpRes, pjRes, auRes, aRes, cRes, sRes, rRes] = await Promise.all([
      supabase.from('profiles').select('id').limit(1),
      supabase.from('jury_profiles').select('id').limit(1),
      supabase.from('profile_juri').select('id').limit(1),
      supabase.from('admin_users').select('id').limit(1),
      supabase.from('jury_assignments').select('id').limit(1),
      supabase.from('scoring_criteria').select('id').limit(1),
      supabase.from('jury_scores').select('id').limit(1),
      supabase.from('competition_results').select('id').limit(1),
    ]);

    const isProfilesReady = !pRes.error || !jpRes.error || !pjRes.error;
    const isJuryProfilesReady = !jpRes.error;
    const isProfileJuriReady = !pjRes.error;
    const isAdminUsersReady = !auRes.error;
    const isAssignmentsReady = !aRes.error;
    const isCriteriaReady = !cRes.error;
    const isScoresReady = !sRes.error;
    const isResultsReady = !rRes.error;

    const missing: string[] = [];
    if (!isProfilesReady && !isAdminUsersReady) missing.push('profiles / jury_profiles / profile_juri');
    if (!isAssignmentsReady) missing.push('jury_assignments');
    if (!isCriteriaReady) missing.push('scoring_criteria');
    if (!isScoresReady) missing.push('jury_scores');
    if (!isResultsReady) missing.push('competition_results');

    const allReady = missing.length === 0;

    return {
      connected: true,
      message: allReady
        ? 'Seluruh tabel sistem penilaian juri siap di Supabase.'
        : `Tabel berikut belum dibuat di Supabase: ${missing.join(', ')}`,
      tables: {
        profiles: isProfilesReady,
        jury_profiles: isJuryProfilesReady,
        profile_juri: isProfileJuriReady,
        admin_users: isAdminUsersReady,
        jury_assignments: isAssignmentsReady,
        scoring_criteria: isCriteriaReady,
        jury_scores: isScoresReady,
        competition_results: isResultsReady,
      },
      allJuryTablesReady: allReady,
      missingTables: missing,
    };
  } catch (err: any) {
    return {
      ...defaultStatus,
      connected: true,
      message: `Gagal memeriksa status tabel di Supabase: ${err?.message || err}`,
    };
  }
}

/**
 * Sinkronisasi Seluruh Data CMS Penilaian Juri ke Supabase
 */
export async function syncAllJuryDataToSupabase(customCompetitions?: Competition[]): Promise<{
  success: boolean;
  message: string;
  details?: {
    profiles: number;
    assignments: number;
    criteria: number;
    scores: number;
    results: number;
  };
  errors?: string[];
  hasForeignKeyError?: boolean;
  foreignKeyFixSql?: string;
}> {
  const supabase = getSupabaseClient();
  if (!isSupabaseConnected() || !supabase) {
    return {
      success: false,
      message: 'Koneksi database Supabase belum terkonfigurasi. Silakan periksa URL & Anon Key di Tab Database Supabase.',
    };
  }

  const syncErrors: string[] = [];

  try {
    const profiles = await getJuryProfiles();
    const assignments = await getJuryAssignments(customCompetitions);
    const criteria = await getScoringCriteria();
    const scores = await getJuryScores();
    const results = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);

    // 0. Pastikan seluruh cabang perlombaan tersimpan di Supabase & bangun peta lookup remote
    const remoteCompMap = new Map<string, string>();
    const allComps = customCompetitions && customCompetitions.length > 0 ? customCompetitions : getAvailableCompetitions();

    try {
      const { data: dbComps } = await supabase.from('competitions').select('*');
      if (dbComps && dbComps.length > 0) {
        for (const comp of allComps) {
          const matched = dbComps.find((rc: any) => {
            const sid = String(rc.id);
            if (sid === comp.id) return true;
            if (isUuid(comp.id) && sid.toLowerCase() === comp.id.toLowerCase()) return true;
            if (sid === getStableUuid(comp.id)) return true;
            if (rc.code && (String(rc.code).toLowerCase() === comp.id.toLowerCase() || (comp.code && String(rc.code).toLowerCase() === comp.code.toLowerCase()))) return true;
            if (rc.title && (String(rc.title).toLowerCase() === comp.title.toLowerCase() || String(rc.title).toLowerCase() === comp.id.toLowerCase())) return true;
            if (normalizeCompId(sid).toLowerCase() === normalizeCompId(comp.id).toLowerCase()) return true;
            return false;
          });
          if (matched?.id) {
            const sid = String(matched.id);
            remoteCompMap.set(comp.id.toLowerCase(), sid);
            remoteCompMap.set(normalizeCompId(comp.id).toLowerCase(), sid);
            if (comp.code) remoteCompMap.set(comp.code.toLowerCase(), sid);
            if (comp.title) remoteCompMap.set(comp.title.toLowerCase(), sid);
            remoteCompMap.set(sid.toLowerCase(), sid);
          }
        }
      }

      for (const comp of allComps) {
        const compUuid = getStableUuid(comp.id);
        const resolvedCompId = remoteCompMap.get(comp.id.toLowerCase()) || compUuid;
        const compPayload = {
          id: resolvedCompId,
          code: comp.code || comp.id,
          title: comp.title,
          category: comp.category,
          short_desc: (comp as any).shortDesc || (comp as any).description || comp.title,
          full_desc: (comp as any).fullDesc || (comp as any).description || comp.title,
          is_active: true,
        };
        await supabase.from('competitions').upsert(compPayload, { onConflict: 'id' });
        remoteCompMap.set(comp.id.toLowerCase(), resolvedCompId);
        remoteCompMap.set(normalizeCompId(comp.id).toLowerCase(), resolvedCompId);
        if (comp.code) remoteCompMap.set(comp.code.toLowerCase(), resolvedCompId);
        if (comp.title) remoteCompMap.set(comp.title.toLowerCase(), resolvedCompId);
        remoteCompMap.set(resolvedCompId.toLowerCase(), resolvedCompId);

        // Also try text id if different and not UUID
        if (resolvedCompId !== comp.id && !isUuid(comp.id)) {
          try {
            await supabase.from('competitions').upsert({ ...compPayload, id: comp.id }, { onConflict: 'id' });
          } catch {}
        }
      }
    } catch (cErr) {
      console.warn('Catatan sync perlombaan ke Supabase:', cErr);
    }

    // Bangun peta lookup juri yang sudah ada di Supabase & pastikan tersimpan aman
    const remoteJuryMap = new Map<string, string>();
    let pCount = 0;
    for (const p of profiles) {
      const ensRes = await ensureJuryProfileInSupabase(supabase, p);
      if (ensRes.success) {
        pCount++;
        remoteJuryMap.set(p.id.toLowerCase(), ensRes.validJuryId);
        remoteJuryMap.set(ensRes.validJuryId.toLowerCase(), ensRes.validJuryId);
        if (p.email) remoteJuryMap.set(p.email.toLowerCase(), ensRes.validJuryId);
        if (p.username) remoteJuryMap.set(p.username.toLowerCase(), ensRes.validJuryId);
      } else {
        syncErrors.push(`Akun Juri (${p.fullName}): ${ensRes.errorMsg || 'Gagal menyimpan profil juri ke Supabase'}`);
      }
    }

    // 2. Sync Assignments (Strict authoritative sync)
    let aCount = 0;
    let hasForeignKeyError = false;
    const activeAssignments = assignments.filter((a) => a.isActive);

    let remoteAssignmentsList: any[] = [];
    try {
      const { data: remoteRows } = await supabase.from('jury_assignments').select('*');
      if (remoteRows && remoteRows.length > 0) {
        remoteAssignmentsList = remoteRows;
        const staleRemoteRows = remoteRows.filter((r: any) => {
          return !activeAssignments.some((a) => {
            const knownJId = remoteJuryMap.get(a.juryEmail?.toLowerCase() || '') || remoteJuryMap.get(a.juryId.toLowerCase()) || a.juryId;
            const knownCId = remoteCompMap.get(a.competitionId.toLowerCase()) || remoteCompMap.get(normalizeCompId(a.competitionId).toLowerCase()) || a.competitionId;
            const rJId = String(r.jury_id || '');
            const rCId = String(r.competition_id || '');
            const jMatch =
              rJId === a.juryId ||
              rJId === getStableUuid(a.juryId) ||
              rJId === knownJId ||
              (a.juryEmail && r.jury_email && a.juryEmail.toLowerCase() === r.jury_email.toLowerCase());
            const cMatch =
              rCId === a.competitionId ||
              rCId === getStableUuid(a.competitionId) ||
              rCId === knownCId ||
              normalizeCompId(rCId) === normalizeCompId(a.competitionId);
            return jMatch && cMatch;
          });
        });

        for (const sRow of staleRemoteRows) {
          if (sRow?.id) {
            await supabase.from('jury_assignments').delete().eq('id', sRow.id);
          }
        }
      }
    } catch (delErr) {
      console.warn('Catatan pembersihan penugasan usang di Supabase:', delErr);
    }

    for (const a of activeAssignments) {
      const knownRemoteJuryId = remoteJuryMap.get(a.juryEmail?.toLowerCase() || '') || remoteJuryMap.get(a.juryId.toLowerCase());
      const effectiveJuryUuid = (knownRemoteJuryId && isUuid(knownRemoteJuryId)) ? knownRemoteJuryId : (isUuid(a.juryId) ? a.juryId : getStableUuid(a.juryId));

      const knownRemoteCompId = remoteCompMap.get(a.competitionId.toLowerCase()) || remoteCompMap.get(normalizeCompId(a.competitionId).toLowerCase());
      const effectiveCompUuid = (knownRemoteCompId && isUuid(knownRemoteCompId)) ? knownRemoteCompId : (isUuid(a.competitionId) ? a.competitionId : getStableUuid(a.competitionId));

      const stableAssignId = isUuid(a.id) ? a.id : getStableUuid(a.id);
      let saved = false;

      // 1. Cek apakah penugasan sudah ada di cache remoteAssignmentsList secara aman di memori
      let existingId: string | undefined = undefined;
      const existingRow = remoteAssignmentsList.find((r: any) => {
        const rJury = String(r.jury_id || '');
        const rComp = String(r.competition_id || '');
        const jMatch =
          rJury === effectiveJuryUuid ||
          rJury === a.juryId ||
          (a.juryEmail && r.jury_email && a.juryEmail.toLowerCase() === r.jury_email.toLowerCase());
        const cMatch =
          rComp === effectiveCompUuid ||
          rComp === a.competitionId ||
          normalizeCompId(rComp) === normalizeCompId(a.competitionId);
        return jMatch && cMatch;
      });

      if (existingRow?.id) {
        existingId = String(existingRow.id);
      }

      if (existingId) {
        // Update baris yang sudah ada (tidak mengubah id/jury_id/competition_id, aman dari error UUID)
        const updRes = await supabase
          .from('jury_assignments')
          .update({
            competition_title: a.competitionTitle || '',
            competition_category: a.competitionCategory || '',
            assigned_by: a.assignedBy || 'Admin CMS',
            is_active: true,
            jury_name: a.juryName || '',
            jury_email: a.juryEmail || '',
            jury_institution: a.juryInstitution || '',
          })
          .eq('id', existingId);

        if (!updRes.error) {
          saved = true;
        } else {
          const minUpd = await supabase
            .from('jury_assignments')
            .update({ is_active: true, assigned_by: a.assignedBy || 'Admin CMS' })
            .eq('id', existingId);
          if (!minUpd.error) saved = true;
        }
      }

      if (!saved) {
        // Pasangan kandidat dengan prioritas UUID valid untuk mencegah 22P02 "invalid input syntax for type uuid"
        const candidatePairs = [
          // 1. All-UUID (Paling aman untuk standar Supabase/PostgreSQL dengan tipe UUID)
          { id: stableAssignId, juryId: effectiveJuryUuid, compId: effectiveCompUuid },
          // 2. Auto ID (tanpa id eksplisit, kolom UUID)
          { id: undefined, juryId: effectiveJuryUuid, compId: effectiveCompUuid },
          // 3. Text schema (hanya jika juryId / compId bukan UUID)
          ...((!isUuid(a.juryId) || !isUuid(a.competitionId)) ? [
            { id: a.id, juryId: a.juryId, compId: a.competitionId },
            { id: stableAssignId, juryId: a.juryId, compId: a.competitionId },
          ] : [])
        ];

        let lastErr = '';
        for (const pair of candidatePairs) {
          if (saved) break;

          const basePayload: any = {
            jury_id: pair.juryId,
            competition_id: pair.compId,
            assigned_by: a.assignedBy || 'Admin CMS',
            is_active: true,
            created_at: a.createdAt || new Date().toISOString(),
          };
          if (pair.id) basePayload.id = pair.id;

          const fullPayload = {
            ...basePayload,
            competition_title: a.competitionTitle || '',
            competition_category: a.competitionCategory || '',
            jury_name: a.juryName || '',
            jury_email: a.juryEmail || '',
            jury_institution: a.juryInstitution || '',
          };

          const variants = [fullPayload, basePayload, { jury_id: pair.juryId, competition_id: pair.compId, is_active: true, ...(pair.id ? { id: pair.id } : {}) }];

          for (const variant of variants) {
            if (saved) break;

            const { error: insErr } = await supabase.from('jury_assignments').insert(variant as any);
            if (!insErr) {
              saved = true;
              break;
            }

            const em = (insErr.message || '').toLowerCase();
            // Pemulihan otomatis jika melanggar foreign key constraint jury_assignments_jury_id_fkey
            if (em.includes('jury_assignments_jury_id_fkey') || em.includes('violates foreign key')) {
              try {
                // 1. Cari profil juri di Supabase yang cocok dengan email / username / nama
                const { data: currentP } = await supabase.from('profiles').select('id, email, username, full_name');
                const matchedP = (currentP || []).find((cp: any) => {
                  if (a.juryEmail && cp.email && String(cp.email).toLowerCase().trim() === a.juryEmail.toLowerCase().trim()) return true;
                  if (cp.username && (String(cp.username).toLowerCase() === a.juryId.toLowerCase() || String(cp.username).toLowerCase() === (a.juryEmail?.split('@')[0] || ''))) return true;
                  if (a.juryName && cp.full_name && String(cp.full_name).toLowerCase().trim() === a.juryName.toLowerCase().trim()) return true;
                  return false;
                });
                if (matchedP?.id) {
                  const fixedVariant = { ...variant, jury_id: String(matchedP.id) };
                  const { error: fErr } = await supabase.from('jury_assignments').insert(fixedVariant);
                  if (!fErr) {
                    saved = true;
                    break;
                  }
                  const { error: fUpsErr } = await supabase.from('jury_assignments').upsert(fixedVariant, { onConflict: 'jury_id,competition_id' });
                  if (!fUpsErr) {
                    saved = true;
                    break;
                  }
                } else {
                  // 2. Jika belum ada profil di profiles, daftarkan segera dengan ensureJuryProfileInSupabase
                  const matchedPLocal = profiles.find((p) => p.id === a.juryId || (a.juryEmail && p.email?.toLowerCase() === a.juryEmail.toLowerCase()));
                  if (matchedPLocal) {
                    const ens = await ensureJuryProfileInSupabase(supabase, matchedPLocal);
                    if (ens.validJuryId) {
                      const fixedVariant = { ...variant, jury_id: ens.validJuryId };
                      const { error: fErr2 } = await supabase.from('jury_assignments').insert(fixedVariant);
                      if (!fErr2) {
                        saved = true;
                        break;
                      }
                    }
                  }
                }
              } catch {}
            }

            if (em.includes('unique') || em.includes('duplicate')) {
              const { error: updErr } = await supabase
                .from('jury_assignments')
                .update({ is_active: true, assigned_by: a.assignedBy || 'Admin CMS' })
                .eq('jury_id', pair.juryId)
                .eq('competition_id', pair.compId);
              if (!updErr) {
                saved = true;
                break;
              }
            }

            if (variant.id) {
              const { error: upsErr } = await supabase
                .from('jury_assignments')
                .upsert(variant as any, { onConflict: 'id' });
              if (!upsErr) {
                saved = true;
                break;
              }
            }

            const { error: upsJcErr } = await supabase
              .from('jury_assignments')
              .upsert(variant as any, { onConflict: 'jury_id,competition_id' });
            if (!upsJcErr) {
              saved = true;
              break;
            }

            const jcEm = (upsJcErr.message || '').toLowerCase();
            if (!em.includes('uuid') && !jcEm.includes('uuid')) {
              lastErr = insErr.message || upsJcErr.message;
            }
          }
        }

        if (saved) {
          aCount++;
        } else {
          let cleanErr = lastErr;
          if (lastErr.toLowerCase().includes('jury_assignments_jury_id_fkey') || lastErr.toLowerCase().includes('violates foreign key constraint') || lastErr.toLowerCase().includes('foreign key')) {
            hasForeignKeyError = true;
            cleanErr = `Foreign key lama terdeteksi pada tabel jury_assignments. Jalankan skrip di Supabase SQL Editor: ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;`;
          } else if (lastErr.toLowerCase().includes('uuid')) {
            cleanErr = 'Penyesuaian format ID di database';
          }
          syncErrors.push(`Penugasan (${a.juryName || a.juryId}): ${cleanErr || 'Gagal menyimpan ke tabel jury_assignments'}`);
        }
      } else {
        aCount++;
      }
    }

    // 3. Sync Criteria (Multi-kandidat skema: UUID, auto-id, fallback text)
    let cCount = 0;
    let remoteCriteriaList: any[] = [];
    try {
      const { data: dbCritRows } = await supabase.from('scoring_criteria').select('*');
      if (dbCritRows && dbCritRows.length > 0) {
        remoteCriteriaList = dbCritRows;
      }
    } catch {}

    for (const c of criteria) {
      let critSaved = false;
      const stableCritId = isUuid(c.id) ? c.id : getStableUuid(c.id);
      const knownRemoteCompId = remoteCompMap.get(c.competitionId.toLowerCase()) || remoteCompMap.get(normalizeCompId(c.competitionId).toLowerCase());
      const effectiveCompUuid = (knownRemoteCompId && isUuid(knownRemoteCompId)) ? knownRemoteCompId : (isUuid(c.competitionId) ? c.competitionId : getStableUuid(c.competitionId));
      const nowStr = new Date().toISOString();

      // 3a. Cari apakah kriteria sudah ada di remoteCriteriaList secara aman di memori
      let existingRemoteCritId: string | undefined = undefined;
      const existingCritRow = remoteCriteriaList.find((rc: any) => {
        const sid = String(rc.id);
        if (sid === c.id || sid === stableCritId) return true;
        const cName = rc.criterion_name || rc.name || '';
        const isNameMatch = cName.trim().toLowerCase() === c.criterionName.trim().toLowerCase();
        const rcComp = String(rc.competition_id || '');
        const isCompMatch =
          rcComp === c.competitionId ||
          rcComp === effectiveCompUuid ||
          normalizeCompId(rcComp) === normalizeCompId(c.competitionId);
        return isNameMatch && isCompMatch;
      });

      if (existingCritRow?.id) {
        existingRemoteCritId = String(existingCritRow.id);
      }

      // 3b. Jika sudah ada di remote, update baris tersebut (Aman tanpa manipulasi kolom ID)
      if (existingRemoteCritId) {
        const updatePayloads = [
          {
            criterion_name: c.criterionName,
            description: c.description || '',
            max_score: Number(c.maxScore) || 100,
            weight: Number(c.weight) || 25,
            sort_order: Number(c.sortOrder) || 1,
            is_active: c.isActive ?? true,
            updated_at: nowStr,
          },
          {
            criterion_name: c.criterionName,
            description: c.description || '',
            max_score: Number(c.maxScore) || 100,
            weight: Number(c.weight) || 25,
            sort_order: Number(c.sortOrder) || 1,
            is_active: c.isActive ?? true,
          },
          {
            name: c.criterionName,
            description: c.description || '',
            max_score: Number(c.maxScore) || 100,
            weight: Number(c.weight) || 25,
            sort_order: Number(c.sortOrder) || 1,
            is_active: c.isActive ?? true,
          },
          {
            criterion_name: c.criterionName,
            weight: Number(c.weight) || 25,
            max_score: Number(c.maxScore) || 100,
            is_active: c.isActive ?? true,
          },
        ];

        for (const up of updatePayloads) {
          const { error: updErr } = await supabase.from('scoring_criteria').update(up).eq('id', existingRemoteCritId);
          if (!updErr) {
            critSaved = true;
            break;
          }
        }
      }

      // 3c. Jika belum tersimpan, coba kandidat insert / upsert aman
      if (!critSaved) {
        const candidatePayloads = [
          // 1. Prioritas Utama: UUID ID + UUID Competition ID (Kompatibel PostgreSQL UUID & TEXT)
          {
            full: {
              id: stableCritId,
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
              updated_at: nowStr,
            },
            noUpdate: {
              id: stableCritId,
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
            },
            altName: {
              id: stableCritId,
              competition_id: effectiveCompUuid,
              name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
            },
            compact: {
              id: stableCritId,
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              weight: Number(c.weight) || 25,
              max_score: Number(c.maxScore) || 100,
              is_active: c.isActive ?? true,
            },
          },
          // 2. Auto ID (tanpa id) + UUID Competition ID
          {
            full: {
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
              updated_at: nowStr,
            },
            noUpdate: {
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
            },
            altName: {
              competition_id: effectiveCompUuid,
              name: c.criterionName,
              description: c.description || '',
              max_score: Number(c.maxScore) || 100,
              weight: Number(c.weight) || 25,
              sort_order: Number(c.sortOrder) || 1,
              is_active: c.isActive ?? true,
            },
            compact: {
              competition_id: effectiveCompUuid,
              criterion_name: c.criterionName,
              weight: Number(c.weight) || 25,
              max_score: Number(c.maxScore) || 100,
              is_active: c.isActive ?? true,
            },
          },
          // 3. Text schema (hanya jika c.competitionId bukan UUID)
          ...(!isUuid(c.competitionId) ? [
            {
              full: {
                id: c.id,
                competition_id: c.competitionId,
                criterion_name: c.criterionName,
                description: c.description || '',
                max_score: Number(c.maxScore) || 100,
                weight: Number(c.weight) || 25,
                sort_order: Number(c.sortOrder) || 1,
                is_active: c.isActive ?? true,
                updated_at: nowStr,
              },
              noUpdate: {
                id: c.id,
                competition_id: c.competitionId,
                criterion_name: c.criterionName,
                description: c.description || '',
                max_score: Number(c.maxScore) || 100,
                weight: Number(c.weight) || 25,
                sort_order: Number(c.sortOrder) || 1,
                is_active: c.isActive ?? true,
              },
              altName: {
                id: c.id,
                competition_id: c.competitionId,
                name: c.criterionName,
                description: c.description || '',
                max_score: Number(c.maxScore) || 100,
                weight: Number(c.weight) || 25,
                sort_order: Number(c.sortOrder) || 1,
                is_active: c.isActive ?? true,
              },
              compact: {
                id: c.id,
                competition_id: c.competitionId,
                criterion_name: c.criterionName,
                weight: Number(c.weight) || 25,
                max_score: Number(c.maxScore) || 100,
                is_active: c.isActive ?? true,
              },
            },
          ] : [])
        ];

        let lastCritErr = '';
        for (const opt of candidatePayloads) {
          if (critSaved) break;

          // 1. Coba INSERT langsung (full)
          const { error: insErr } = await supabase.from('scoring_criteria').insert(opt.full as any);
          if (!insErr) {
            critSaved = true;
            break;
          }

          const errMsg = (insErr.message || '').toLowerCase();
          if (errMsg.includes('unique') || errMsg.includes('duplicate')) {
            const { error: updDupErr } = await supabase
              .from('scoring_criteria')
              .update(opt.noUpdate as any)
              .eq('competition_id', (opt.full as any).competition_id)
              .ilike('criterion_name', c.criterionName);
            if (!updDupErr) {
              critSaved = true;
              break;
            }
          }

          // 2. Coba UPSERT berdasarkan id (jika memiliki id)
          if ((opt.full as any).id) {
            const { error: upsIdErr } = await supabase
              .from('scoring_criteria')
              .upsert(opt.full as any, { onConflict: 'id' });
            if (!upsIdErr) {
              critSaved = true;
              break;
            }

            // 3. Coba UPSERT tanpa updated_at
            const { error: upsNoUpdErr } = await supabase
              .from('scoring_criteria')
              .upsert(opt.noUpdate as any, { onConflict: 'id' });
            if (!upsNoUpdErr) {
              critSaved = true;
              break;
            }
          }

          // 4. Coba INSERT tanpa updated_at
          const { error: insNoUpdErr } = await supabase.from('scoring_criteria').insert(opt.noUpdate as any);
          if (!insNoUpdErr) {
            critSaved = true;
            break;
          }

          // 5. Coba dengan nama kolom 'name' alih-alih 'criterion_name'
          const { error: altNameErr } = await supabase.from('scoring_criteria').insert(opt.altName as any);
          if (!altNameErr) {
            critSaved = true;
            break;
          }

          // 6. Coba payload kompak
          const { error: compactErr } = await supabase.from('scoring_criteria').insert(opt.compact as any);
          if (!compactErr) {
            critSaved = true;
            break;
          }

          const emCombined = (insErr.message || insNoUpdErr?.message || altNameErr?.message || compactErr?.message || '').toLowerCase();
          if (!emCombined.includes('uuid')) {
            lastCritErr = insErr.message || insNoUpdErr?.message || altNameErr?.message;
          }
        }

        if (!critSaved) {
          const cleanErr = lastCritErr.toLowerCase().includes('uuid') ? 'Penyesuaian format ID di database' : lastCritErr;
          syncErrors.push(`Kriteria (${c.criterionName}): ${cleanErr || 'Gagal menyimpan ke tabel scoring_criteria'}`);
        }
      }

      if (critSaved) {
        cCount++;
      }
    }

    // 4. Sync Scores
    let sCount = 0;
    for (const s of scores) {
      if (isMockScore(s)) continue;
      const { error } = await supabase.from('jury_scores').upsert({
        id: s.id,
        competition_id: normalizeCompId(s.competitionId),
        participant_id: s.participantId,
        jury_id: s.juryId,
        scores: s.scores || {},
        total_score: s.totalScore || 0,
        notes: s.notes || '',
        status: s.status || 'draft',
        submitted_at: s.submittedAt || (s.status === 'submitted' ? new Date().toISOString() : null),
        updated_at: s.updatedAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (!error) sCount++;
      else syncErrors.push(`Nilai (${s.id}): ${error.message}`);
    }

    // 5. Sync Results
    let rCount = 0;
    for (const r of results) {
      const { error } = await supabase.from('competition_results').upsert({
        id: r.id || `res-${r.competitionId}-${r.participantId}`,
        competition_id: r.competitionId,
        participant_id: r.participantId,
        winner_title: r.winnerTitle,
        rank: r.rank,
        average_score: r.averageScore,
        final_score: r.finalScore,
        is_published: r.isPublished ?? false,
        decision_notes: r.decisionNotes || '',
        determined_at: r.determinedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (!error) rCount++;
      else syncErrors.push(`Hasil (${r.id}): ${error.message}`);
    }

    // Broadcast update to all connected clients
    notifyJuryDataChanged('all_jury_data_synced', {
      timestamp: Date.now(),
      details: { profiles: pCount, assignments: aCount, criteria: cCount, scores: sCount, results: rCount },
    });

    const isTotalSuccess = syncErrors.length === 0;
    const hasAnySuccess = pCount > 0 || aCount > 0 || cCount > 0 || sCount > 0 || rCount > 0;
    const hasAssignmentMismatch = activeAssignments.length > 0 && aCount < activeAssignments.length;

    let resultMsg = '';
    if (isTotalSuccess) {
      resultMsg = `Sinkronisasi ke Supabase berhasil: ${pCount} akun juri, ${aCount} penugasan, ${cCount} kriteria, ${sCount} lembar nilai, ${rCount} hasil juara tersimpan aman secara realtime.`;
    } else if (hasForeignKeyError && hasAssignmentMismatch) {
      resultMsg = `Perhatian: ${pCount} akun juri berhasil tersimpan, namun ${activeAssignments.length - aCount} penugasan juri belum tersimpan karena foreign key lama (jury_assignments_jury_id_fkey) di Supabase. Buka jendela perbaikan SQL untuk menyelesaikannya.`;
    } else if (hasAnySuccess) {
      resultMsg = `Sinkronisasi sebagian berhasil (${pCount} akun juri, ${aCount} penugasan, ${cCount} kriteria). Catatan: ${syncErrors.slice(0, 2).join('; ')}`;
    } else {
      resultMsg = `Gagal sinkronisasi data ke Supabase. Kemungkinan tabel-tabel database juri belum dibuat di Supabase (${syncErrors.slice(0, 2).join('; ')}). Harap jalankan Skrip SQL Setup Database Juri di Supabase SQL Editor.`;
    }

    return {
      success: isTotalSuccess || (hasAnySuccess && !hasAssignmentMismatch),
      message: resultMsg,
      details: {
        profiles: pCount,
        assignments: aCount,
        criteria: cCount,
        scores: sCount,
        results: rCount,
      },
      errors: syncErrors.length > 0 ? syncErrors : undefined,
      hasForeignKeyError,
      foreignKeyFixSql: JURY_FIX_FOREIGN_KEY_SQL,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal sinkronisasi data ke Supabase: ${err?.message || err}`,
    };
  }
}

/**
 * Unduh dan Segarkan Seluruh Data Juri dari Supabase ke State Lokal
 */
export async function fetchAllJuryDataFromSupabase(): Promise<{
  success: boolean;
  message: string;
  details?: {
    profiles: number;
    assignments: number;
    criteria: number;
    scores: number;
  };
}> {
  const supabase = getSupabaseClient();
  if (!isSupabaseConnected() || !supabase) {
    return {
      success: false,
      message: 'Koneksi database Supabase belum terkonfigurasi.',
    };
  }

  try {
    const pList = await getJuryProfiles();
    const [aList, cList, sList] = await Promise.all([
      getJuryAssignments(undefined, pList),
      getScoringCriteria(),
      getJuryScores(),
    ]);

    if (pList && pList.length > 0) setLocal(STORAGE_PROFILES, pList);
    if (aList && aList.length > 0) setLocal(STORAGE_ASSIGNMENTS, aList);
    if (cList && cList.length > 0) setLocal(STORAGE_CRITERIA, cList);
    if (sList && sList.length > 0) setLocal(STORAGE_SCORES, sList);

    notifyJuryDataChanged('all_jury_data_fetched', {
      timestamp: Date.now(),
      counts: { profiles: pList.length, assignments: aList.length, criteria: cList.length, scores: sList.length },
    });

    return {
      success: true,
      message: `Berhasil memuat data terkini dari Supabase: ${pList.length} juri, ${aList.length} penugasan, ${cList.length} kriteria, ${sList.length} nilai.`,
      details: {
        profiles: pList.length,
        assignments: aList.length,
        criteria: cList.length,
        scores: sList.length,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memuat data dari Supabase: ${err?.message || err}`,
    };
  }
}

/**
 * SKRIP SQL PEMBERSIHAN TOTAL DATA DUMMY / PENGUJIAN HSN 2026 DI SUPABASE
 */
export const PURGE_ALL_DUMMY_DATA_SQL = `-- ==============================================================================
-- SKRIP PEMBERSIHAN TOTAL DATA DUMMY / PENGUJIAN HSN 2026 DI SUPABASE
-- Kompatibel dengan semua tipe data (UUID, TEXT, VARCHAR) & bebas dari error operator!
-- Salin dan jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

DO $$ 
BEGIN
  -- 1. Hapus nilai juri dummy / penugasan uji coba (cast UUID ke TEXT dengan aman)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jury_scores') THEN
    BEGIN
      DELETE FROM public.jury_scores 
      WHERE participant_id::text LIKE 'reg-00%' 
         OR participant_id::text LIKE 'HSN-2026-00%'
         OR participant_id::text LIKE 'HSN26-%-000%'
         OR id::text LIKE '%dummy%' 
         OR id::text LIKE '%mock%' 
         OR id::text LIKE '%test%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan jury_scores: %', SQLERRM;
    END;
  END IF;

  -- 2. Hapus hasil juara dummy
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'competition_results') THEN
    BEGIN
      DELETE FROM public.competition_results 
      WHERE participant_id::text LIKE 'reg-00%' 
         OR participant_id::text LIKE 'HSN-2026-00%'
         OR participant_id::text LIKE 'HSN26-%-000%'
         OR id::text LIKE '%dummy%' 
         OR id::text LIKE '%mock%' 
         OR id::text LIKE '%test%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan competition_results: %', SQLERRM;
    END;
  END IF;

  -- 3. Hapus penugasan juri dummy / testing
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jury_assignments') THEN
    BEGIN
      DELETE FROM public.jury_assignments 
      WHERE id::text ~ '^assign-0[0-9]{2}$'
         OR id::text LIKE '%dummy%' 
         OR id::text LIKE '%mock%' 
         OR id::text LIKE '%test%'
         OR jury_id::text LIKE '%dummy%' 
         OR jury_id::text LIKE '%mock%'
         OR jury_id::text LIKE '00000000-0000-%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan jury_assignments: %', SQLERRM;
    END;
  END IF;

  -- 4. Hapus data peserta contoh awal di database
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participants') THEN
    BEGIN
      DELETE FROM public.participants 
      WHERE registration_number::text LIKE 'HSN-2026-00%' 
         OR registration_number::text LIKE 'HSN26-%-000%' 
         OR id::text LIKE 'reg-00%'
         OR LOWER(full_name::text) IN (
           'ahmad faiz al-hafidz',
           'siti nur khadijah',
           'rizki bayu pratama',
           'umi kalsum',
           'muhammad bilal ramadhan',
           'ahmad fauzi rabbani',
           'siti maryam azzahra',
           'm. rizqi maulana'
         );
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan participants: %', SQLERRM;
    END;
  END IF;

  -- 5. Hapus akun profil pengujian / mock jika ada
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    BEGIN
      DELETE FROM public.profiles 
      WHERE id::text LIKE '00000000-0000-%' 
         OR LOWER(email::text) LIKE '%test%jury%' 
         OR LOWER(email::text) LIKE '%mock%' 
         OR LOWER(email::text) LIKE '%dummy%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan profiles: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jury_profiles') THEN
    BEGIN
      DELETE FROM public.jury_profiles 
      WHERE id::text LIKE '00000000-0000-%' 
         OR LOWER(email::text) LIKE '%test%jury%' 
         OR LOWER(email::text) LIKE '%mock%' 
         OR LOWER(email::text) LIKE '%dummy%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan jury_profiles: %', SQLERRM;
    END;
  END IF;

  -- 6. Hapus kriteria uji coba dummy
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scoring_criteria') THEN
    BEGIN
      DELETE FROM public.scoring_criteria
      WHERE id::text LIKE '10000000-0000-%'
         OR criterion_name::text LIKE '%[DUMMY]%'
         OR criterion_name::text LIKE '%[TEST]%';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Catatan scoring_criteria: %', SQLERRM;
    END;
  END IF;
END $$;

-- 7. Muat ulang skema PostgREST
NOTIFY pgrst, 'reload schema';
`;

/**
 * Hapus seluruh data dummy / pengujian di CMS Penilaian Juri dan Supabase,
 * kemudian jalankan sinkronisasi penuh data resmi festival ke tabel Supabase.
 */
export async function purgeAllDummyDataAndSync(customCompetitions?: Competition[]): Promise<{
  success: boolean;
  message: string;
  clearedLocal: {
    scores: number;
    results: number;
    assignments: number;
    profiles: number;
  };
  clearedSupabase: {
    scores: number;
    results: number;
    assignments: number;
    participants: number;
    profiles: number;
  };
  syncDetails?: {
    profiles: number;
    assignments: number;
    criteria: number;
    scores: number;
    results: number;
  };
  hasForeignKeyError?: boolean;
}> {
  // 1. Bersihkan Data Lokal CMS Penilaian Juri
  const localScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  const cleanScores = localScores.filter((s) => !isMockScore(s));
  const removedScoresCount = localScores.length - cleanScores.length;
  setLocal(STORAGE_SCORES, cleanScores);

  const localResults = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);
  const cleanResults = localResults.filter((r) => {
    if (!r) return false;
    if (isInitialMockParticipant({ id: r.participantId })) return false;
    const pId = String(r.participantId || '').toLowerCase();
    const rId = String(r.id || '').toLowerCase();
    if (pId.startsWith('reg-00') || pId.startsWith('hsn-2026-00') || pId.startsWith('hsn26-')) return false;
    if (rId.includes('mock') || rId.includes('dummy') || rId.includes('test')) return false;
    return true;
  });
  const removedResultsCount = localResults.length - cleanResults.length;
  setLocal(STORAGE_RESULTS, cleanResults);

  const localAssignments = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const cleanAssignments = localAssignments.filter((a) => !isMockAssignment(a));
  const removedAssignmentsCount = localAssignments.length - cleanAssignments.length;
  setLocal(STORAGE_ASSIGNMENTS, cleanAssignments);

  const localProfiles = getLocal<UserProfile[]>(STORAGE_PROFILES, []);
  const cleanProfiles = localProfiles.filter((p) => {
    if (!p) return false;
    const id = String(p.id || '').toLowerCase();
    const email = String(p.email || '').toLowerCase();
    const name = String(p.fullName || '').toLowerCase();
    if (id.startsWith('00000000-0000-')) return false;
    if (email.includes('test_jury') || email.includes('mock') || email.includes('dummy')) return false;
    if (name.includes('[dummy]') || name.includes('[test]')) return false;
    return true;
  });
  const removedProfilesCount = localProfiles.length - cleanProfiles.length;
  setLocal(STORAGE_PROFILES, cleanProfiles);

  // Bersihkan data peserta dummy di localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const pKeys = ['hsn2026_participants', 'hsn2026_clean_participants', 'hsn2026_registered_participants'];
      for (const pk of pKeys) {
        const raw = localStorage.getItem(pk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((p: any) => !isInitialMockParticipant(p));
            localStorage.setItem(pk, JSON.stringify(cleaned));
          }
        }
      }
    } catch {}
  }

  // 2. Bersihkan Data Dummy di Supabase
  const supabase = getSupabaseClient();
  const connected = isSupabaseConnected() && Boolean(supabase);
  let sbScoresCount = 0;
  let sbResultsCount = 0;
  let sbAssignmentsCount = 0;
  let sbParticipantsCount = 0;
  let sbProfilesCount = 0;

  if (connected && supabase) {
    try {
      // Hapus nilai juri dummy (Ambil ID terlebih dahulu agar aman dari masalah tipe UUID vs TEXT)
      const { data: allScores } = await supabase.from('jury_scores').select('id, participant_id');
      const dummyScoreIds = (allScores || []).filter((s: any) => {
        const pId = String(s.participant_id || '').toLowerCase();
        const sId = String(s.id || '').toLowerCase();
        return pId.startsWith('reg-00') || pId.startsWith('hsn-2026-00') || pId.startsWith('hsn26-') || sId.includes('dummy') || sId.includes('mock') || sId.includes('test');
      }).map((s: any) => s.id);

      if (dummyScoreIds.length > 0) {
        const { data: delScores } = await supabase
          .from('jury_scores')
          .delete()
          .in('id', dummyScoreIds)
          .select('id');
        sbScoresCount = delScores?.length || dummyScoreIds.length;
      }
    } catch (e) {
      console.warn('Catatan hapus jury_scores Supabase:', e);
    }

    try {
      // Hapus hasil juara dummy
      const { data: allResults } = await supabase.from('competition_results').select('id, participant_id');
      const dummyResultIds = (allResults || []).filter((r: any) => {
        const pId = String(r.participant_id || '').toLowerCase();
        const rId = String(r.id || '').toLowerCase();
        return pId.startsWith('reg-00') || pId.startsWith('hsn-2026-00') || pId.startsWith('hsn26-') || rId.includes('dummy') || rId.includes('mock') || rId.includes('test');
      }).map((r: any) => r.id);

      if (dummyResultIds.length > 0) {
        const { data: delResults } = await supabase
          .from('competition_results')
          .delete()
          .in('id', dummyResultIds)
          .select('id');
        sbResultsCount = delResults?.length || dummyResultIds.length;
      }
    } catch (e) {
      console.warn('Catatan hapus competition_results Supabase:', e);
    }

    try {
      // Hapus penugasan dummy
      const { data: allAssigns } = await supabase.from('jury_assignments').select('id, jury_id');
      const dummyAssignIds = (allAssigns || []).filter((a: any) => {
        const aId = String(a.id || '').toLowerCase();
        const jId = String(a.jury_id || '').toLowerCase();
        return aId.startsWith('assign-0') || aId.includes('dummy') || aId.includes('mock') || aId.includes('test') || jId.includes('dummy') || jId.includes('mock') || jId.startsWith('00000000-0000-');
      }).map((a: any) => a.id);

      if (dummyAssignIds.length > 0) {
        const { data: delAssigns } = await supabase
          .from('jury_assignments')
          .delete()
          .in('id', dummyAssignIds)
          .select('id');
        sbAssignmentsCount = delAssigns?.length || dummyAssignIds.length;
      }
    } catch (e) {
      console.warn('Catatan hapus jury_assignments Supabase:', e);
    }

    try {
      // Hapus peserta dummy
      const pRes = await purgeMockParticipantsFromSupabase();
      sbParticipantsCount = pRes.count || 0;
    } catch (e) {
      console.warn('Catatan hapus participants Supabase:', e);
    }

    try {
      // Hapus profil pengujian dummy jika ada
      const { data: allProfs } = await supabase.from('profiles').select('id, email');
      const dummyProfIds = (allProfs || []).filter((p: any) => {
        const pId = String(p.id || '').toLowerCase();
        const email = String(p.email || '').toLowerCase();
        return pId.startsWith('00000000-0000-') || email.includes('test_jury') || email.includes('mock') || email.includes('dummy');
      }).map((p: any) => p.id);

      if (dummyProfIds.length > 0) {
        const { data: delProfs } = await supabase
          .from('profiles')
          .delete()
          .in('id', dummyProfIds)
          .select('id');
        sbProfilesCount = delProfs?.length || dummyProfIds.length;
      }
    } catch {}

    try {
      const { data: allJProfs } = await supabase.from('jury_profiles').select('id, email');
      const dummyJProfIds = (allJProfs || []).filter((p: any) => {
        const pId = String(p.id || '').toLowerCase();
        const email = String(p.email || '').toLowerCase();
        return pId.startsWith('00000000-0000-') || email.includes('test_jury') || email.includes('mock') || email.includes('dummy');
      }).map((p: any) => p.id);

      if (dummyJProfIds.length > 0) {
        await supabase
          .from('jury_profiles')
          .delete()
          .in('id', dummyJProfIds);
      }
    } catch {}
  }

  // 3. Sinkronisasikan Data Bersih CMS Penilaian Juri dengan Database Supabase
  const syncRes = await syncAllJuryDataToSupabase(customCompetitions);

  // 4. Siarkan notifikasi update ke seluruh tab aplikasi
  notifyJuryDataChanged('all_dummy_purged_and_synced', {
    timestamp: Date.now(),
    clearedLocal: { scores: removedScoresCount, results: removedResultsCount, assignments: removedAssignmentsCount, profiles: removedProfilesCount },
    clearedSupabase: { scores: sbScoresCount, results: sbResultsCount, assignments: sbAssignmentsCount, participants: sbParticipantsCount, profiles: sbProfilesCount },
    syncDetails: syncRes.details,
  });

  const totalLocalCleared = removedScoresCount + removedResultsCount + removedAssignmentsCount + removedProfilesCount;
  const totalSupabaseCleared = sbScoresCount + sbResultsCount + sbAssignmentsCount + sbParticipantsCount + sbProfilesCount;

  let finalMessage = `Pembersihan data dummy berhasil: ${totalLocalCleared} data dummy CMS & ${totalSupabaseCleared} baris dummy Supabase dibersihkan. ${syncRes.message}`;

  return {
    success: syncRes.success,
    message: finalMessage,
    clearedLocal: {
      scores: removedScoresCount,
      results: removedResultsCount,
      assignments: removedAssignmentsCount,
      profiles: removedProfilesCount,
    },
    clearedSupabase: {
      scores: sbScoresCount,
      results: sbResultsCount,
      assignments: sbAssignmentsCount,
      participants: sbParticipantsCount,
      profiles: sbProfilesCount,
    },
    syncDetails: syncRes.details,
    hasForeignKeyError: syncRes.hasForeignKeyError,
  };
}
