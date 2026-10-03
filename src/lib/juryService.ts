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

// Storage keys for local fallback (v5: strictly synchronized with CMS Panitia Cabang Lomba)
const STORAGE_PROFILES = 'hsn2026_jury_profiles_v4';
const STORAGE_CRITERIA = 'hsn2026_scoring_criteria_v4';
const STORAGE_ASSIGNMENTS = 'hsn2026_jury_assignments_v5';
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

// Cleanup any old legacy storage keys to eliminate outdated / mismatched competitions
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'hsn2026_jury_assignments_list',
      'hsn2026_jury_assignments',
      'hsn2026_jury_assignments_v1',
      'hsn2026_jury_assignments_v2',
      'hsn2026_jury_assignments_v3',
      'hsn2026_jury_assignments_v4',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
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
// 1. LOCAL STORAGE HELPERS
// ==============================================================================
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

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
  if (isSupabaseConnected() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'jury')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data
          .filter((p) => !deletedIds.has(p.id))
          .map((p) => ({
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            role: p.role,
            institution: p.institution,
            phone: p.phone,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));
      }
    } catch {}
  }
  const localList = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);
  return localList.filter((p) => !deletedIds.has(p.id));
}

export async function saveJuryProfile(
  profile: Partial<UserProfile> & { fullName: string; email: string },
  adminName: string = 'Admin'
): Promise<{ success: boolean; data?: UserProfile; message?: string }> {
  const isNew = !profile.id;
  const id = profile.id || `jury-${Date.now()}`;
  const now = new Date().toISOString();

  const finalProfile: UserProfile = {
    id,
    fullName: profile.fullName.trim(),
    email: profile.email.trim().toLowerCase(),
    role: 'jury',
    institution: profile.institution?.trim() || 'MWC NU Poncokusumo',
    phone: profile.phone?.trim() || '',
    isActive: profile.isActive ?? true,
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

  // Supabase update
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('profiles').upsert({
        id: finalProfile.id,
        full_name: finalProfile.fullName,
        email: finalProfile.email,
        role: finalProfile.role,
        institution: finalProfile.institution,
        phone: finalProfile.phone,
        is_active: finalProfile.isActive,
        updated_at: now,
      });
    } catch (e: any) {
      console.warn('Supabase profile save error:', e?.message || e);
    }
  }

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
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      const { data, error } = await supabase
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

      if (!error && data && data.length > 0) {
        rawList = data.map((d: any) => ({
          id: d.id,
          juryId: d.jury_id,
          competitionId: d.competition_id,
          assignedBy: d.assigned_by,
          isActive: d.is_active,
          createdAt: d.created_at,
          juryName: d.profiles?.full_name,
          juryEmail: d.profiles?.email,
          juryInstitution: d.profiles?.institution,
          competitionTitle: d.competitions?.title,
          competitionCategory: d.competitions?.category,
        }));
      }
    } catch {}
  }

  if (rawList.length === 0) {
    rawList = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, INITIAL_JURY_ASSIGNMENTS);
  }

  // Filter out any explicitly deleted assignments and profiles
  const deletedAssignIds = new Set(getDeletedAssignmentIds());
  const deletedJuryIds = new Set(getDeletedProfileIds());
  rawList = rawList.filter((a) => !deletedAssignIds.has(a.id) && !deletedJuryIds.has(a.juryId));

  // Active competitions authoritative list from CMS Panitia
  const allComps = customCompetitions && customCompetitions.length > 0 ? customCompetitions : getAvailableCompetitions();
  const validCompMap = new Map(allComps.map((c) => [c.id, c]));
  const juries = getLocal<UserProfile[]>(STORAGE_PROFILES, INITIAL_JURY_PROFILES);

  // Self-heal and strictly sanitize assignments: ONLY keep assignments that belong to valid competitions in CMS Panitia!
  let normalizedList: JuryAssignment[] = rawList
    .map((a) => {
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

      const jury = juries.find((j) => j.id === a.juryId);
      return {
        ...a,
        competitionId: comp.id,
        competitionTitle: comp.title,
        competitionCategory: comp.category,
        juryName: jury?.fullName || a.juryName,
        juryEmail: jury?.email || a.juryEmail,
        juryInstitution: jury?.institution || a.juryInstitution,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Strictly deduplicate assignments by juryId + competitionId to avoid ghost duplicates
  const uniqueAssignMap = new Map<string, JuryAssignment>();
  for (const a of normalizedList) {
    const key = `${a.juryId}:${a.competitionId}`;
    if (!uniqueAssignMap.has(key)) {
      uniqueAssignMap.set(key, a);
    }
  }
  normalizedList = Array.from(uniqueAssignMap.values());

  // Only replenish from INITIAL_JURY_ASSIGNMENTS on first run if local storage was totally uninitialized
  const hasInitializedStorage = typeof window !== 'undefined' && localStorage.getItem(STORAGE_ASSIGNMENTS) !== null;
  if (!hasInitializedStorage && normalizedList.length === 0 && deletedAssignIds.size === 0) {
    allComps.forEach((comp) => {
      const initMatches = INITIAL_JURY_ASSIGNMENTS.filter((initA) => {
        return initA.competitionId === comp.id || resolveCompetition(allComps, initA.competitionId, initA.competitionTitle)?.id === comp.id;
      });
      if (initMatches.length > 0) {
        initMatches.forEach((m) => {
          normalizedList.push({
            ...m,
            competitionId: comp.id,
            competitionTitle: comp.title,
            competitionCategory: comp.category,
          });
        });
      }
    });
  }

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

  const exists = current.some((a) => {
    return a.juryId === juryId && a.competitionId === effectiveCompId && a.isActive;
  });

  if (exists) {
    return { success: false, message: 'Juri ini telah ditugaskan pada cabang lomba tersebut.' };
  }

  const juries = await getJuryProfiles();
  const matchedJury = juries.find((j) => j.id === juryId);

  const newAssignment: JuryAssignment = {
    id: `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    juryId,
    competitionId: effectiveCompId,
    isActive: true,
    juryName: matchedJury?.fullName,
    juryEmail: matchedJury?.email,
    juryInstitution: matchedJury?.institution,
    competitionTitle: effectiveCompTitle,
    competitionCategory: effectiveCompCat,
    createdAt: new Date().toISOString(),
  };

  const updated = [...current.filter((a) => !(a.juryId === juryId && a.competitionId === effectiveCompId)), newAssignment];
  setLocal(STORAGE_ASSIGNMENTS, updated);

  createAuditLog({
    action: 'ASSIGN_JURY',
    entityType: 'jury_assignment',
    entityId: newAssignment.id,
    newValue: newAssignment,
    notes: `Juri ${matchedJury?.fullName || juryId} ditugaskan pada lomba ${effectiveCompTitle} oleh: ${adminName}`,
  });

  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      await supabase.from('jury_assignments').upsert({
        jury_id: juryId,
        competition_id: effectiveCompId,
        is_active: true,
      }, { onConflict: 'jury_id,competition_id' });
    } catch {}
  }

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

  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, INITIAL_JURY_ASSIGNMENTS);
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
      await supabase.from('jury_assignments').delete().eq('id', assignmentId);
    } catch {}
  }

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
    } catch {}
  }

  return true;
}

export async function removeAllAssignmentsForJudge(
  juryId: string,
  adminName: string = 'Admin'
): Promise<boolean> {
  const current = getLocal<JuryAssignment[]>(STORAGE_ASSIGNMENTS, []);
  const isMatch = (a: JuryAssignment) => a.juryId === juryId;
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
    } catch {}
  }

  return true;
}

// ==============================================================================
// 6. SCORING CRITERIA SERVICE
// ==============================================================================
export async function getScoringCriteria(competitionId?: string): Promise<ScoringCriterion[]> {
  const deletedCriteria = new Set(getDeletedCriteriaIds());
  const normCompId = competitionId ? normalizeCompId(competitionId) : undefined;
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      let query = supabase.from('scoring_criteria').select('*').order('sort_order', { ascending: true });
      if (normCompId) {
        query = query.or(`competition_id.eq.${normCompId},competition_id.eq.${competitionId}`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data
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

  if (normCompId) {
    return normalizedAll.filter((c) => c.competitionId === normCompId || c.competitionId === competitionId);
  }
  return normalizedAll;
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
    competitionId: criterion.competitionId,
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
  const supabase = getSupabaseClient();
  if (isSupabaseConnected() && supabase) {
    try {
      let query = supabase.from('jury_scores').select('*');
      if (competitionId) query = query.eq('competition_id', competitionId);
      if (juryId) query = query.eq('jury_id', juryId);
      if (participantId) query = query.eq('participant_id', participantId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((s) => ({
          id: s.id,
          juryId: s.jury_id,
          participantId: s.participant_id,
          competitionId: s.competition_id,
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

  let list = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  if (competitionId) list = list.filter((s) => s.competitionId === competitionId);
  if (juryId) list = list.filter((s) => s.juryId === juryId);
  if (participantId) list = list.filter((s) => s.participantId === participantId);
  return list;
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
  const criteria = await getScoringCriteria(params.competitionId);
  const totalScore = calculateJuryTotal(params.scores, criteria);
  const now = new Date().toISOString();

  const allScores = getLocal<JuryScore[]>(STORAGE_SCORES, []);
  const existing = allScores.find(
    (s) =>
      s.juryId === params.juryId &&
      s.participantId === params.participantId &&
      s.competitionId === params.competitionId
  );

  if (existing && existing.status === 'locked') {
    return { success: false, message: 'Nilai telah dikunci oleh panitia dan tidak dapat diedit kembali.' };
  }

  const scoreRecord: JuryScore = {
    id: existing?.id || `score-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    juryId: params.juryId,
    participantId: params.participantId,
    competitionId: params.competitionId,
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
  const criteria = await getScoringCriteria(params.competitionId);
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
      s.competitionId === params.competitionId
  );

  if (existing && existing.status === 'locked') {
    return { success: false, message: 'Nilai telah dikunci dan tidak dapat diubah.' };
  }

  const finalScoreRecord: JuryScore = {
    id: existing?.id || `score-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    juryId: params.juryId,
    participantId: params.participantId,
    competitionId: params.competitionId,
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
  const compParticipants = participants.filter(
    (p) => p.competitionId === competitionId || p.competitionTitle?.toLowerCase() === competitionId.toLowerCase()
  );

  const assignments = await getJuryAssignments();
  const assignedJuries = assignments.filter((a) => a.competitionId === competitionId && a.isActive);
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
    const compParts = participants.filter(
      (p) => p.competitionId === comp.id || p.competitionTitle?.toLowerCase() === comp.title.toLowerCase()
    );
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
      const norm = normalizeCompId(s.competitionId);
      return norm === comp.id;
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
