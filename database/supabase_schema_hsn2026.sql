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
    competition_id VARCHAR(50) REFERENCES competitions(id) ON DELETE RESTRICT,
    competition_title VARCHAR(150) NOT NULL,
    document_url TEXT,
    document_name VARCHAR(255),
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

-- 4.8. Tabel Galeri Media Santri (Gallery Items)
CREATE TABLE IF NOT EXISTS gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    event_date VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.9. Tabel Dokumen Unduhan / Arsip (Download Center)
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
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 7.1. Public Read Policies (Semua Pengunjung Web Bisa Melihat Konten Publik)
CREATE POLICY "Public read festival_stats" ON festival_stats FOR SELECT USING (true);
CREATE POLICY "Public read five_pillars" ON five_pillars FOR SELECT USING (true);
CREATE POLICY "Public read generation_programs" ON generation_programs FOR SELECT USING (true);
CREATE POLICY "Public read signature_programs" ON signature_programs FOR SELECT USING (true);
CREATE POLICY "Public read competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public read event_timeline" ON event_timeline FOR SELECT USING (true);
CREATE POLICY "Public read gallery_items" ON gallery_items FOR SELECT USING (true);
CREATE POLICY "Public read download_documents" ON download_documents FOR SELECT USING (true);
CREATE POLICY "Public read news_articles" ON news_articles FOR SELECT USING (true);
CREATE POLICY "Public read sponsors" ON sponsors FOR SELECT USING (true);

-- 7.2. Pendaftaran Peserta (Public Insert, Public Read Status Sendiri, Admin All)
CREATE POLICY "Public can register participant" ON participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view participants" ON participants
    FOR SELECT USING (true);

-- 7.3. Form Kontak & Aspirasi (Public Insert)
CREATE POLICY "Public can submit contact message" ON contact_messages
    FOR INSERT WITH CHECK (true);

