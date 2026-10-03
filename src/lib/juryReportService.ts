import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ParticipantScoreRow } from './juryService';
import { Competition, UserProfile } from '../types';

/**
 * Export Rekap Nilai ke format CSV
 */
export function exportScoreRecapCSV(
  competition: Competition,
  rows: ParticipantScoreRow[],
  juries: UserProfile[]
): void {
  const assignedJuryHeaders = juries.map((j) => `Nilai: ${j.fullName}`);
  const headers = [
    'Peringkat',
    'No. Registrasi',
    'Nama Peserta',
    'Asal Lembaga',
    'Gelar Juara',
    ...assignedJuryHeaders,
    'Nilai Rata-rata',
    'Status Nilai',
    'Indikator Seri',
  ];

  const csvRows = rows.map((r) => {
    const juryScoresValues = juries.map((j) => {
      const s = r.juryScores[j.id];
      return s !== undefined ? s.toFixed(2) : '-';
    });

    return [
      `"${r.rank || '-'}"`,
      `"${r.participant.registrationNumber || ''}"`,
      `"${(r.participant.fullName || '').replace(/"/g, '""')}"`,
      `"${(r.participant.institution || '').replace(/"/g, '""')}"`,
      `"${r.winnerTitle || '-'}"`,
      ...juryScoresValues,
      `"${r.averageScore.toFixed(2)}"`,
      `"${r.isComplete ? 'Lengkap' : 'Belum Lengkap'}"`,
      `"${r.isTie ? 'NILAI SERI' : 'Tunggal'}"`,
    ];
  });

  const content = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Nilai_${competition.code || competition.id}_HSN2026.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Cetak / Unduh Rekap Nilai Dewan Juri format PDF
 */
export function exportScoreRecapPDF(
  competition: Competition,
  rows: ParticipantScoreRow[],
  juries: UserProfile[],
  adminName: string = 'Sekretariat Utama HSN 2026'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Kop Surat Resmi HSN 2026
  doc.setFillColor(3, 21, 37); // Dark navy #031525
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(242, 201, 109); // Gold #F2C96D
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PANITIA FESTIVAL HARI SANTRI NASIONAL 2026', 148.5, 9, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO', 148.5, 15, { align: 'center' });

  doc.setTextColor(0, 217, 245); // Cyan
  doc.setFontSize(8);
  doc.text('REKAPITULASI RESMI PENILAIAN DEWAN JURI & PERINGKAT PESERTA', 148.5, 20, { align: 'center' });

  // Metadata Lomba
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Cabang Lomba : ${competition.title.toUpperCase()}`, 14, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Kategori : ${competition.category}  |  Kode : ${competition.code || competition.id}`, 14, 37);
  doc.text(`Dicetak Pada : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} - ${new Date().toLocaleTimeString('id-ID')}`, 14, 42);

  // Tabel Rekap
  const headColumns = [
    'Rank',
    'No. Reg',
    'Nama Peserta',
    'Asal Lembaga',
    ...juries.map((j, idx) => `Juri ${idx + 1}\n(${j.fullName.split(' ')[0]})`),
    'Rata-Rata',
    'Status',
    'Gelar Juara',
  ];

  const bodyData = rows.map((r) => {
    const jScores = juries.map((j) => {
      const val = r.juryScores[j.id];
      return val !== undefined ? val.toFixed(2) : '-';
    });

    return [
      r.rank ? String(r.rank) : '-',
      r.participant.registrationNumber || '-',
      r.participant.fullName || '-',
      r.participant.institution || '-',
      ...jScores,
      r.averageScore > 0 ? r.averageScore.toFixed(2) : '0.00',
      r.isComplete ? 'Lengkap' : 'Sebagian',
      r.winnerTitle || (r.isTie ? 'Nilai Seri' : '-'),
    ];
  });

  autoTable(doc, {
    startY: 46,
    head: [headColumns],
    body: bodyData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 107, 79], // NU Green #006B4F
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
      2: { cellWidth: 48 },
      3: { cellWidth: 48 },
      [headColumns.length - 3]: { halign: 'center', fontStyle: 'bold', fillColor: [240, 248, 255] },
      [headColumns.length - 2]: { halign: 'center' },
      [headColumns.length - 1]: { halign: 'center', fontStyle: 'bold', textColor: [0, 107, 79] },
    },
  });

  // Bagian Tanda Tangan
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 150;
  const pageHeight = doc.internal.pageSize.height;
  const signY = finalY > pageHeight - 35 ? 20 : finalY;
  if (finalY > pageHeight - 35) {
    doc.addPage();
  }

  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);

  // Kiri: Dewan Juri
  doc.text('Poncokusumo, ' + new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }), 30, signY);
  doc.text('Koordinator Dewan Juri,', 30, signY + 5);
  doc.text('( .................................................... )', 30, signY + 25);
  if (juries[0]) {
    doc.setFont('helvetica', 'bold');
    doc.text(juries[0].fullName, 30, signY + 24);
    doc.setFont('helvetica', 'normal');
  }

  // Kanan: Ketua Panitia
  doc.text('Mengetahui / Mengesahkan,', 210, signY + 5);
  doc.text('Ketua Panitia HSN 2026,', 210, signY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('GUS AHMAD AL-FATIH', 210, signY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text('MWC NU Kecamatan Poncokusumo', 210, signY + 29);

  doc.save(`Rekap_Resmi_${competition.code || competition.id}_HSN2026.pdf`);
}

/**
 * Cetak / Unduh Berita Acara Penetapan Juara Resmi format PDF (A4 Portrait)
 */
export function exportBeritaAcaraPDF(
  competition: Competition,
  winners: {
    winnerTitle: string;
    participant: any;
    averageScore: number;
    rank: number;
  }[],
  juries: UserProfile[],
  decisionNotes?: string,
  adminName: string = 'Sekretariat Utama HSN 2026'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Kop Surat
  doc.setFillColor(3, 21, 37);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(242, 201, 109);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PANITIA FESTIVAL HARI SANTRI NASIONAL 2026', 105, 10, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO', 105, 16, { align: 'center' });

  doc.setTextColor(0, 217, 245);
  doc.setFontSize(8);
  doc.text('Sekretariat: Kantor MWC NU Poncokusumo, Malang | Email: hsnmwcnupon@gmail.com', 105, 22, { align: 'center' });

  // Judul Dokumen
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('BERITA ACARA PENETAPAN JUARA & PEMENANG LOMBA', 105, 38, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 107, 79);
  doc.line(35, 41, 175, 41);

  // Paragraf Pembuka
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const introText =
    `Pada hari ini, ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, bertempat di Sekretariat Panitia Festival Hari Santri Nasional 2026 MWC NU Kecamatan Poncokusumo Kabupaten Malang, telah dilaksanakan Sidang Pleno Penetapan Pemenang Dewan Juri untuk cabang perlombaan:`;
  doc.text(doc.splitTextToSize(introText, 182), 14, 48);

  // Identitas Lomba
  doc.setFont('helvetica', 'bold');
  doc.text(`Cabang Lomba : ${competition.title}`, 20, 62);
  doc.text(`Kategori      : ${competition.category}`, 20, 67);
  doc.text(`Kode Lomba    : ${competition.code || competition.id}`, 20, 72);

  // Dewan Juri Bertugas
  doc.setFont('helvetica', 'normal');
  doc.text('Dewan Juri yang bertugas melakukan penilaian:', 14, 80);
  juries.forEach((j, idx) => {
    doc.text(`${idx + 1}. ${j.fullName} (${j.institution || 'MWC NU Poncokusumo'})`, 20, 86 + idx * 5);
  });

  const afterJuryY = 86 + juries.length * 5 + 4;
  doc.text(
    'Berdasarkan akumulasi nilai murni, orisinalitas, penguasaan kriteria teknis, serta musyawarah mufakat dewan juri, dengan ini menetapkan nama-nama peserta di bawah ini sebagai Pemenang Resmi:',
    14,
    afterJuryY,
    { maxWidth: 182 }
  );

  // Tabel Juara
  const tableData = winners.map((w) => [
    w.winnerTitle || `Peringkat ${w.rank}`,
    w.participant.registrationNumber || '-',
    w.participant.fullName || '-',
    w.participant.institution || '-',
    w.averageScore.toFixed(2),
  ]);

  autoTable(doc, {
    startY: afterJuryY + 12,
    head: [['Gelar Kejuaraan', 'No. Registrasi', 'Nama Santri / Peserta', 'Asal Lembaga / Instansi', 'Nilai']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 107, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', textColor: [0, 107, 79], cellWidth: 32 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
      2: { cellWidth: 48 },
      3: { cellWidth: 50 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
    },
  });

  const tableFinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 190;

  // Catatan Keputusan
  if (decisionNotes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Catatan Sidang Dewan Juri: "${decisionNotes}"`, 14, tableFinalY);
  }

  const closingY = tableFinalY + (decisionNotes ? 6 : 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Demikian Berita Acara ini dibuat dengan sebenarnya dengan dilandasi rasa tanggung jawab, sportivitas, dan kejujuran. Keputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.',
    14,
    closingY,
    { maxWidth: 182 }
  );

  // Tanda Tangan
  const signBlockY = closingY + 14;
  doc.setFontSize(8.5);
  doc.text('Poncokusumo, ' + new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }), 14, signBlockY);

  // Kiri: Ketua Dewan Juri
  doc.text('Ketua Dewan Juri,', 14, signBlockY + 5);
  doc.text('( .................................................... )', 14, signBlockY + 24);
  if (juries[0]) {
    doc.setFont('helvetica', 'bold');
    doc.text(juries[0].fullName, 14, signBlockY + 23);
    doc.setFont('helvetica', 'normal');
  }

  // Tengah: Sekretaris Dewan Juri
  if (juries[1]) {
    doc.text('Sekretaris Dewan Juri,', 80, signBlockY + 5);
    doc.text('( .................................................... )', 80, signBlockY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(juries[1].fullName, 80, signBlockY + 23);
    doc.setFont('helvetica', 'normal');
  }

  // Kanan: Ketua Panitia Pelaksana
  doc.text('Mengetahui / Mengesahkan,', 140, signBlockY + 5);
  doc.text('Ketua Panitia HSN 2026,', 140, signBlockY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('GUS AHMAD AL-FATIH', 140, signBlockY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text('MWC NU Poncokusumo', 140, signBlockY + 28);

  doc.save(`Berita_Acara_Pemenang_${competition.code || competition.id}_HSN2026.pdf`);
}
