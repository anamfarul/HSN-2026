-- ==============================================================================
-- SEED DATA PENGUJIAN: CMS PENILAIAN JURI (DEV / TEST ENVIRONMENT ONLY)
-- FESTIVAL HARI SANTRI NASIONAL 2026 - MWC NU KECAMATAN PONCOKUSUMO
-- ==============================================================================
-- PERHATIAN: Script ini HANYA untuk pengujian di staging/development.
-- Tidak dijalankan otomatis di produksi.
-- ==============================================================================

-- 1. Contoh Akun Profil Juri (UUID simulasi atau UUID setelah akun auth dibuat di Supabase Auth)
-- Di produksi, buat user di Supabase Auth Dashboard terlebih dahulu, lalu masukkan id user ke profiles.

DO $$
DECLARE
  v_jury1_id UUID := '00000000-0000-0000-0000-000000000001';
  v_jury2_id UUID := '00000000-0000-0000-0000-000000000002';
  v_jury3_id UUID := '00000000-0000-0000-0000-000000000003';
  v_comp1 VARCHAR(50) := 'comp-poster-digital';
  v_comp2 VARCHAR(50) := 'comp-video-kreatif';
  v_crit_poster_1 UUID := '10000000-0000-0000-0000-000000000001';
  v_crit_poster_2 UUID := '10000000-0000-0000-0000-000000000002';
  v_crit_poster_3 UUID := '10000000-0000-0000-0000-000000000003';
  v_crit_poster_4 UUID := '10000000-0000-0000-0000-000000000004';
  v_crit_poster_5 UUID := '10000000-0000-0000-0000-000000000005';
BEGIN
  -- Insert kriteria Poster Digital (Total 100%)
  INSERT INTO public.scoring_criteria (id, competition_id, criterion_name, description, max_score, weight, sort_order)
  VALUES
    (v_crit_poster_1, 'comp-poster-digital', 'Kesesuaian Tema', 'Kesesuaian karya dengan tema Hari Santri 2026', 100, 25, 1),
    (v_crit_poster_2, 'comp-poster-digital', 'Kreativitas & Orisinalitas', 'Keunikan ide visual dan orisinalitas konsep', 100, 25, 2),
    (v_crit_poster_3, 'comp-poster-digital', 'Komposisi Visual', 'Tata letak, harmoni warna, tipografi, dan estetika', 100, 20, 3),
    (v_crit_poster_4, 'comp-poster-digital', 'Kejelasan Pesan', 'Kekuatan pesan dakwah santri yang tersampaikan', 100, 20, 4),
    (v_crit_poster_5, 'comp-poster-digital', 'Kualitas Teknis', 'Ketajaman resolusi, kerapian finishing grafis', 100, 10, 5)
  ON CONFLICT (id) DO NOTHING;

  -- Insert kriteria Video Kreatif (Total 100%)
  INSERT INTO public.scoring_criteria (competition_id, criterion_name, description, max_score, weight, sort_order)
  VALUES
    ('comp-video-kreatif', 'Kesesuaian Tema', 'Pesan nilai pesantren dan santri modern', 100, 20, 1),
    ('comp-video-kreatif', 'Kreativitas Ide Cerita', 'Alur cerita, keunikan narasi, sinematografi', 100, 25, 2),
    ('comp-video-kreatif', 'Alur & Kekuatan Pesan', 'Penyampaian amanat emosional dan inspiratif', 100, 20, 3),
    ('comp-video-kreatif', 'Kualitas Audio Visual', 'Kerapian editing, kejelasan audio, color grading', 100, 20, 4),
    ('comp-video-kreatif', 'Orisinalitas Karya', 'Keaslian footage dan bebas plagiarisme', 100, 15, 5)
  ON CONFLICT DO NOTHING;

END $$;
