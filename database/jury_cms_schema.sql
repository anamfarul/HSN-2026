-- ==============================================================================
-- DATABASE SCHEMA: CMS PENILAIAN JURI & PORTAL JURI
-- FESTIVAL HARI SANTRI NASIONAL 2026 - MWC NU KECAMATAN PONCOKUSUMO
-- TARGET PLATFORM: SUPABASE (PostgreSQL 15+)
-- ==============================================================================
-- File: database/jury_cms_schema.sql
-- Keterangan:
-- Migration idempotent untuk sistem penilaian juri lengkap dengan RBAC,
-- Row Level Security (RLS), Audit Logging, Kriteria Penilaian, dan Rekap Hasil.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. MIGRASI KOLOM PADA TABEL PARTICIPANTS (JIKA BELUM ADA)
-- ==============================================================================
ALTER TABLE IF EXISTS public.participants
  ADD COLUMN IF NOT EXISTS work_submission_type VARCHAR(20) DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS work_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS work_file_url TEXT,
  ADD COLUMN IF NOT EXISTS work_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS work_notes TEXT,
  ADD COLUMN IF NOT EXISTS work_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS work_description TEXT;

-- ==============================================================================
-- 3. TABEL 1: PROFILES (SUPER ADMIN, ADMIN, JURY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'jury',
  institution TEXT DEFAULT 'MWC NU Poncokusumo',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lepas foreign key lama profiles jika sebelumnya terhubung ke auth.users
DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- 4. TABEL 2: PENUGASAN JURI (JURY ASSIGNMENTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jury_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id UUID NOT NULL,
  competition_id VARCHAR(50) NOT NULL,
  competition_title TEXT,
  competition_category TEXT,
  jury_name TEXT,
  jury_email TEXT,
  jury_institution TEXT,
  assigned_by TEXT DEFAULT 'Admin CMS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_jury_competition UNIQUE (jury_id, competition_id)
);

-- Lepas foreign key lama jury_assignments jika sebelumnya merujuk ke profiles
DO $$ BEGIN
  ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;
  ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_competition_id_fkey;
  ALTER TABLE public.jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_assigned_by_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- 5. TABEL 3: KRITERIA PENILAIAN (SCORING CRITERIA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id VARCHAR(50) NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC NOT NULL DEFAULT 100 CHECK (max_score > 0),
  weight NUMERIC NOT NULL CHECK (weight > 0 AND weight <= 100), -- Persentase (%)
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABEL 4: PENILAIAN JURI (JURY SCORES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jury_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  competition_id VARCHAR(50) NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- contoh: {"crit_uuid_1": 85, "crit_uuid_2": 90}
  total_score NUMERIC NOT NULL DEFAULT 0,    -- Hasil akumulasi nilai berbobot
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'locked')),
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_jury_participant_comp UNIQUE (jury_id, participant_id, competition_id)
);

-- ==============================================================================
-- 7. TABEL 5: HASIL AKHIR & JUARA (COMPETITION RESULTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id VARCHAR(50) NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  average_score NUMERIC NOT NULL DEFAULT 0,
  final_score NUMERIC NOT NULL DEFAULT 0,
  rank INT,
  winner_title TEXT CHECK (winner_title IN ('Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1', 'Harapan 2', 'Juara Favorit') OR winner_title IS NULL),
  is_published BOOLEAN NOT NULL DEFAULT false,
  determined_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  determined_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comp_participant_result UNIQUE (competition_id, participant_id)
);

