-- ==============================================================================
-- DATABASE SCHEMA: FESTIVAL HARI SANTRI NASIONAL 2026
-- MWC NU KECAMATAN PONCOKUSUMO, KABUPATEN MALANG
-- TARGET PLATFORM: SUPABASE (PostgreSQL 15+)
-- ==============================================================================
-- File: supabase_schema_hsn2026.sql
-- Keterangan:
-- Script ini dirancang khusus untuk dijalankan pada Supabase SQL Editor.
-- Mencakup: Extensions, Enums, Tables, Foreign Keys, Triggers,
-- Row Level Security (RLS) Policies, dan Seed Data awal.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Hapus tabel galeri jika ada di database (permintaan penghapusan fitur galeri)
DROP TABLE IF EXISTS gallery_items CASCADE;

-- ==============================================================================
-- 1.1. MIGRASI & PERBAIKAN KOLOM DATABASE LAMA (IDEMPOTENT MIGRATION)
-- ==============================================================================
ALTER TABLE IF EXISTS public.competitions 
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(150),
  ADD COLUMN IF NOT EXISTS technical_meeting VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
  ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS juknis_url TEXT,
  ADD COLUMN IF NOT EXISTS juknis_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS public.participants 
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- 2. CUSTOM ENUM TYPES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE category_generation_enum AS ENUM (
      'PAUD/TK',
      'SD/MI',
      'SMP/MTs',
      'SMA/MA/SMK',
      'IPNU/IPPNU',
      'FATAYAT',
      'MUSLIMAT',
      'UMUM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_status_enum AS ENUM (
      'Menunggu Verifikasi',
      'Terverifikasi',
      'Ditolak',
      'Finalis'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sponsor_tier_enum AS ENUM (
      'Platinum',
      'Gold',
      'Silver',
      'Media Partner',
      'Pendukung'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timeline_status_enum AS ENUM (
      'completed',
      'current',
      'upcoming'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. HELPER FUNCTION FOR TRIGGER UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. TABLE CREATION
-- ==============================================================================

-- 4.1. Tabel Statistik Festival
CREATE TABLE IF NOT EXISTS festival_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    klaster_program INT NOT NULL DEFAULT 7,
    total_kegiatan INT NOT NULL DEFAULT 30,
    total_peserta INT NOT NULL DEFAULT 1000,
    total_lembaga INT NOT NULL DEFAULT 20,
    total_pengunjung INT NOT NULL DEFAULT 5400,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2. Tabel 5 Pilar Santri Masa Depan
CREATE TABLE IF NOT EXISTS five_pillars (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(10) NOT NULL,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    glow_color VARCHAR(30) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3. Tabel Klaster Program Generasi (PAUD hingga Muslimat NU)
CREATE TABLE IF NOT EXISTS generation_programs (
    id VARCHAR(50) PRIMARY KEY,
    card_number VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    category category_generation_enum NOT NULL,
    badge VARCHAR(100) NOT NULL,
    programs JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT NOT NULL,
    objective TEXT NOT NULL,
    participant_target TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    accent_color VARCHAR(30) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4. Tabel Program Unggulan (Signature Programs)
CREATE TABLE IF NOT EXISTS signature_programs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    event_date VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5. Tabel Cabang Lomba (Competitions)
CREATE TABLE IF NOT EXISTS competitions (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category category_generation_enum NOT NULL,
    target_audience VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    prizes JSONB NOT NULL DEFAULT '{}'::jsonb,
    registration_fee VARCHAR(50) NOT NULL DEFAULT 'Gratis',
    registration_deadline VARCHAR(100) NOT NULL,
    technical_meeting VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    juknis_url TEXT,
    juknis_file_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.6. Tabel Pendaftaran Peserta (Registrations)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    institution VARCHAR(200) NOT NULL,
    category category_generation_enum NOT NULL,
    birth_date DATE,
    whatsapp VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    address TEXT NOT NULL,
    competition_id VARCHAR(50),
    competition_title VARCHAR(150) NOT NULL,
    document_url TEXT,
    document_name VARCHAR(255),
    payment_proof_url TEXT,
    payment_proof_name VARCHAR(255),
    status registration_status_enum NOT NULL DEFAULT 'Menunggu Verifikasi',
    notes TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7. Tabel Linimasa & Tahapan Acara (Event Timeline)
CREATE TABLE IF NOT EXISTS event_timeline (
    id VARCHAR(50) PRIMARY KEY,
    period VARCHAR(100) NOT NULL,
    title VARCHAR(150) NOT NULL,
    status timeline_status_enum NOT NULL DEFAULT 'upcoming',
    description TEXT NOT NULL,
    is_highlight BOOLEAN NOT NULL DEFAULT false,
    activities JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8. Tabel Dokumen Unduhan / Arsip (Download Center)
CREATE TABLE IF NOT EXISTS download_documents (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_size VARCHAR(30) NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    file_url TEXT,
    description TEXT NOT NULL,
    download_count INT NOT NULL DEFAULT 0,
    last_updated VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.10. Tabel Warta & Berita Santri (News Articles)
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(150) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    published_date DATE NOT NULL DEFAULT CURRENT_DATE,
    author VARCHAR(100) NOT NULL DEFAULT 'Humas MWC NU Poncokusumo',
    read_time VARCHAR(20) NOT NULL DEFAULT '3 min baca',
    thumbnail_url TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    views_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.11. Tabel Mitra & Sponsor
CREATE TABLE IF NOT EXISTS sponsors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tier sponsor_tier_enum NOT NULL,
    logo_url TEXT,
    contribution VARCHAR(100) NOT NULL,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.12. Tabel Pesan Kontak & Aspirasi Warga
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(25) NOT NULL,
    institution VARCHAR(150),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. AUTOMATED TRIGGERS FOR UPDATED_AT
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_competitions_updated_at ON competitions;
CREATE TRIGGER trg_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_participants_updated_at ON participants;
CREATE TRIGGER trg_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_download_documents_updated_at ON download_documents;
CREATE TRIGGER trg_download_documents_updated_at
    BEFORE UPDATE ON download_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON news_articles;
CREATE TRIGGER trg_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_participants_comp_id ON participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_participants_reg_num ON participants(registration_number);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_category ON participants(category);
CREATE INDEX IF NOT EXISTS idx_competitions_category ON competitions(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- ==============================================================================
-- 7. SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE festival_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE five_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 7.1. Public Read Policies (Semua Pengunjung Web Bisa Melihat Konten Publik)
CREATE POLICY "Public read festival_stats" ON festival_stats FOR SELECT USING (true);
CREATE POLICY "Public read five_pillars" ON five_pillars FOR SELECT USING (true);
CREATE POLICY "Public read generation_programs" ON generation_programs FOR SELECT USING (true);
CREATE POLICY "Public read signature_programs" ON signature_programs FOR SELECT USING (true);
CREATE POLICY "Public read event_timeline" ON event_timeline FOR SELECT USING (true);
CREATE POLICY "Public read news_articles" ON news_articles FOR SELECT USING (true);
CREATE POLICY "Public read sponsors" ON sponsors FOR SELECT USING (true);

-- 7.2. Pendaftaran Peserta (Akses Penuh: Publik Insert & Admin Verifikasi/Hapus)
DROP POLICY IF EXISTS "Public can register participant" ON participants;
DROP POLICY IF EXISTS "Public can view participants" ON participants;
DROP POLICY IF EXISTS "Public all participants" ON participants;
CREATE POLICY "Public all participants" ON participants
    FOR ALL USING (true) WITH CHECK (true);

-- 7.3. Cabang Lomba (Akses Penuh: Publik Baca & Admin CMS Sinkronisasi/Edit)
DROP POLICY IF EXISTS "Public read competitions" ON competitions;
DROP POLICY IF EXISTS "Public all competitions" ON competitions;
CREATE POLICY "Public all competitions" ON competitions
    FOR ALL USING (true) WITH CHECK (true);

-- 7.4. Form Kontak & Aspirasi
DROP POLICY IF EXISTS "Public can submit contact message" ON contact_messages;
DROP POLICY IF EXISTS "Public all contact_messages" ON contact_messages;
CREATE POLICY "Public all contact_messages" ON contact_messages
    FOR ALL USING (true) WITH CHECK (true);

-- 7.5. Dokumen Unduhan (Akses Publik)
DROP POLICY IF EXISTS "Public read download_documents" ON download_documents;
DROP POLICY IF EXISTS "Public all download_documents" ON download_documents;
CREATE POLICY "Public all download_documents" ON download_documents
    FOR ALL USING (true) WITH CHECK (true);

-- 7.6. Setup Supabase Storage Bucket 'registrations' (Untuk Bukti Pembayaran & Mandat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('registrations', 'registrations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public upload registrations" ON storage.objects;
DROP POLICY IF EXISTS "Public select registrations" ON storage.objects;
DROP POLICY IF EXISTS "Public update registrations" ON storage.objects;

CREATE POLICY "Public upload registrations" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'registrations');

CREATE POLICY "Public select registrations" ON storage.objects
    FOR SELECT USING (bucket_id = 'registrations');

CREATE POLICY "Public update registrations" ON storage.objects
    FOR UPDATE USING (bucket_id = 'registrations') WITH CHECK (bucket_id = 'registrations');

-- ==============================================================================
-- 8. INITIAL SEED DATA (DATA AWAL DARI APLIKASI HSN 2026)
-- ==============================================================================

-- 8.1. Seed Data Statistik
INSERT INTO festival_stats (klaster_program, total_kegiatan, total_peserta, total_lembaga, total_pengunjung)
VALUES (7, 30, 1000, 20, 5400)
ON CONFLICT DO NOTHING;

-- 8.2. Seed Data 5 Pilar Santri Masa Depan
INSERT INTO five_pillars (id, number, title, subtitle, description, icon_name, glow_color, badge, sort_order)
VALUES
('pillar-1', '01', 'BERAKHLAK', 'Tawadhu & Integritas Santri', 'Akhlakul karimah sebagai fondasi utama kehidupan pribadi, sosial, dan berbangsa di tengah disrupsi zaman.', 'HeartHandshake', '#006B4F', 'Fondasi Utama', 1),
('pillar-2', '02', 'BERILMU', 'Kajian Turats & Sains Modern', 'Ilmu sebagai jalan menuju kemajuan, memadukan kedalaman kitab kuning dengan kecerdasan sains masa depan.', 'BookOpen', '#008F72', 'Kecerdasan Spiritual & Rasional', 2),
('pillar-3', '03', 'BERBUDAYA', 'Kearifan Lokal Nusantara', 'Merawat identitas, kearifan lokal, dan tradisi luhur Islam Nusantara yang toleran, damai, dan membumi.', 'Sparkles', '#D9B45B', 'Jati Diri Bangsa', 3),
('pillar-4', '04', 'BERDIGITAL', 'Kecakapan Cyber & AI', 'Menguasai teknologi kecerdasan artifisial, komputasi, dan ekosistem digital secara bijak, etis, dan bertanggung jawab.', 'Cpu', '#00D9F5', 'Akselerasi Teknologi', 4),
('pillar-5', '05', 'MENDUNIA', 'Diplomasi Peradaban Global', 'Berkarya nyata dari bilik pesantren di lereng Bromo-Semeru menuju panggung peradaban dan jejaring global.', 'Globe', '#F2C96D', 'Visi Global', 5)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description;

-- 8.3. Seed Data Klaster Program Generasi
INSERT INTO generation_programs (id, card_number, title, category, badge, programs, description, objective, participant_target, icon_name, accent_color, sort_order)
VALUES
('gen-1', 'CARD 01', 'SANTRI CILIK BERBUDAYA', 'PAUD/TK', 'Tunas Pesantren', '["Permainan Tradisional Santri Nusantara", "Lomba Mewarnai Kaligrafi Cilik", "Festival Dongeng Kisah Sahabat"]'::jsonb, 'Menumbuhkan kecintaan terhadap nilai budi pekerti Islam Nusantara dan melestarikan dolanan tradisional sejak usia dini.', 'Membangun motorik, sosialisasi, dan karakter akhlakul karimah anak berbasis kehangatan budaya lokal.', 'Siswa-siswi PAUD, RA, dan TK se-Kecamatan Poncokusumo', 'Smile', '#00D9F5', 1),
('gen-2', 'CARD 02', 'SANTRI KREATIF BERKARYA', 'SD/MI', 'Generasi Pencerah', '["Video Konten Kreatif Hari Santri", "Musabaqah Hifdzil Quran Cilik", "Olimpiade Aswaja Anak Saleh"]'::jsonb, 'Ruang kreasi audiovisual anak-anak madrasah ibtidaiyah dan sekolah dasar dalam mengekspresikan kebanggaan menjadi santri Indonesia.', 'Mengasah kreativitas bercerita digital serta pemahaman agama santun sejak dini.', 'Peserta didik SD / MI negeri dan swasta se-Kecamatan Poncokusumo', 'Video', '#008F72', 2),
('gen-3', 'CARD 03', 'SANTRI DIGITAL', 'SMP/MTs', 'Pionir Teknologi', '["Kompetisi Desain Poster Digital", "Turnamen Sepak Bola Santri Cup", "Workshop Literasi Digital Cerdas"]'::jsonb, 'Kombinasi harmonis antara kebugaran fisik melalui olahraga sepak bola dan kecakapan kreasi visual grafis berbasis teknologi.', 'Menumbuhkan sportivitas persaudaraan dan keterampilan teknis desain grafis yang bernafaskan dakwah sejuk.', 'Pelajar SMP & MTs se-Kecamatan Poncokusumo', 'Smartphone', '#00D9F5', 3),
('gen-4', 'CARD 04', 'SANTRI INOVATIF', 'SMA/MA/SMK', 'Arsitek Masa Depan', '["Pidato 3 Bahasa (Arab, Inggris, Jawa)", "Lomba Cerdas Cermat Aswaja & Sains", "Hackathon Inovasi Santri Milenial"]'::jsonb, 'Ajang adu gagasan intelektual, kecakapan diplomasi multibahasa internasional, dan penguasaan sains Aswaja kontemporer.', 'Mencetak kader santri komunikator peradaban yang berwawasan luas dan berdaya saing global.', 'Siswa MA, SMA, SMK dan santri pondok pesantren usia remaja', 'Award', '#F2C96D', 4),
('gen-5', 'CARD 05', 'KADER PENGGERAK', 'IPNU/IPPNU', 'Pilar Organisasi', '["Bakti Sosial Pelajar Santri Peduli", "Pelatihan Kepemimpinan Digital & AI", "Festival Seni Hadrah Kontemporer"]'::jsonb, 'Pemberdayaan kader muda Nahdlatul Ulama dalam kepemimpinan transformatif, pengabdian masyarakat desa, dan seni religi.', 'Mengokohkan militansi organisasi, kapasitas manajerial, dan kepekaan sosial generasi penerus.', 'Kader Pimpinan Ranting dan Komisariat IPNU-IPPNU Poncokusumo', 'Users', '#008F72', 5),
('gen-6', 'CARD 06', 'PEREMPUAN BERDAYA', 'FATAYAT', 'Ketahanan Umat', '["Lomba Masak Olahan Halal Lokal", "Workshop Digital Marketing Muslimah", "Seminar Parenting Santri Cerdas"]'::jsonb, 'Penguatan ketahanan keluarga, pemberdayaan ekonomi perempuan mandiri, dan kemahiran wirausaha digital berbasis potensi desa.', 'Mencetak muslimah visioner yang tangguh mengawal pendidikan keluarga dan ketahanan ekonomi umat.', 'Sahabat Fatayat NU tingkat Ranting dan PAC Poncokusumo', 'Heart', '#D9B45B', 6),
('gen-7', 'CARD 07', 'PENJAGA TRADISI', 'MUSLIMAT', 'Pilar Doa & Barokah', '["Lomba Paduan Suara Mars HSN & Syubbanul Wathon", "Khotmil Quran Kubro 100 Majelis", "Bazar Kuliner Tradisional Barokah"]'::jsonb, 'Untaian doa agung, khidmat pelestarian lantunan syiar Aswaja, dan silaturahmi akbar ibu-ibu penggerak majelis taklim.', 'Mengharap barokah para muassis NU untuk keselamatan bangsa dan kesejahteraan masyarakat Poncokusumo.', 'Ibu-ibu Jamiyyah Muslimat NU Poncokusumo dan Majelis Taklim', 'Sparkles', '#006B4F', 7)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    programs = EXCLUDED.programs,
    description = EXCLUDED.description;

-- 8.4. Seed Data Cabang Lomba (Competitions)
INSERT INTO competitions (id, code, title, category, target_audience, description, rules, prizes, registration_fee, registration_deadline, technical_meeting, location, contact_person, icon_name, is_active)
VALUES
(
  'comp-1',
  'LMB-PAUD-01',
  'Permainan Tradisional Santri Nusantara',
  'PAUD/TK',
  'Anak Usia 4-6 Tahun (PAUD/TK/RA)',
  'Kompetisi regu dolanan tradisional (engklek, bakiak santri ceria, dakon nusantara) yang menanamkan keakraban dan keceriaan alami.',
  '["Setiap lembaga mengirimkan maksimal 2 tim beranggotakan 4 anak", "Peserta mengenakan busana muslim/muslimah santri santun atau adat nusantara", "Penilaian meliputi kekompakan, kegembiraan, ketepatan, dan etika kesantunan", "Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat"]'::jsonb,
  '{"first": "Trofi Juara I + Piagam MWC NU + Uang Pembinaan", "second": "Trofi Juara II + Piagam MWC NU + Uang Pembinaan", "third": "Trofi Juara III + Piagam MWC NU + Uang Pembinaan", "all": "E-Sertifikat untuk seluruh peserta cilik"}'::jsonb,
  'Gratis (Didukung Penuh MWC NU)',
  '10 Oktober 2026',
  '12 Oktober 2026 • 09.00 WIB (Kantor MWC NU)',
  'Halaman Gedung MWC NU Poncokusumo',
  'Panitia Cabang PAUD/TK (0812-3456-7890)',
  'Smile',
  true
),
(
  'comp-2',
  'LMB-SD-01',
  'Lomba Video Konten Kreatif Hari Santri',
  'SD/MI',
  'Siswa SD / MI sederajat',
  'Pembuatan video pendek kreatif durasi 60-90 detik bertema "Bangga Menjadi Santri Cilik Indonesia" untuk platform Instagram Reels / TikTok.',
  '["Karya orisinal buatan siswa dengan pendampingan guru/orang tua", "Format video vertikal (9:16) resolusi minimal Full HD 1080p", "Menggunakan audio bebas hak cipta atau sholawat nusantara", "Wajib menyertakan tagar #HSN2026Poncokusumo #SantriKreatifNusantara"]'::jsonb,
  '{"first": "Piala Bergilir + Piagam + Uang Pembinaan", "second": "Piala + Piagam + Uang Pembinaan", "third": "Piala + Piagam + Uang Pembinaan", "all": "E-Sertifikat dan tayang di panggung Santri Expo"}'::jsonb,
  'Gratis',
  '12 Oktober 2026',
  '05 Oktober 2026 (Online via Zoom)',
  'Pengumpulan Karya Daring (Online)',
  'Panitia Cabang SD/MI (0821-9876-5432)',
  'Video',
  true
),
(
  'comp-3',
  'LMB-SMP-01',
  'Kompetisi Desain Poster Digital',
  'SMP/MTs',
  'Pelajar SMP/MTs sederajat',
  'Lomba karya visual grafis dengan tema utama "Mengawal Indonesia Merdeka Menuju Peradaban Dunia" menggunakan Canva/Photoshop/Illustrator.',
  '["Karya individu orisinal, belum pernah memenangkan kompetisi sejenis", "Mengintegrasikan unsur ornamen Islam Nusantara dan sentuhan futuristik", "Format file JPG/PNG dan file mentah/proyek beresolusi tinggi", "Karya dinilai berdasarkan orisinalitas, kesesuaian tema, komposisi warna, dan pesan visual"]'::jsonb,
  '{"first": "Trofi Juara I + Sertifikat Nasional + Uang Pembinaan", "second": "Trofi Juara II + Sertifikat Nasional + Uang Pembinaan", "third": "Trofi Juara III + Sertifikat Nasional + Uang Pembinaan"}'::jsonb,
  'Gratis',
  '14 Oktober 2026',
  '08 Oktober 2026',
  'Gedung Lab Komputer SMP/MTs Mitra Poncokusumo',
  'Panitia Cabang Desain Poster (0857-1122-3344)',
  'Smartphone',
  true
),
(
  'comp-4',
  'LMB-SMP-02',
  'Turnamen Sepak Bola Santri Cup 2026',
  'SMP/MTs',
  'Tim Pelajar SMP/MTs & Pesantren se-Poncokusumo',
  'Kejuaraan sepak bola mini lapangan terbuka yang mengedepankan sportivitas, akhlak mulia di lapangan, dan persaudaraan santri.',
  '["Setiap tim terdiri atas 7 pemain inti dan 5 pemain cadangan", "Pemain terdaftar aktif sebagai santri/siswa lembaga bersangkutan", "Wajib menjunjung tinggi nilai fair play (tata krama santri)", "Sistem gugur dengan durasi pertandingan 2 x 20 menit"]'::jsonb,
  '{"first": "Piala Bergilir Santri Cup + Medali Emas + Uang Tunai", "second": "Piala + Medali Perak + Uang Tunai", "third": "Piala + Medali Perunggu + Uang Tunai", "all": "Sepatu Emas untuk Top Scorer & Best Fair Play Team"}'::jsonb,
  'Gratis (Uang Jaminan Kehadiran Dikembalikan)',
  '08 Oktober 2026',
  '10 Oktober 2026',
  'Lapangan Sepak Bola Poncokusumo',
  'Panitia Santri Cup (0813-8899-7766)',
  'Trophy',
  true
),
(
  'comp-5',
  'LMB-SMA-01',
  'Public Speaking & Orasi Santri Kebangsaan',
  'SMA/MA/SMK',
  'Siswa SMA/MA/SMK & Santri Aliyah',
  'Pentas pidato dan orasi bahasa Indonesia, Arab, dan Inggris bertema peranan santri dalam menjaga kedaulatan bangsa dan sains modern.',
  '["Durasi orasi 7 menit di hadapan dewan juri dan audiens", "Pilihan bahasa: Indonesia, Arab, atau Inggris", "Materi tidak mengandung ujaran kebencian, SARA, atau polarisasi politik", "Penilaian meliputi vokal, bahasa tubuh, kedalaman dalil, dan kekuatan retorika"]'::jsonb,
  '{"first": "Trofi Juara I + Sertifikat Penghargaan + Uang Pembinaan", "second": "Trofi Juara II + Sertifikat Penghargaan + Uang Pembinaan", "third": "Trofi Juara III + Sertifikat Penghargaan + Uang Pembinaan"}'::jsonb,
  'Gratis',
  '12 Oktober 2026',
  '14 Oktober 2026',
  'Aula Utama MWC NU Poncokusumo',
  'Panitia Cabang Orasi Kebangsaan (0822-4455-6677)',
  'Mic2',
  true
),
(
  'comp-6',
  'LMB-IPNU-01',
  'Content Creation Podcast Santri Inspiratif',
  'IPNU/IPPNU',
  'Kader IPNU-IPPNU & Remaja Kreatif (15-25 Tahun)',
  'Kompetisi memproduksi siniar (podcast) audio/video berdurasi 15-25 menit bertema "Santri Berdigital, Meretas Batas Dunia".',
  '["Karya tim maksimal 3 orang (host, co-host, editor teknik)", "Konten membahas inovasi pemuda NU, tradisi pesantren, dan teknologi masa kini", "Format video MP4 1080p dan publikasi di Spotify/YouTube", "Penilaian: substansi obrolan, kejernihan audio, storytelling, daya tarik visual"]'::jsonb,
  '{"first": "Paket Microphone Podcast Kit + Trofi + Dana Produksi", "second": "Paket Audio Interface + Trofi + Dana Produksi", "third": "Headphone Monitor Studio + Trofi + Dana Produksi"}'::jsonb,
  'Gratis',
  '15 Oktober 2026',
  '06 Oktober 2026',
  'Studio Media Center MWC NU & Online Submission',
  'Panitia Cabang Podcast (0819-3344-5566)',
  'Radio',
  true
),
(
  'comp-7',
  'LMB-FAT-01',
  'Women Creativepreneur Content Creation',
  'FATAYAT',
  'Anggota Fatayat NU & Wirausaha Perempuan Muda',
  'Lomba kreasi konten video branding & storytelling untuk mempromosikan UMKM unggulan produk lokal lereng Poncokusumo.',
  '["Menampilkan produk lokal nyata (hasil tani apel, sayur, kuliner pesantren, kerajinan)", "Durasi 60-120 detik, disajikan menarik dan informatif untuk konsumen modern", "Menyertakan tautan pemesanan produk nyata", "Karya diunggah di akun Instagram/TikTok dengan menandai panitia HSN"]'::jsonb,
  '{"first": "Modal Usaha Pengembangan UMKM + Trofi + Sertifikat", "second": "Modal Usaha Pengembangan UMKM + Trofi + Sertifikat", "third": "Modal Usaha Pengembangan UMKM + Trofi + Sertifikat"}'::jsonb,
  'Gratis',
  '15 Oktober 2026',
  '08 Oktober 2026',
  'Online & Pameran Stan Bazar Puncak',
  'Panitia Cabang Fatayat (0852-7788-9900)',
  'ShoppingBag',
  true
),
(
  'comp-8',
  'LMB-MUS-01',
  'Innovation Challenge & Outbound Sinergi Muslimat',
  'MUSLIMAT',
  'Perwakilan Ranting Muslimat NU se-Poncokusumo',
  'Tantangan inovasi ketahanan pangan keluarga sehat berbasis bahan lokal nusantara dilanjutkan outbound ukhuwah ceria antar ranting.',
  '["Perwakilan masing-masing ranting terdiri atas 5 ibu kader", "Menyajikan olahan makanan bergizi tinggi pencegah stunting berbahan lokal", "Mengikuti serangkaian fun games outbound kebersamaan", "Penilaian: cita rasa, nilai gizi, kekompakan yel-yel, dan semangat gotong royong"]'::jsonb,
  '{"first": "Piala Bergilir PAC Muslimat + Peralatan Dapur Komersial + Dana Pembinaan", "second": "Piala + Peralatan Memasak + Dana Pembinaan", "third": "Piala + Paket Sembako Premium + Dana Pembinaan"}'::jsonb,
  'Gratis',
  '10 Oktober 2026',
  '12 Oktober 2026',
  'Area Agro Wisata Pesona Poncokusumo',
  'Panitia Cabang Muslimat (0811-2233-4455)',
  'Users',
  true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    code = EXCLUDED.code,
    category = EXCLUDED.category,
    target_audience = EXCLUDED.target_audience,
    description = EXCLUDED.description,
    rules = EXCLUDED.rules,
    prizes = EXCLUDED.prizes,
    registration_deadline = EXCLUDED.registration_deadline,
    technical_meeting = EXCLUDED.technical_meeting,
    location = EXCLUDED.location,
    contact_person = EXCLUDED.contact_person,
    icon_name = EXCLUDED.icon_name;

-- 8.5. Seed Data Program Utama (Signature Programs)
INSERT INTO signature_programs (id, title, event_date, location, description, highlights, image_url, icon_name, badge, sort_order)
VALUES
(
  'prog-1',
  'Apel Akbar & Parade Resolusi Jihad',
  '22 Oktober 2026 • 06.30 WIB',
  'Lapangan Utama Poncokusumo, Malang',
  'Upacara peringatan Hari Santri Nasional dengan penghormatan Resolusi Jihad 1945 KH Hasyim Asyari, defile ribuan santri berbusana sarung putih dan atribut kebangsaan.',
  '["Inspektur Upacara Tokoh Nasional & Pengurus Cabang NU", "Kibaran Bendera Merah Putih Raksasa 50 Meter", "Defile Budaya 25 Pondok Pesantren & Madrasah", "Pembacaan Naskah Asli Resolusi Jihad 22 Oktober 1945"]'::jsonb,
  'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?auto=format&fit=crop&w=1200&q=80',
  'Flag',
  'Acara Puncak Utama',
  1
),
(
  'prog-2',
  'Poncokusumo Santri Digital Expo 2026',
  '20 - 22 Oktober 2026',
  'Gedung MWC NU & Plaza Terbuka',
  'Pameran inovasi teknologi santri masa kini, mencakup pameran AI pesantren, kaligrafi metaverse, workshop robotika madrasah, dan klinik bisnis santripreneur.',
  '["15 Booth Teknologi Karya Santri Mandiri", "Simulasi Santri VR Experience & Perpustakaan Digital", "Klinik Sertifikasi Halal Gratis untuk UMKM Warga", "Talkshow Inovator Santri bersama Pakar Teknologi"]'::jsonb,
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  'Cpu',
  'Teknologi & Masa Depan',
  2
),
(
  'prog-3',
  'Poncokusumo Bersholawat & Doa Kebangsaan',
  '22 Oktober 2026 • 19.30 WIB',
  'Panggung Akbar Lapangan Poncokusumo',
  'Malam puncak lantunan shalawat nabi bersama ribuan jamaah, habaib, alim ulama, dan santri untuk keselamatan bangsa, ketenteraman dunia, serta keberkahan bumi Poncokusumo.',
  '["Dipimpin Habaib & Majelis Sholawat Terkemuka", "Tausiyah Kebangsaan Pengurus Wilayah NU Jawa Timur", "Penyerahan Trophy Juara Umum Seluruh Cabang Lomba", "Penganugerahan Tokoh Penggerak Santri Poncokusumo 2026"]'::jsonb,
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  'Sparkles',
  'Malam Puncak & Sholawat',
  3
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    event_date = EXCLUDED.event_date,
    highlights = EXCLUDED.highlights;

-- 8.6. Seed Data Dokumen Unduhan (Downloads)
INSERT INTO download_documents (id, title, category, file_size, file_format, file_url, description, download_count, last_updated)
VALUES
('doc-1', 'Buku Panduan & Petunjuk Teknis Lomba HSN 2026', 'Panduan & Juknis', '3.8 MB', 'PDF', '/docs/juknis-hsn-2026-poncokusumo.pdf', 'Pedoman teknis lengkap seluruh cabang lomba, kriteria penilaian dewan juri, tata tertib, dan jadwal teknis.', 1248, '01 Oktober 2026'),
('doc-2', 'Proposal Sponsorship & Kerjasama Festival', 'Proposal', '6.2 MB', 'PDF', '/docs/proposal-sponsorship-hsn-2026.pdf', 'Paket kemitraan, benefit media promosi, rincian anggaran, dan hak sponsor selama festival berlangsung.', 642, '28 September 2026'),
('doc-3', 'Surat Delegasi & Rekomendasi Lembaga Pesantren', 'Administrasi', '420 KB', 'DOCX', '/docs/surat-delegasi-peserta.docx', 'Template resmi surat keterangan utusan dari madrasah, pesantren, atau pimpinan ranting NU.', 890, '02 Oktober 2026'),
('doc-4', 'Rundown Lengkap Rangkaian Acara 15-22 Oktober', 'Jadwal & Agenda', '1.1 MB', 'PDF', '/docs/rundown-hsn-2026-mwcnu.pdf', 'Jadwal detail menit demi menit mulai dari pembukaan festival, babak penyisihan hingga malam puncak bersholawat.', 1580, '04 Oktober 2026')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    download_count = EXCLUDED.download_count;

-- 8.7. Seed Data Contoh Pendaftar (Participants)
INSERT INTO participants (registration_number, full_name, institution, category, birth_date, whatsapp, email, address, competition_id, competition_title, status)
VALUES
('HSN-2026-001', 'Ahmad Fauzi Rabbani', 'PP. Al-Hidayah Poncokusumo', 'SMP/MTs', '2010-04-12', '081234567801', 'fauzi.rabbani@example.com', 'Dusun Krajan RT 02 RW 01, Poncokusumo', 'comp-1', 'Lomba Desain Poster Digital HSN', 'Terverifikasi'),
('HSN-2026-002', 'Siti Maryam Azzahra', 'MA Miftahul Ulum Wringinanom', 'SMA/MA/SMK', '2008-08-25', '081234567802', 'maryam.azzahra@example.com', 'Desa Wringinanom, Poncokusumo', 'comp-2', 'Pidato 3 Bahasa (Arab, Inggris, Jawa)', 'Terverifikasi'),
('HSN-2026-003', 'M. Rizqi Maulana', 'MI Ma''arif Poncokusumo', 'SD/MI', '2014-11-03', '081234567803', 'wali.rizqi@example.com', 'Desa Pandansari, Poncokusumo', 'comp-3', 'Video Konten Kreatif Hari Santri', 'Menunggu Verifikasi')
ON CONFLICT (registration_number) DO NOTHING;

-- 8.8. Seed Data Sponsor
INSERT INTO sponsors (id, name, tier, logo_url, contribution, benefits, sort_order)
VALUES
('sp-1', 'Bank Syariah Indonesia (BSI) KC Malang', 'Platinum', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80', 'Sponsor Utama & Layanan Digital', '["Logo Utama di Seluruh Backdrop & Billboard", "Booth Eksklusif di Arena Santri Digital Expo", "Sambutan Khusus pada Malam Puncak Bersholawat", "Penayangan Iklan Video di Layar Utama LED 4K"]'::jsonb, 1),
('sp-2', 'Koperasi Simpan Pinjam NU Sejahtera', 'Gold', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80', 'Sponsor Emas & Hadiah Lomba', '["Pencantuman Logo di Umbul-Umbul & Kaos Panitia", "Booth Produk UMKM Warga", "Pemberian Trophy Kejuaraan"]'::jsonb, 2),
('sp-3', 'CV Agro Bromo Lestari Poncokusumo', 'Silver', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', 'Sponsor Pendukung Logistik', '["Logo di Banner Resmi & Buku Panduan", "Penyebutan Nama Sponsor oleh MC Acara"]'::jsonb, 3),
('sp-4', 'TV9 Nusantara & Radio Santri FM', 'Media Partner', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', 'Liputan Resmi & Live Streaming', '["Live Streaming Apel Akbar & Malam Sholawat", "Liputan Warta Berita Televisi Santri"]'::jsonb, 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tier = EXCLUDED.tier;

-- ==============================================================================
-- 9. USEFUL ANALYTICAL VIEWS (VIEW UNTUK MEMUDAHKAN REKAP DI SUPABASE EDITOR)
-- ==============================================================================

-- 9.1. View Rekap Peserta Per Cabang Lomba
CREATE OR REPLACE VIEW view_rekap_peserta_lomba AS
SELECT 
    c.id AS competition_id,
    c.code AS competition_code,
    c.title AS competition_title,
    c.category AS competition_category,
    COUNT(p.id) AS total_pendaftar,
    COUNT(CASE WHEN p.status = 'Terverifikasi' THEN 1 END) AS total_terverifikasi,
    COUNT(CASE WHEN p.status = 'Menunggu Verifikasi' THEN 1 END) AS total_menunggu,
    COUNT(CASE WHEN p.status = 'Finalis' THEN 1 END) AS total_finalis
FROM competitions c
LEFT JOIN participants p ON c.id = p.competition_id
GROUP BY c.id, c.code, c.title, c.category
ORDER BY c.code ASC;

-- 9.2. View Pendaftar Terbaru Beserta Data Kontak
CREATE OR REPLACE VIEW view_pendaftar_terbaru AS
SELECT 
    p.registration_number,
    p.full_name,
    p.institution,
    p.category,
    p.competition_title,
    p.whatsapp,
    p.status,
    p.registered_at
FROM participants p
ORDER BY p.registered_at DESC;

-- ==============================================================================
-- SELESAI. Script siap dieksekusi langsung pada Supabase SQL Editor.
-- ==============================================================================
