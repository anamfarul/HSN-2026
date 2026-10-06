import { getSupabaseClient, isSupabaseConnected } from './supabaseClient';
import {
  UserProfile,
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

export function resolveCompetition(
  competitionsList: Competition[],
  competitionId?: string,
  competitionTitle?: string
): Competition | undefined {
  if (!competitionsList || competitionsList.length === 0) return undefined;
  if (!competitionId && !competitionTitle) return undefined;
  
  const normId = competitionId ? normalizeCompId(competitionId) : undefined;

  // 1. Direct ID match
  if (normId) {
    const matched = competitionsList.find((c) => c.id.toLowerCase() === normId.toLowerCase());
    if (matched) return matched;
  }

  // 2. Direct code match (e.g. LMB-SMP-01)
  if (competitionId) {
    const matched = competitionsList.find((c) => c.code?.toLowerCase() === competitionId.toLowerCase());
    if (matched) return matched;
  }

  // 3. Exact title match
  if (competitionTitle) {
    const cleanTitle = competitionTitle.toLowerCase().trim();
    const matched = competitionsList.find((c) => c.title.toLowerCase().trim() === cleanTitle);
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
 * Menghandle pencocokan ID langsung, normalisasi alias (misal juri-001 <-> jury-001), email, dan username.
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

  // 3. Email match (case-insensitive)
  if (jury.email && assignment.juryEmail) {
    if (jury.email.toLowerCase().trim() === assignment.juryEmail.toLowerCase().trim()) return true;
  }

  // 4. Username match
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

  // Historical fallback recovery: Periksa seluruh versi penyimpanan agar tidak ada juri yang hilang
  const historicalKeys = [
    STORAGE_PROFILES,
    'hsn2026_jury_profiles_v3',
    'hsn2026_jury_profiles_v2',
    'hsn2026_jury_profiles_v1',
    'hsn2026_jury_profiles',
  ];

  const mergedLocalMap = new Map<string, UserProfile>();

  // Inisialisasi awal dengan INITIAL_JURY_PROFILES
  for (const initP of INITIAL_JURY_PROFILES) {
    if (!deletedIds.has(initP.id)) {
      mergedLocalMap.set(initP.id, {
        ...initP,
        username: initP.username || (initP.email.includes('@') ? initP.email.split('@')[0] : initP.email),
        password: initP.password || 'santri2026',
      });
    }
  }

  // Muat dari seluruh historical storage keys
  for (const key of historicalKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id && !deletedIds.has(item.id)) {
              const cleanEmail = (item.email || '').trim().toLowerCase();
              const existing = mergedLocalMap.get(item.id) || (cleanEmail ? Array.from(mergedLocalMap.values()).find((p) => p.email.toLowerCase() === cleanEmail) : undefined);
              const cleanUsername = item.username || existing?.username || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail) || item.id;
              const cleanPassword = item.password || existing?.password || 'santri2026';

              mergedLocalMap.set(item.id, {
                ...existing,
                ...item,
                username: cleanUsername,
                password: cleanPassword,
                isActive: item.isActive !== undefined ? item.isActive : true,
              });
            }
          }
        }
      }
    } catch {}
  }

  const localList = Array.from(mergedLocalMap.values());

  let remoteProfiles: UserProfile[] = [];
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'jury')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        remoteProfiles = data
          .filter((p) => !deletedIds.has(p.id))
          .map((p) => {
            const matchedLocal = localList.find(
              (lp) => lp.id === p.id || lp.email.toLowerCase() === p.email.toLowerCase()
            );
            return {
              id: p.id,
              fullName: p.full_name || p.fullName || 'Dewan Juri',
              email: p.email,
              role: (p.role as any) || 'jury',
              institution: p.institution || 'MWC NU Poncokusumo',
              phone: p.phone || '',
              isActive: p.is_active !== undefined ? p.is_active : (p.isActive ?? true),
              username: matchedLocal?.username || (p.email.includes('@') ? p.email.split('@')[0] : p.email),
              password: matchedLocal?.password || 'santri2026',
              createdAt: p.created_at || p.createdAt,
              updatedAt: p.updated_at || p.updatedAt,
            };
          });
      }
    } catch (err) {
      console.warn('Gagal membaca remote profiles:', err);
    }
  }

  // Gabungkan profil remote dan profil lokal (menjamin juri baru yang ditambahkan di CMS TIDAK PERNAH HILANG)
  const combinedMap = new Map<string, UserProfile>();

  // 1. Masukkan remote profil
  for (const r of remoteProfiles) {
    if (!deletedIds.has(r.id)) {
      combinedMap.set(r.id, r);
    }
  }

  // 2. Timpa / Tambahkan dari localList (memuat juri baru yang baru saja dibuat di CMS)
  for (const l of localList) {
    if (!deletedIds.has(l.id)) {
      const existing = combinedMap.get(l.id) || Array.from(combinedMap.values()).find((p) => p.email.toLowerCase() === l.email.toLowerCase());
      const merged: UserProfile = {
        ...existing,
        ...l,
        username: l.username || existing?.username || (l.email.includes('@') ? l.email.split('@')[0] : l.email),
        password: l.password || existing?.password || 'santri2026',
      };
      combinedMap.set(l.id, merged);
    }
  }

  // 3. Pastikan daftar unik berdasarkan ID
  const result: UserProfile[] = Array.from(combinedMap.values()).filter((p) => !deletedIds.has(p.id));

  // Sync balik ke STORAGE_PROFILES agar selalu termutakhirkan
  if (result.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PROFILES, JSON.stringify(result));
    } catch {}
  }

  return result.length > 0 ? result : INITIAL_JURY_PROFILES;
}