-- 7.4. Admin / Authenticated User Full Access
-- (Pengguna yang login di Supabase Auth memiliki akses penuh modifikasi data)
CREATE POLICY "Admin full access festival_stats" ON festival_stats
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access competitions" ON competitions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access participants" ON participants
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access download_documents" ON download_documents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access news_articles" ON news_articles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access contact_messages" ON contact_messages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
  'LMB-01',
  'Lomba Desain Poster Digital HSN',
  'SMP/MTs',
  'Siswa SMP/MTs & Santri Remaja se-Poncokusumo',
  'Eksplorasi visual santri masa kini memadukan estetika seni Islam Nusantara dengan kecakapan desain digital bertema "Santri Digital Nusantara".',
  '["Karya orisinil dan belum pernah diikutsertakan lomba sejenis.", "Format JPG/PNG resolusi tinggi (300 DPI) rasio 4:5 atau A3.", "Memuat logo resmi Hari Santri 2026 dan MWC NU Poncokusumo.", "Tidak mengandung unsur SARA atau konten yang bertentangan dengan norma syariat.", "Pengumpulan karya via form pendaftaran paling lambat 15 Oktober 2026."]'::jsonb,
  '{"first": "Rp 1.500.000 + Trophy + Piagam Juara", "second": "Rp 1.000.000 + Trophy + Piagam Juara", "third": "Rp 750.000 + Trophy + Piagam Juara", "all": "E-Sertifikat untuk seluruh peserta resmi"}'::jsonb,
  'Gratis',
  '15 Oktober 2026',
  '16 Oktober 2026 (Online Zoom / WhatsApp Group)',
  'Aula Gedung MWC NU Poncokusumo & Online Gallery',
  'Gus Fikri (0812-3456-7890)',
  'Palette',
  true
),
(
  'comp-2',
  'LMB-02',
  'Pidato 3 Bahasa (Arab, Inggris, Jawa)',
  'SMA/MA/SMK',
  'Siswa MA/SMA/SMK & Santri Aliyah se-Poncokusumo',
  'Ajang diplomasi dan retorika santri muda menggemakan pesan Islam rahmatan lil alamin dalam Bahasa Arab fushah, Bahasa Inggris internasional, atau Basa Jawi krama inggil.',
  '["Setiap peserta memilih salah satu dari 3 bahasa yang disediakan.", "Durasi pidato maksimal 7 menit tanpa membaca teks penuh.", "Tema pidato: Menjaga NKRI & Mengawal Peradaban Dunia.", "Peserta mengenakan busana muslim santri rapi (koko/sarung/peci atau gamis/hijab).", "Kriteria penilaian: Artikulasi bahasa, penguasaan materi, retorika, dan adab."]'::jsonb,
  '{"first": "Rp 2.000.000 + Trophy Kehormatan + Piagam", "second": "Rp 1.250.000 + Trophy Kehormatan + Piagam", "third": "Rp 750.000 + Trophy Kehormatan + Piagam", "all": "E-Sertifikat berstandar MWC NU"}'::jsonb,
  'Gratis',
  '14 Oktober 2026',
  '16 Oktober 2026 di Aula Utama MWC NU',
  'Panggung Utama Kompleks Pesantren Poncokusumo',
  'Ustadzah Nabila (0821-9876-5432)',
  'Award',
  true
),
(
  'comp-3',
  'LMB-03',
  'Video Konten Kreatif Hari Santri',
  'SD/MI',
  'Siswa SD/MI & Santri Cilik se-Poncokusumo',
  'Kreasi video pendek inspiratif durasi 60-90 detik yang menceritakan keseharian santri, adab berbakti kepada guru dan orang tua, atau kecintaan pada tanah air.',
  '["Durasi video antara 60 hingga 90 detik, format MP4 vertikal 9:16.", "Karya asli dibuat bersama pembina/guru madrasah.", "Kualitas video minimal 1080p, audio jernih dan bebas copyright lagu yang dilarang.", "Diunggah ke Instagram/TikTok dengan tagar #HariSantriPoncokusumo2026.", "Link video dikirimkan melalui sistem pendaftaran resmi."]'::jsonb,
  '{"first": "Rp 1.250.000 + Trophy + Piagam", "second": "Rp 850.000 + Trophy + Piagam", "third": "Rp 600.000 + Trophy + Piagam", "all": "Sertifikat Digital untuk Sekolah & Peserta"}'::jsonb,
  'Gratis',
  '16 Oktober 2026',
  '17 Oktober 2026 via WhatsApp Group',
  'Media Sosial Resmi MWC NU & Penayangan di Panggung Akbar',
  'Kang Dani (0857-1122-3344)',
  'Video',
  true
),
(
  'comp-4',
  'LMB-04',
  'Musabaqah Tilawatil Quran (MTQ) Remaja',
  'IPNU/IPPNU',
  'Kader Remaja & Santriwan/i se-Poncokusumo',
  'Lantunan ayat suci Al-Quran dengan kaidah tajwid sempurna dan irama lagu maqamat merdu, menjaga tradisi syiar Al-Quran di bumi Nusantara.',
  '["Usia peserta maksimal 20 tahun pada Oktober 2026.", "Membawakan maqra tilawah yang ditentukan saat technical meeting.", "Menggunakan minimal 3 maqam lagu tilawah dalam durasi 7 menit.", "Mengenakan busana santri nasional yang sopan dan rapi.", "Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat."]'::jsonb,
  '{"first": "Rp 2.000.000 + Trophy Bergilir + Piagam", "second": "Rp 1.500.000 + Trophy + Piagam", "third": "Rp 1.000.000 + Trophy + Piagam", "all": "Sertifikat Penghargaan MTQ Resmi"}'::jsonb,
  'Gratis',
  '15 Oktober 2026',
  '17 Oktober 2026 di Masjid Besar Poncokusumo',
  'Masjid Besar Baiturrahman Poncokusumo',
  'Ustadz Sholihin (0813-8899-7766)',
  'BookOpen',
  true
),
(
  'comp-5',
  'LMB-05',
  'Festival Seni Hadrah Banjari Santri',
  'UMUM',
  'Grup Hadrah Pesantren & Remaja Masjid se-Kabupaten Malang',
  'Simfoni tabuhan terbang al-Banjari dipadu syair maulid dan sholawat nabi yang menggetarkan sanubari, melestarikan seni adiluhung pesantren.',
  '["Satu grup beranggotakan 10 orang (4 penabuh, 6 vokal/backing).", "Durasi penampilan maksimal 10 menit membawakan 1 lagu wajib dan 1 lagu bebas.", "Membawa peralatan terbang sendiri berstandar murni al-banjari.", "Menjaga ketertiban, adab islami, dan busana seragam santri bernuansa aswaja.", "Penilaian mencakup vokal, ketukan terbang, variasi adab, dan kerapian."]'::jsonb,
  '{"first": "Rp 3.500.000 + Trophy Juara Umum + Piagam", "second": "Rp 2.500.000 + Trophy + Piagam", "third": "Rp 1.500.000 + Trophy + Piagam", "all": "Uang Pembinaan Juara Harapan & Piagam Seluruh Grup"}'::jsonb,
  'Rp 50.000 / Grup',
  '13 Oktober 2026',
  '15 Oktober 2026 di Sekretariat Panitia HSN',
  'Panggung Terbuka Lapangan Poncokusumo',
  'Gus Masykur (0822-4455-6677)',
  'Music',
  true
),
(
  'comp-6',
  'LMB-06',
  'Turnamen Sepak Bola Mini Santri Cup',
  'SMP/MTs',
  'Tim Pelajar MTs/SMP & Pondok Pesantren',
  'Ajang olah fisik dan persaudaraan santri di lapangan hijau, menjunjung tinggi sportivitas, fair play, dan ukhuwah islamiyah antar lembaga.',
  '["Satu tim terdiri dari 7 pemain inti dan 5 pemain cadangan.", "Seluruh pemain wajib santri aktif atau pelajar resmi lembaga terdaftar.", "Sistem gugur dengan durasi pertandingan 2x15 menit.", "Pemain wajib mengenakan deker pelindung tulang kering dan sepatu bola mini.", "Menjunjung tinggi sportivitas; perkelahian berakibat diskualifikasi tim."]'::jsonb,
  '{"first": "Rp 2.500.000 + Piala Bergilir Santri Cup + Medali", "second": "Rp 1.750.000 + Trophy + Medali", "third": "Rp 1.000.000 + Trophy + Medali", "all": "Top Scorer & Best Player Award senilai Rp 500.000"}'::jsonb,
  'Gratis',
  '12 Oktober 2026',
  '14 Oktober 2026 di Lapangan Poncokusumo',
  'Stadion Mini Gelora Poncokusumo',
  'Kapten Huda (0819-3344-5566)',
  'Trophy',
  true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    rules = EXCLUDED.rules,
    prizes = EXCLUDED.prizes,
    registration_deadline = EXCLUDED.registration_deadline;

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