-- ==============================================================================
-- 8. TABEL 6: AUDIT LOG PENILAIAN (JURY AUDIT LOGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jury_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. INDEKS UNTUK KINERJA & FILTER CEPAT
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_jury_assign_jury ON public.jury_assignments(jury_id);
CREATE INDEX IF NOT EXISTS idx_jury_assign_comp ON public.jury_assignments(competition_id);
CREATE INDEX IF NOT EXISTS idx_criteria_comp ON public.scoring_criteria(competition_id);
CREATE INDEX IF NOT EXISTS idx_scores_jury ON public.jury_scores(jury_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant ON public.jury_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_comp ON public.jury_scores(competition_id);
CREATE INDEX IF NOT EXISTS idx_scores_status ON public.jury_scores(status);
CREATE INDEX IF NOT EXISTS idx_results_comp ON public.competition_results(competition_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.jury_audit_logs(created_at DESC);

-- ==============================================================================
-- 10. TRIGGER UPDATED_AT OTOMATIS
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_jury_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_jury_tables_updated_at();

DROP TRIGGER IF EXISTS trg_jury_assignments_updated_at ON public.jury_assignments;
CREATE TRIGGER trg_jury_assignments_updated_at
  BEFORE UPDATE ON public.jury_assignments
  FOR EACH ROW EXECUTE FUNCTION update_jury_tables_updated_at();

DROP TRIGGER IF EXISTS trg_scoring_criteria_updated_at ON public.scoring_criteria;
CREATE TRIGGER trg_scoring_criteria_updated_at
  BEFORE UPDATE ON public.scoring_criteria
  FOR EACH ROW EXECUTE FUNCTION update_jury_tables_updated_at();

DROP TRIGGER IF EXISTS trg_jury_scores_updated_at ON public.jury_scores;
CREATE TRIGGER trg_jury_scores_updated_at
  BEFORE UPDATE ON public.jury_scores
  FOR EACH ROW EXECUTE FUNCTION update_jury_tables_updated_at();

DROP TRIGGER IF EXISTS trg_competition_results_updated_at ON public.competition_results;
CREATE TRIGGER trg_competition_results_updated_at
  BEFORE UPDATE ON public.competition_results
  FOR EACH ROW EXECUTE FUNCTION update_jury_tables_updated_at();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Dapatkan peran pengguna saat ini dari profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function: Cek apakah user adalah super_admin atau admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 11.1. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS "Profiles insert update by admin" ON public.profiles;
CREATE POLICY "Profiles insert update by admin" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.is_admin_or_super() OR id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_super() OR id = auth.uid()
  );

-- 11.2. JURY ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Jury assignments read policy" ON public.jury_assignments;
CREATE POLICY "Jury assignments read policy" ON public.jury_assignments
  FOR SELECT TO authenticated
  USING (
    jury_id = auth.uid() OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS "Jury assignments manage by admin" ON public.jury_assignments;
CREATE POLICY "Jury assignments manage by admin" ON public.jury_assignments
  FOR ALL TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- 11.3. SCORING CRITERIA POLICIES
DROP POLICY IF EXISTS "Scoring criteria read policy" ON public.scoring_criteria;
CREATE POLICY "Scoring criteria read policy" ON public.scoring_criteria
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super() OR
    EXISTS (
      SELECT 1 FROM public.jury_assignments ja
      WHERE ja.jury_id = auth.uid()
        AND ja.competition_id = scoring_criteria.competition_id
        AND ja.is_active = true
    )
  );

DROP POLICY IF EXISTS "Scoring criteria manage by admin" ON public.scoring_criteria;
CREATE POLICY "Scoring criteria manage by admin" ON public.scoring_criteria
  FOR ALL TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- 11.4. JURY SCORES POLICIES (VERY CRUCIAL SECURITY)
-- Juri hanya membaca nilai miliknya sendiri, Admin dapat membaca seluruh nilai
DROP POLICY IF EXISTS "Jury scores read policy" ON public.jury_scores;
CREATE POLICY "Jury scores read policy" ON public.jury_scores
  FOR SELECT TO authenticated
  USING (
    jury_id = auth.uid() OR public.is_admin_or_super()
  );

-- Juri hanya dapat memasukkan nilai dengan jury_id = auth.uid()
DROP POLICY IF EXISTS "Jury scores insert policy" ON public.jury_scores;
CREATE POLICY "Jury scores insert policy" ON public.jury_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    jury_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.jury_assignments ja
      WHERE ja.jury_id = auth.uid()
        AND ja.competition_id = jury_scores.competition_id
        AND ja.is_active = true
    )
  );

-- Juri dapat mengupdate nilai miliknya HANYA jika status BUKAN 'locked'
DROP POLICY IF EXISTS "Jury scores update policy" ON public.jury_scores;
CREATE POLICY "Jury scores update policy" ON public.jury_scores
  FOR UPDATE TO authenticated
  USING (
    (jury_id = auth.uid() AND status != 'locked') OR public.is_admin_or_super()
  )
  WITH CHECK (
    (jury_id = auth.uid() AND status != 'locked') OR public.is_admin_or_super()
  );

-- 11.5. COMPETITION RESULTS POLICIES
DROP POLICY IF EXISTS "Results read policy" ON public.competition_results;
CREATE POLICY "Results read policy" ON public.competition_results
  FOR SELECT TO authenticated, anon
  USING (
    is_published = true OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS "Results manage by admin" ON public.competition_results;
CREATE POLICY "Results manage by admin" ON public.competition_results
  FOR ALL TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- 11.6. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Audit logs read by admin" ON public.jury_audit_logs;
CREATE POLICY "Audit logs read by admin" ON public.jury_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super());

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.jury_audit_logs;
CREATE POLICY "Audit logs insert policy" ON public.jury_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 12. RPC FUNCTION: HITUNG & REKAP NILAI REAL-TIME
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.calculate_jury_total_score(p_scores JSONB, p_competition_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC := 0;
  r RECORD;
  v_raw_score NUMERIC;
BEGIN
  FOR r IN 
    SELECT id, max_score, weight 
    FROM public.scoring_criteria 
    WHERE competition_id = p_competition_id AND is_active = true
  LOOP
    v_raw_score := COALESCE((p_scores->>r.id::text)::numeric, 0);
    IF v_raw_score > r.max_score THEN
      v_raw_score := r.max_score;
    END IF;
    IF v_raw_score < 0 THEN
      v_raw_score := 0;
    END IF;
    -- Rumus: (nilai juri / nilai maksimal) * bobot
    v_total := v_total + ((v_raw_score / r.max_score) * r.weight);
  END LOOP;
  RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger untuk memvalidasi & menghitung total_score di server secara terpercaya
CREATE OR REPLACE FUNCTION trg_calculate_jury_score_auto()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_score := public.calculate_jury_total_score(NEW.scores, NEW.competition_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jury_scores_auto_total ON public.jury_scores;
CREATE TRIGGER trg_jury_scores_auto_total
  BEFORE INSERT OR UPDATE OF scores ON public.jury_scores
  FOR EACH ROW EXECUTE FUNCTION trg_calculate_jury_score_auto();

-- Beritahukan postgREST untuk mereload schema
NOTIFY pgrst, 'reload schema';