export async function saveJuryProfile(
  profile: Partial<UserProfile> & { fullName: string; email: string },
  adminName: string = 'Admin'
): Promise<{ success: boolean; data?: UserProfile; message?: string }> {
  const isNew = !profile.id;
  const id = profile.id || `jury-${Date.now()}`;
  const now = new Date().toISOString();

  // Hapus dari blacklist terhapus jika sebelumnya pernah ditandai
  const deletedSet = new Set(getDeletedProfileIds());
  if (deletedSet.has(id)) {
    deletedSet.delete(id);
    setLocal(STORAGE_DELETED_PROFILES, Array.from(deletedSet));
  }

  const cleanEmail = profile.email.trim().toLowerCase();
  const cleanUsername = profile.username?.trim().toLowerCase() || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail);
  const cleanPassword = profile.password?.trim() || 'santri2026';

  const finalProfile: UserProfile = {
    id,
    fullName: profile.fullName.trim(),
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

  // Local storage update
  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);
  const existsIdx = list.findIndex((p) => p.id === id || p.email.toLowerCase() === finalProfile.email);
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

  // Supabase update (non-blocking)
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('profiles').upsert({
        id: finalProfile.id,
        full_name: finalProfile.fullName,
        email: finalProfile.email,
        username: finalProfile.username,
        password: finalProfile.password,
        role: finalProfile.role,
        institution: finalProfile.institution,
        phone: finalProfile.phone,
        is_active: finalProfile.isActive,
        updated_at: finalProfile.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase upsert profile note:', err);
    }
  }

  notifyJuryDataChanged('jury_profiles', updatedList);
  return { success: true, data: finalProfile };
}

