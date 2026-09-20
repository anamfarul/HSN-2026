import React, { useState, useMemo } from 'react';
import { ParticipantRegistration } from '../types';
import { printElementSafely } from '../lib/pdfGenerator';
import {
  MapPin,
  Building2,
  Compass,
  Printer,
  FileDown,
  Search,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  X,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AdminAddressStatsSectionProps {
  participants: ParticipantRegistration[];
  onViewParticipantsLocation?: (locationName: string) => void;
}

interface LocationItem {
  name: string;
  level: 'kecamatan' | 'kabupaten' | 'provinsi';
  parentLocation?: string; // e.g., Kabupaten & Provinsi for Kecamatan
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  percentage: number;
  participantIds: string[];
}

// Helper normalisasi nama wilayah (Title Case & Trim)
function normalizeName(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  // Capitalize each word nicely
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper ekstraksi alamat peserta (fallback jika kolom terpisah kosong)
export function extractParticipantLocation(p: ParticipantRegistration): {
  district: string;
  regency: string;
  province: string;
} {
  let district = normalizeName(p.district || '');
  let regency = normalizeName(p.regency || '');
  let province = normalizeName(p.province || '');

  // Jika kolom terpisah belum terisi, coba lakukan parsing cerdas dari string p.address
  if (!district || !regency || !province) {
    const raw = (p.address || '').trim();

    if (!district) {
      const matchKec = raw.match(/Kec(?:amatan|\.)?\s*([^,]+)/i);
      if (matchKec) {
        district = normalizeName(matchKec[1]);
      }
    }

    if (!regency) {
      const matchKab = raw.match(/(?:Kabupaten|Kab\.|Kota)\s*([^,]+)/i);
      if (matchKab) {
        regency = normalizeName(matchKab[0]);
      }
    }

    if (!province) {
      if (/Jawa\s*Timur/i.test(raw)) province = 'Jawa Timur';
      else if (/Jawa\s*Tengah/i.test(raw)) province = 'Jawa Tengah';
      else if (/Jawa\s*Barat/i.test(raw)) province = 'Jawa Barat';
      else if (/DKI|Jakarta/i.test(raw)) province = 'DKI Jakarta';
      else if (/DIY|Yogyakarta/i.test(raw)) province = 'DI Yogyakarta';
      else if (/Banten/i.test(raw)) province = 'Banten';
      else if (/Bali/i.test(raw)) province = 'Bali';
    }
  }

  // Default fallback jika data lama sama sekali tidak menyebutkan
  return {
    district: district || 'Poncokusumo (Default)',
    regency: regency || 'Kabupaten Malang',
    province: province || 'Jawa Timur',
  };
}

export const AdminAddressStatsSection: React.FC<AdminAddressStatsSectionProps> = ({
  participants,
  onViewParticipantsLocation,
}) => {
  const [activeLevelTab, setActiveLevelTab] = useState<'ALL' | 'kecamatan' | 'kabupaten' | 'provinsi'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Terverifikasi' | 'Menunggu'>('ALL');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Kompilasi data berdasarkan wilayah
  const { districts, regencies, provinces, allLocations } = useMemo(() => {
    const totalCount = participants.length;

    const districtMap = new Map<string, {
      name: string;
      regency: string;
      province: string;
      total: number;
      verified: number;
      pending: number;
      rejected: number;
      participantIds: string[];
    }>();

    const regencyMap = new Map<string, {
      name: string;
      province: string;
      total: number;
      verified: number;
      pending: number;
      rejected: number;
      participantIds: string[];
    }>();

    const provinceMap = new Map<string, {
      name: string;
      total: number;
      verified: number;
      pending: number;
      rejected: number;
      participantIds: string[];
    }>();

    participants.forEach((p) => {
      const loc = extractParticipantLocation(p);
      const isVerified = p.status === 'Terverifikasi';
      const isPending = p.status === 'Menunggu' || p.status === 'Menunggu Verifikasi';
      const isRejected = p.status === 'Ditolak';

      // 1. Kecamatan
      const distKey = `${loc.district}__${loc.regency}`;
      if (!districtMap.has(distKey)) {
        districtMap.set(distKey, {
          name: loc.district,
          regency: loc.regency,
          province: loc.province,
          total: 0,
          verified: 0,
          pending: 0,
          rejected: 0,
          participantIds: [],
        });
      }
      const distEntry = districtMap.get(distKey)!;
      distEntry.total += 1;
      if (isVerified) distEntry.verified += 1;
      if (isPending) distEntry.pending += 1;
      if (isRejected) distEntry.rejected += 1;
      distEntry.participantIds.push(p.id);

      // 2. Kabupaten / Kota
      const regKey = loc.regency;
      if (!regencyMap.has(regKey)) {
        regencyMap.set(regKey, {
          name: loc.regency,
          province: loc.province,
          total: 0,
          verified: 0,
          pending: 0,
          rejected: 0,
          participantIds: [],
        });
      }
      const regEntry = regencyMap.get(regKey)!;
      regEntry.total += 1;
      if (isVerified) regEntry.verified += 1;
      if (isPending) regEntry.pending += 1;
      if (isRejected) regEntry.rejected += 1;
      regEntry.participantIds.push(p.id);

      // 3. Provinsi
      const provKey = loc.province;
      if (!provinceMap.has(provKey)) {
        provinceMap.set(provKey, {
          name: loc.province,
          total: 0,
          verified: 0,
          pending: 0,
          rejected: 0,
          participantIds: [],
        });
      }
      const provEntry = provinceMap.get(provKey)!;
      provEntry.total += 1;
      if (isVerified) provEntry.verified += 1;
      if (isPending) provEntry.pending += 1;
      if (isRejected) provEntry.rejected += 1;
      provEntry.participantIds.push(p.id);
    });

    const calcPercent = (val: number) => (totalCount > 0 ? Math.round((val / totalCount) * 100) : 0);

    const distList: LocationItem[] = Array.from(districtMap.values())
      .map((d) => ({
        name: d.name,
        level: 'kecamatan' as const,
        parentLocation: `${d.regency}, ${d.province}`,
        total: d.total,
        verified: d.verified,
        pending: d.pending,
        rejected: d.rejected,
        percentage: calcPercent(d.total),
        participantIds: d.participantIds,
      }))
      .sort((a, b) => b.total - a.total);

    const regList: LocationItem[] = Array.from(regencyMap.values())
      .map((r) => ({
        name: r.name,
        level: 'kabupaten' as const,
        parentLocation: r.province,
        total: r.total,
        verified: r.verified,
        pending: r.pending,
        rejected: r.rejected,
        percentage: calcPercent(r.total),
        participantIds: r.participantIds,
      }))
      .sort((a, b) => b.total - a.total);

    const provList: LocationItem[] = Array.from(provinceMap.values())
      .map((pr) => ({
        name: pr.name,
        level: 'provinsi' as const,
        parentLocation: 'Indonesia',
        total: pr.total,
        verified: pr.verified,
        pending: pr.pending,
        rejected: pr.rejected,
        percentage: calcPercent(pr.total),
        participantIds: pr.participantIds,
      }))
      .sort((a, b) => b.total - a.total);

    const combined: LocationItem[] = [...distList, ...regList, ...provList];

    return {
      districts: distList,
      regencies: regList,
      provinces: provList,
      allLocations: combined,
    };
  }, [participants]);

  // Filter tampilan tabel
  const filteredList = useMemo(() => {
    let list: LocationItem[] = [];
    if (activeLevelTab === 'ALL') {
      list = allLocations;
    } else if (activeLevelTab === 'kecamatan') {
      list = districts;
    } else if (activeLevelTab === 'kabupaten') {
      list = regencies;
    } else {
      list = provinces;
    }

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.parentLocation && item.parentLocation.toLowerCase().includes(q))
      );
    }

    // Filter Status (jika hanya ingin melihat wilayah yang punya pendaftar berstatus tertentu)
    if (statusFilter === 'Terverifikasi') {
      list = list.filter((item) => item.verified > 0);
    } else if (statusFilter === 'Menunggu') {
      list = list.filter((item) => item.pending > 0);
    }

    return list;
  }, [activeLevelTab, allLocations, districts, regencies, provinces, searchQuery, statusFilter]);

  // Fungsi Export CSV Rekap Alamat Lengkap
  const handleExportCSV = () => {
    const timeNow = new Date().toLocaleString('id-ID');
    let csv = '\uFEFF'; // UTF-8 BOM untuk Excel Indonesia

    csv += `LAPORAN REKAPITULASI PESERTA FESTIVAL HARI SANTRI NASIONAL 2026\n`;
    csv += `BERDASARKAN ALAMAT DOMISILI (KECAMATAN, KABUPATEN/KOTA, PROVINSI)\n`;
    csv += `Waktu Ekspor: "${timeNow}"\n`;
    csv += `Total Peserta Terdaftar: ${participants.length}\n\n`;

    // 1. Rekap Kecamatan
    csv += `=== 1. REKAPITULASI PESERTA BERDASARKAN KECAMATAN ===\n`;
    csv += `No,Kecamatan,Kabupaten/Kota & Provinsi,Total Peserta,Terverifikasi,Menunggu,Persentase (%)\n`;
    districts.forEach((item, idx) => {
      csv += `${idx + 1},"${item.name}","${item.parentLocation || ''}",${item.total},${item.verified},${item.pending},"${item.percentage}%"\n`;
    });
    csv += `\n`;

    // 2. Rekap Kabupaten / Kota
    csv += `=== 2. REKAPITULASI PESERTA BERDASARKAN KABUPATEN / KOTA ===\n`;
    csv += `No,Kabupaten / Kota,Provinsi,Total Peserta,Terverifikasi,Menunggu,Persentase (%)\n`;
    regencies.forEach((item, idx) => {
      csv += `${idx + 1},"${item.name}","${item.parentLocation || ''}",${item.total},${item.verified},${item.pending},"${item.percentage}%"\n`;
    });
    csv += `\n`;

    // 3. Rekap Provinsi
    csv += `=== 3. REKAPITULASI PESERTA BERDASARKAN PROVINSI ===\n`;
    csv += `No,Provinsi,Total Peserta,Terverifikasi,Menunggu,Persentase (%)\n`;
    provinces.forEach((item, idx) => {
      csv += `${idx + 1},"${item.name}",${item.total},${item.verified},${item.pending},"${item.percentage}%"\n`;
    });
    csv += `\n`;

    // 4. Data Detail Peserta per Alamat Lengkap
    csv += `=== 4. DAFTAR LENGKAP IDENTITAS PESERTA & ALAMAT ===\n`;
    csv += `No,No. Registrasi,Nama Lengkap,Asal Lembaga,Cabang Lomba,Kecamatan,Kabupaten/Kota,Provinsi,Alamat Lengkap,Kontak WA,Status,Waktu Daftar\n`;
    participants.forEach((p, idx) => {
      const loc = extractParticipantLocation(p);
      csv += `${idx + 1},"${p.registrationNumber}","${p.fullName}","${p.institution}","${p.competitionTitle}","${loc.district}","${loc.regency}","${loc.province}","${p.address || ''}","${p.whatsapp}","${p.status}","${p.registeredAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Alamat_Peserta_HSN2026_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cetak Dokumen Rekap Alamat
  const handlePrint = () => {
    printElementSafely('printable-address-report');
  };

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-5 shadow-xl">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#006B4F] to-[#008F72] text-[#F2C96D] flex items-center justify-center border border-[#D9B45B]/40 shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-white">
              Rekapitulasi Peserta Berdasarkan Alamat & Domisili
            </h3>
          </div>
          <p className="text-xs text-[#DDE7E8]/70 mt-1 pl-10">
            Sebaran data peserta menurut Kecamatan, Kabupaten/Kota, dan Provinsi dengan integrasi cetak & ekspor CSV.
          </p>
        </div>

        {/* Action Buttons: Cetak & Export CSV */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Ekspor seluruh rekapitulasi wilayah ke format file CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#D9B45B]/20 hover:bg-[#D9B45B]/35 border border-[#D9B45B]/50 text-[#F2C96D] hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Pratinjau dan cetak dokumen resmi rekapitulasi alamat"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap Alamat</span>
          </button>
        </div>
      </div>

      {/* Mini Summary Cards Sebaran Wilayah */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#020e19]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#DDE7E8]/70 uppercase font-semibold">Kecamatan</div>
            <div className="text-lg font-mono font-black text-white">{districts.length}</div>
            <div className="text-[10px] text-emerald-300">Wilayah terdata</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#020e19]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-[#00D9F5] border border-cyan-500/30 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#DDE7E8]/70 uppercase font-semibold">Kabupaten / Kota</div>
            <div className="text-lg font-mono font-black text-white">{regencies.length}</div>
            <div className="text-[10px] text-[#00D9F5]">Wilayah terdata</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#020e19]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9B45B]/15 text-[#F2C96D] border border-[#D9B45B]/30 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#DDE7E8]/70 uppercase font-semibold">Provinsi</div>
            <div className="text-lg font-mono font-black text-white">{provinces.length}</div>
            <div className="text-[10px] text-[#F2C96D]">Provinsi asal</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#020e19]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#DDE7E8]/70 uppercase font-semibold">Total Peserta</div>
            <div className="text-lg font-mono font-black text-white">{participants.length}</div>
            <div className="text-[10px] text-purple-300">Pendaftar sistem</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Tab Tingkat Wilayah, Pencarian, & Filter Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#020e19] p-3 rounded-2xl border border-white/10">
        {/* Tab Tingkat Wilayah */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveLevelTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeLevelTab === 'ALL'
                ? 'bg-[#006B4F] text-[#F2C96D] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Semua Wilayah ({allLocations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLevelTab('kecamatan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeLevelTab === 'kecamatan'
                ? 'bg-[#006B4F] text-[#F2C96D] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Kecamatan ({districts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLevelTab('kabupaten')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeLevelTab === 'kabupaten'
                ? 'bg-[#006B4F] text-[#F2C96D] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Kabupaten/Kota ({regencies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveLevelTab('provinsi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeLevelTab === 'provinsi'
                ? 'bg-[#006B4F] text-[#F2C96D] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Provinsi ({provinces.length})
          </button>
        </div>

        {/* Pencarian & Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Cari wilayah / daerah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00D9F5]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 text-xs text-[#00D9F5] font-semibold focus:outline-none focus:border-[#00D9F5]"
          >
            <option value="ALL">Semua Status</option>
            <option value="Terverifikasi">Hanya Terverifikasi</option>
            <option value="Menunggu">Hanya Menunggu</option>
          </select>
        </div>
      </div>

      {/* Tabel Rincian Sebaran Wilayah */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020e19]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[#DDE7E8]/80 text-[11px] font-bold uppercase tracking-wider">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">Nama Wilayah / Daerah</th>
              <th className="p-3 text-center">Tingkat</th>
              <th className="p-3">Wilayah Induk</th>
              <th className="p-3 text-center">Total Peserta</th>
              <th className="p-3 text-center">Terverifikasi</th>
              <th className="p-3 text-center">Menunggu</th>
              <th className="p-3 w-36">Porsi Sebaran</th>
              <th className="p-3 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredList.map((item, index) => (
              <tr key={`${item.level}-${item.name}-${index}`} className="hover:bg-white/[0.03] transition-colors">
                <td className="p-3 text-center text-white/50 font-mono text-[11px]">{index + 1}</td>
                <td className="p-3">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    {item.level === 'kecamatan' && <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {item.level === 'kabupaten' && <MapPin className="w-3.5 h-3.5 text-[#00D9F5] shrink-0" />}
                    {item.level === 'provinsi' && <Compass className="w-3.5 h-3.5 text-[#F2C96D] shrink-0" />}
                    <span>{item.name}</span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.level === 'kecamatan'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.level === 'kabupaten'
                        ? 'bg-cyan-500/20 text-[#00D9F5] border border-cyan-500/30'
                        : 'bg-[#D9B45B]/20 text-[#F2C96D] border border-[#D9B45B]/30'
                    }`}
                  >
                    {item.level}
                  </span>
                </td>
                <td className="p-3 text-white/70 text-[11px]">
                  {item.parentLocation || '-'}
                </td>
                <td className="p-3 text-center font-mono font-black text-white text-sm">
                  {item.total}
                </td>
                <td className="p-3 text-center font-mono font-bold text-emerald-400">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {item.verified}
                  </span>
                </td>
                <td className="p-3 text-center font-mono font-bold text-amber-300">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {item.pending}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                    <span>{item.percentage}%</span>
                    <span className="text-[10px] text-white/40 font-mono">{item.total}/{participants.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.level === 'kecamatan'
                          ? 'bg-gradient-to-r from-emerald-500 to-[#00D9F5]'
                          : item.level === 'kabupaten'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                          : 'bg-gradient-to-r from-[#D9B45B] to-amber-400'
                      }`}
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    />
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewParticipantsLocation) {
                        onViewParticipantsLocation(item.name);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00D9F5]/20 border border-white/10 hover:border-[#00D9F5]/40 text-[11px] font-semibold text-white/80 hover:text-[#00D9F5] transition-all inline-flex items-center gap-1 cursor-pointer"
                    title={`Lihat daftar peserta dari ${item.name}`}
                  >
                    <span>Filter</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredList.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-white/60 text-xs">
                  Tidak ada data wilayah yang sesuai dengan pencarian "{searchQuery}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CETAK RESMI REKAPITULASI ALAMAT */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl my-auto flex flex-col items-center">
            {/* Top Toolbar */}
            <div className="no-print w-full mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031525] border border-[#00D9F5]/40 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#F2C96D]/20 border border-[#D9B45B]/40 flex items-center justify-center text-[#F2C96D]">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading text-sm sm:text-base font-bold text-white">
                    Pratinjau Berkas Rekapitulasi Alamat Peserta
                  </h4>
                  <p className="text-[11px] text-[#DDE7E8]/70">
                    Dokumen cetak resmi Festival HSN 2026 MWC NU Poncokusumo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#006B4F] to-[#008F72] hover:brightness-110 border border-[#D9B45B]/50 text-[#F2C96D] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                  title="Tutup Modal Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Document */}
            <div className="w-full overflow-x-auto pb-6">
              <div
                id="printable-address-report"
                className="bg-white text-gray-950 p-6 sm:p-10 font-sans min-w-[800px] text-xs shadow-2xl rounded-2xl border border-gray-300"
              >
                {/* KOP SURAT RESMI */}
                <div className="text-center border-b-4 border-double border-gray-950 pb-3 mb-4">
                  <div className="flex items-center justify-center gap-3.5 mb-1.5">
                    <div className="w-12 h-12 rounded-full bg-emerald-900 text-[#F2C96D] font-serif font-black text-xl flex items-center justify-center border-2 border-emerald-950 shadow-sm shrink-0">
                      NU
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-wide text-gray-950 uppercase font-serif">
                        PANITIA FESTIVAL HARI SANTRI NASIONAL (HSN) 2026
                      </h2>
                      <h3 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-normal">
                        MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO
                      </h3>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-gray-700 mt-1 font-medium">
                    Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kabupaten Malang, Jawa Timur 65157 • Narahubung Panitia: 0812-XXXX-XXXX
                  </p>
                </div>

                {/* JUDUL DOKUMEN & INFO REKAP */}
                <div className="text-center mb-5">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-950 underline decoration-2 underline-offset-4">
                    LAPORAN REKAPITULASI PESERTA BERDASARKAN ALAMAT & DOMISILI
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-700 mt-2 font-medium">
                    <span>
                      <strong>Total Pendaftar:</strong> {participants.length} Peserta
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Kecamatan Terdata:</strong> {districts.length}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Kabupaten/Kota:</strong> {regencies.length}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Provinsi:</strong> {provinces.length}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Tanggal Cetak:</strong>{' '}
                      {new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* TABEL 1: REKAPITULASI TINGKAT KECAMATAN */}
                <div className="mb-6">
                  <div className="bg-gray-100 p-2 border border-gray-950 font-bold text-gray-950 uppercase text-[11px] mb-1">
                    A. REKAPITULASI PESERTA PER KECAMATAN ({districts.length} KECAMATAN)
                  </div>
                  <table className="w-full text-left border-collapse border border-gray-950 text-[10.5px]">
                    <thead>
                      <tr className="bg-gray-200 text-gray-950 uppercase font-bold border-b border-gray-950">
                        <th className="border border-gray-950 p-1.5 text-center w-8">No</th>
                        <th className="border border-gray-950 p-1.5">Nama Kecamatan</th>
                        <th className="border border-gray-950 p-1.5">Kabupaten / Kota & Provinsi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Terverifikasi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Menunggu</th>
                        <th className="border border-gray-950 p-1.5 text-center w-24">Total Peserta</th>
                        <th className="border border-gray-950 p-1.5 text-center w-16">Porsi (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districts.map((item, idx) => (
                        <tr key={`print-dist-${idx}`} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-950 p-1.5 text-center font-medium">{idx + 1}</td>
                          <td className="border border-gray-950 p-1.5 font-bold">{item.name}</td>
                          <td className="border border-gray-950 p-1.5 text-gray-700">{item.parentLocation}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-emerald-800">
                            {item.verified}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-amber-800">
                            {item.pending}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold">{item.total}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TABEL 2: REKAPITULASI TINGKAT KABUPATEN / KOTA */}
                <div className="mb-6">
                  <div className="bg-gray-100 p-2 border border-gray-950 font-bold text-gray-950 uppercase text-[11px] mb-1">
                    B. REKAPITULASI PESERTA PER KABUPATEN / KOTA ({regencies.length} KABUPATEN/KOTA)
                  </div>
                  <table className="w-full text-left border-collapse border border-gray-950 text-[10.5px]">
                    <thead>
                      <tr className="bg-gray-200 text-gray-950 uppercase font-bold border-b border-gray-950">
                        <th className="border border-gray-950 p-1.5 text-center w-8">No</th>
                        <th className="border border-gray-950 p-1.5">Nama Kabupaten / Kota</th>
                        <th className="border border-gray-950 p-1.5">Provinsi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Terverifikasi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Menunggu</th>
                        <th className="border border-gray-950 p-1.5 text-center w-24">Total Peserta</th>
                        <th className="border border-gray-950 p-1.5 text-center w-16">Porsi (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regencies.map((item, idx) => (
                        <tr key={`print-reg-${idx}`} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-950 p-1.5 text-center font-medium">{idx + 1}</td>
                          <td className="border border-gray-950 p-1.5 font-bold">{item.name}</td>
                          <td className="border border-gray-950 p-1.5 text-gray-700">{item.parentLocation}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-emerald-800">
                            {item.verified}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-amber-800">
                            {item.pending}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold">{item.total}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TABEL 3: REKAPITULASI TINGKAT PROVINSI */}
                <div className="mb-8">
                  <div className="bg-gray-100 p-2 border border-gray-950 font-bold text-gray-950 uppercase text-[11px] mb-1">
                    C. REKAPITULASI PESERTA PER PROVINSI ({provinces.length} PROVINSI)
                  </div>
                  <table className="w-full text-left border-collapse border border-gray-950 text-[10.5px]">
                    <thead>
                      <tr className="bg-gray-200 text-gray-950 uppercase font-bold border-b border-gray-950">
                        <th className="border border-gray-950 p-1.5 text-center w-8">No</th>
                        <th className="border border-gray-950 p-1.5">Nama Provinsi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Terverifikasi</th>
                        <th className="border border-gray-950 p-1.5 text-center w-20">Menunggu</th>
                        <th className="border border-gray-950 p-1.5 text-center w-24">Total Peserta</th>
                        <th className="border border-gray-950 p-1.5 text-center w-16">Porsi (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provinces.map((item, idx) => (
                        <tr key={`print-prov-${idx}`} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-950 p-1.5 text-center font-medium">{idx + 1}</td>
                          <td className="border border-gray-950 p-1.5 font-bold">{item.name}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-emerald-800">
                            {item.verified}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold text-amber-800">
                            {item.pending}
                          </td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono font-bold">{item.total}</td>
                          <td className="border border-gray-950 p-1.5 text-center font-mono">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* LEMBAR PENGESAHAN & TANDA TANGAN */}
                <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-2 text-center text-xs">
                  <div>
                    <p className="text-gray-700">Mengetahui,</p>
                    <p className="font-bold text-gray-950 mt-1">Ketua Panitia HSN 2026</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 italic">( Tanda Tangan & Cap Panitia )</span>
                    </div>
                    <p className="font-bold text-gray-950 underline decoration-1 underline-offset-2">
                      Ust. Ahmad Syarifuddin, S.Pd.I
                    </p>
                    <p className="text-[10px] text-gray-600">Ketua Pelaksana Festival HSN</p>
                  </div>

                  <div>
                    <p className="text-gray-700">
                      Poncokusumo,{' '}
                      {new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="font-bold text-gray-950 mt-1">Sekretariat MWC NU Poncokusumo</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 italic">( Tanda Tangan & Cap Lembaga )</span>
                    </div>
                    <p className="font-bold text-gray-950 underline decoration-1 underline-offset-2">
                      H. Muhammad Anam, M.Pd
                    </p>
                    <p className="text-[10px] text-gray-600">Sekretaris Panitia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