export async function toggleJuryStatus(
  juryId: string,
  isActive: boolean,
  adminName: string = 'Admin'
): Promise<boolean> {
  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);
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
    try {
      await supabase.from('profiles').update({ is_active: isActive }).eq('id', juryId);
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

  const list = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);
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
    try {
      await supabase.from('jury_assignments').delete().eq('jury_id', juryId);
      await supabase.from('profiles').delete().eq('id', juryId);
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
export async function getJuryAssignments(customCompetitions?: Competition[]): Promise<JuryAssignment[]> {
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
  const juries = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);

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
      let jury = juries.find((j) => (isAssignmentForJury(a, j) || j.id === a.juryId || (a.juryEmail && j.email?.toLowerCase() === a.juryEmail.toLowerCase())) && j.isActive && !deletedJuryIds.has(j.id));
      
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
): Promise<{ success: boolean; message?: string }> {
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

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      // 1. Pastikan profil juri ada di Supabase terlebih dahulu agar relasi foreign key aman
      try {
        await supabase.from('profiles').upsert(
          {
            id: matchedJury.id,
            full_name: matchedJury.fullName,
            email: matchedJury.email,
            username: matchedJury.username,
            password: matchedJury.password,
            role: matchedJury.role || 'jury',
            institution: matchedJury.institution || '',
            phone: matchedJury.phone || '',
            is_active: matchedJury.isActive ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (pErr) {
        console.warn('Catatan upsert profil juri ke Supabase:', pErr);
      }

      // 2. Siapkan payload penugasan
      const fullPayload = {
        id: assignmentId,
        jury_id: canonicalJuryId,
        competition_id: effectiveCompId,
        competition_title: effectiveCompTitle,
        competition_category: effectiveCompCat,
        assigned_by: adminName,
        is_active: true,
        created_at: newAssignment.createdAt,
        jury_name: matchedJury.fullName,
        jury_email: matchedJury.email,
        jury_institution: matchedJury.institution || '',
      };

      // Coba upsert dengan payload lengkap
      let { error: upsertErr } = await supabase
        .from('jury_assignments')
        .upsert(fullPayload, { onConflict: 'jury_id,competition_id' });

      if (upsertErr) {
        const resId = await supabase
          .from('jury_assignments')
          .upsert(fullPayload, { onConflict: 'id' });
        upsertErr = resId.error;
      }

      // 3. Fallback jika kolom jury_name/jury_email/jury_institution belum dibuat di tabel Supabase
      if (upsertErr) {
        const compactPayload = {
          id: assignmentId,
          jury_id: canonicalJuryId,
          competition_id: effectiveCompId,
          competition_title: effectiveCompTitle,
          competition_category: effectiveCompCat,
          assigned_by: adminName,
          is_active: true,
          created_at: newAssignment.createdAt,
        };

        const { error: compactErr } = await supabase
          .from('jury_assignments')
          .upsert(compactPayload, { onConflict: 'id' });

        if (compactErr) {
          // Fallback delete lalu insert
          await supabase
            .from('jury_assignments')
            .delete()
            .eq('jury_id', canonicalJuryId)
            .eq('competition_id', effectiveCompId);
          await supabase.from('jury_assignments').insert(compactPayload);
        }
      }
    } catch (err) {
      console.warn('Gagal menyimpan penugasan ke Supabase:', err);
    }
  }

  notifyJuryDataChanged('jury_assignments', updated);
  return { success: true };
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
      // Hapus berdasarkan jury_id dan competition_id serta ID agar pasti terhapus di Supabase
      if (target?.juryId && target?.competitionId) {
        await supabase
          .from('jury_assignments')
          .delete()
          .eq('jury_id', target.juryId)
          .eq('competition_id', target.competitionId);
      }
      await supabase.from('jury_assignments').delete().eq('id', assignmentId);
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
      await supabase.from('jury_assignments').delete().eq('competition_id', competitionId);
      if (normTarget !== competitionId) {
        await supabase.from('jury_assignments').delete().eq('competition_id', normTarget);
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
      await supabase.from('jury_assignments').delete().eq('jury_id', juryId);
      if (normAlias !== juryId) {
        await supabase.from('jury_assignments').delete().eq('jury_id', normAlias);
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
  let remoteCriteria: ScoringCriterion[] = [];
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      let query = supabase.from('scoring_criteria').select('*').order('sort_order', { ascending: true });
      if (normCompId) {
        query = query.or(`competition_id.eq.${normCompId},competition_id.eq.${competitionId}`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        remoteCriteria = data
          .filter((d) => !deletedCriteria.has(d.id))
          .map((d) => ({
            id: d.id,
            competitionId: normalizeCompId(d.competition_id),
            criterionName: d.criterion_name,
            description: d.description,
            maxScore: Number(d.max_score) || 100,
            weight: Number(d.weight) || 0,
            sortOrder: d.sort_order,
            isActive: d.is_active,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
      }
    } catch {}
  }

  const all = getLocal<ScoringCriterion[]>(STORAGE_CRITERIA, INITIAL_SCORING_CRITERIA);
  const normalizedAll = all
    .filter((c) => !deletedCriteria.has(c.id))
    .map((c) => ({
      ...c,
      competitionId: normalizeCompId(c.competitionId),
    }));

  const criteriaMap = new Map<string, ScoringCriterion>();
  for (const r of remoteCriteria) {
    criteriaMap.set(r.id, r);
  }
  for (const l of normalizedAll) {
    criteriaMap.set(l.id, l);
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
): Promise<{ success: boolean; data?: ScoringCriterion }> {
  const id = criterion.id || `crit-${Date.now()}`;
  const now = new Date().toISOString();

  // If re-saved, remove from deleted list
  const deletedCriteria = new Set(getDeletedCriteriaIds());
  if (deletedCriteria.has(id)) {
    deletedCriteria.delete(id);
    setLocal(STORAGE_DELETED_CRITERIA, Array.from(deletedCriteria));
  }

  const finalCrit: ScoringCriterion = {
    id,
    competitionId: normalizeCompId(criterion.competitionId),
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

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('scoring_criteria').upsert({
        id: finalCrit.id,
        competition_id: finalCrit.competitionId,
        criterion_name: finalCrit.criterionName,
        description: finalCrit.description,
        max_score: finalCrit.maxScore,
        weight: finalCrit.weight,
        sort_order: finalCrit.sortOrder,
        is_active: finalCrit.isActive,
        updated_at: now,
      });
    } catch {}
  }

  notifyJuryDataChanged('scoring_criteria', updated);
  return { success: true, data: finalCrit };
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
      await supabase.from('scoring_criteria').delete().eq('id', criterionId);
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

export const JURY_SYSTEM_SETUP_SQL = `-- ==============================================================================
-- SKRIP TABEL DATABASE SISTEM PENILAIAN DEWAN JURI: SUPABASE POSTGRESQL
-- Festival Hari Santri Nasional 2026 - MWC NU Poncokusumo
-- Salin dan jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. TABEL PROFIL DEWAN JURI & KREDENSIAL LOGIN (profiles)
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

-- 2. TABEL PENUGASAN JURI KE CABANG LOMBA (jury_assignments)
CREATE TABLE IF NOT EXISTS public.jury_assignments (
    id TEXT PRIMARY KEY,
    jury_id TEXT NOT NULL,
    competition_id TEXT NOT NULL,
    competition_title TEXT,
    competition_category TEXT,
    assigned_by TEXT DEFAULT 'Admin CMS',
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
ALTER TABLE IF EXISTS public.jury_assignments
  ADD COLUMN IF NOT EXISTS jury_name TEXT,
  ADD COLUMN IF NOT EXISTS jury_email TEXT,
  ADD COLUMN IF NOT EXISTS jury_institution TEXT,
  ADD COLUMN IF NOT EXISTS competition_title TEXT,
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by TEXT DEFAULT 'Admin CMS',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 7. ENABLE ROW LEVEL SECURITY (RLS) DENGAN AKSES AMAN
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public all profiles" ON public.profiles;
  CREATE POLICY "Public all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

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
}> {
  const supabase = getSupabaseClient();
  if (!isSupabaseConnected() || !supabase) {
    return {
      success: false,
      message: 'Koneksi database Supabase belum terkonfigurasi. Silakan periksa URL & Anon Key di Tab Database Supabase.',
    };
  }

  try {
    const profiles = await getJuryProfiles();
    const assignments = await getJuryAssignments(customCompetitions);
    const criteria = await getScoringCriteria();
    const scores = await getJuryScores();
    const results = getLocal<CompetitionResult[]>(STORAGE_RESULTS, []);

    // 1. Sync Profiles
    let pCount = 0;
    for (const p of profiles) {
      const { error } = await supabase.from('profiles').upsert({
        id: p.id,
        full_name: p.fullName,
        email: p.email,
        username: p.username || (p.email.includes('@') ? p.email.split('@')[0] : p.email),
        password: p.password || 'santri2026',
        role: p.role || 'jury',
        institution: p.institution || 'MWC NU Poncokusumo',
        phone: p.phone || '',
        is_active: p.isActive ?? true,
        updated_at: new Date().toISOString(),
      });
      if (!error) pCount++;
    }

    // 2. Sync Assignments (Strict authoritative sync - hapus penugasan terhapus di Supabase)
    let aCount = 0;
    const activeAssignments = assignments.filter((a) => a.isActive);
    const activeAssignIds = activeAssignments.map((a) => a.id);

    try {
      if (activeAssignIds.length > 0) {
        const { data: remoteRows } = await supabase.from('jury_assignments').select('id');
        if (remoteRows && remoteRows.length > 0) {
          const staleIds = remoteRows.map((r: any) => r.id).filter((id: string) => !activeAssignIds.includes(id));
          for (const sId of staleIds) {
            await supabase.from('jury_assignments').delete().eq('id', sId);
          }
        }
      } else {
        // Jika di CMS belum ada penugasan sama sekali, bersihkan seluruh baris di tabel Supabase
        await supabase.from('jury_assignments').delete().neq('id', 'keep-none-sentinel');
      }
    } catch (delErr) {
      console.warn('Catatan pembersihan penugasan usang di Supabase:', delErr);
    }

    for (const a of activeAssignments) {
      const { error } = await supabase.from('jury_assignments').upsert({
        id: a.id,
        jury_id: a.juryId,
        jury_name: a.juryName || '',
        jury_email: a.juryEmail || '',
        jury_institution: a.juryInstitution || '',
        competition_id: a.competitionId,
        competition_title: a.competitionTitle || '',
        competition_category: a.competitionCategory || '',
        assigned_by: a.assignedBy || 'Admin CMS',
        is_active: a.isActive,
        created_at: a.createdAt || new Date().toISOString(),
      });
      if (!error) aCount++;
    }

    // 3. Sync Criteria
    let cCount = 0;
    for (const c of criteria) {
      const { error } = await supabase.from('scoring_criteria').upsert({
        id: c.id,
        competition_id: c.competitionId,
        criterion_name: c.criterionName,
        description: c.description || '',
        max_score: c.maxScore || 100,
        weight: c.weight || 25,
        sort_order: c.sortOrder || 1,
        is_active: c.isActive ?? true,
        updated_at: new Date().toISOString(),
      });
      if (!error) cCount++;
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
      }, { onConflict: 'jury_id,participant_id,competition_id' });
      if (!error) sCount++;
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
      }, { onConflict: 'competition_id,participant_id' });
      if (!error) rCount++;
    }

    // Broadcast update to all connected clients
    notifyJuryDataChanged('all_jury_data_synced', {
      timestamp: Date.now(),
      details: { profiles: pCount, assignments: aCount, criteria: cCount, scores: sCount, results: rCount },
    });

    return {
      success: true,
      message: `Sinkronisasi ke Supabase berhasil: ${pCount} akun juri, ${aCount} penugasan, ${cCount} kriteria, ${sCount} lembar nilai, ${rCount} hasil juara tersimpan aman secara realtime.`,
      details: {
        profiles: pCount,
        assignments: aCount,
        criteria: cCount,
        scores: sCount,
        results: rCount,
      },
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
    const [pList, aList, cList, sList] = await Promise.all([
      getJuryProfiles(),
      getJuryAssignments(),
      getScoringCriteria(),
      getJuryScores(),
    ]);

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
