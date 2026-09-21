import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ParticipantRegistration } from '../types';

/**
 * Helper to safely download a Blob file in modern browsers and iframes.
 * Provides fallback blob URL and manual link trigger.
 */
export function downloadBlobSafely(
  blob: Blob,
  filename: string
): { success: boolean; url: string } {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      } catch {
        // ignore
      }
    }, 3000);
    return { success: true, url };
  } catch (err) {
    console.error('downloadBlobSafely failed to click link:', err);
    return { success: false, url };
  }
}

/**
 * Safely print an HTML element without printing the whole dark background webpage.
 * Uses an isolated hidden iframe with print styles.
 */
export function printElementSafely(elementId: string): boolean {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return true;
    }

    let frame = document.getElementById('hsn-print-frame') as HTMLIFrameElement | null;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'hsn-print-frame';
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      document.body.appendChild(frame);
    }

    const doc = frame.contentWindow?.document || frame.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cetak Dokumen Resmi Festival HSN 2026</title>
          <style>
            @page { size: auto; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 10px;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #222; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          frame?.contentWindow?.focus();
          frame?.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
      return true;
    }
  } catch (err) {
    console.warn('printElementSafely failed, fallback to window.print():', err);
  }

  window.print();
  return true;
}

/**
 * Generate official PDF Ticket / Bukti Registrasi for a Participant
 */
export function generateRegistrationTicketPDF(
  ticket: ParticipantRegistration,
  triggerDownload: boolean = true
): {
  success: boolean;
  filename: string;
  url?: string;
  blob?: Blob;
} {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;

    // 1. Top Decorative Green Bar
    doc.setFillColor(0, 107, 79); // #006B4F
    doc.rect(0, 0, pageWidth, 5, 'F');
    doc.setFillColor(217, 180, 91); // #D9B45B
    doc.rect(0, 5, pageWidth, 1.5, 'F');

    // 2. Kop Surat Panitia
    // Logo NU Circle
    doc.setFillColor(0, 107, 79);
    doc.circle(26, 21, 9, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(242, 201, 109);
    doc.text('NU', 26, 23.5, { align: 'center' });

    // Kop Text
    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PANITIA FESTIVAL HARI SANTRI NASIONAL (HSN) 2026', 115, 17, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(0, 107, 79);
    doc.text('MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO', 115, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('"Mengawal Indonesia Merdeka Menuju Peradaban Dunia"', 115, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kab. Malang, Jawa Timur 65157', 115, 30, { align: 'center' });

    // Double Rule
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, 33, pageWidth - margin, 33);
    doc.setLineWidth(0.2);
    doc.line(margin, 34, pageWidth - margin, 34);

    // 3. Document Title & Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 107, 79);
    doc.text('KARTU TANDA PESERTA & BUKTI REGISTRASI RESMI', pageWidth / 2, 42, { align: 'center' });

    // 4. Highlighted Box for Registration Number
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(217, 180, 91);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, 46, pageWidth - margin * 2, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('NOMOR REGISTRASI RESMI', pageWidth / 2, 51, { align: 'center' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 107, 79);
    doc.text(ticket.registrationNumber, pageWidth / 2, 58, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const isPending = ticket.status.toLowerCase().includes('menunggu');
    const isRejected = ticket.status.toLowerCase().includes('tolak');
    if (isPending) {
      doc.setTextColor(217, 119, 6); // amber-600
    } else if (isRejected) {
      doc.setTextColor(225, 29, 72); // rose-600
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
    }
    doc.text(`[ STATUS: ${ticket.status.toUpperCase()} ]   •   WAKTU DAFTAR: ${ticket.registeredAt}`, pageWidth / 2, 64, { align: 'center' });

    // 5. Data Peserta Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('A. DATA IDENTITAS PESERTA & LEMBAGA', margin, 74);

    const fullAddressDisplay = [
      ticket.address,
      ticket.district ? `Kec. ${ticket.district}` : '',
      ticket.regency || '',
      ticket.province || ''
    ].filter(Boolean).join(', ');

    const participantData = [
      ['Nama Lengkap', `: ${ticket.fullName}`],
      ['Asal Lembaga / Sekolah', `: ${ticket.institution}`],
      ['Kategori Generasi', `: ${ticket.category}`],
      ['Cabang Perlombaan', `: ${ticket.competitionTitle}`],
      ['Tanggal Lahir', `: ${ticket.birthDate || '-'}`],
      ['Kontak WhatsApp', `: ${ticket.whatsapp}`],
      ['Alamat Email', `: ${ticket.email}`],
      ['Alamat Lengkap', `: ${fullAddressDisplay}`],
      ['Berkas Pendukung / Mandat', `: ${ticket.documentName || 'Surat Mandat / Keterangan Lembaga'}`],
      ['Bukti Pembayaran', `: ${ticket.paymentProofName ? `Terlampir (${ticket.paymentProofName})` : 'Tidak dilampirkan (Bebas Biaya / Diserahkan saat TM)'}`],
    ];

    autoTable(doc, {
      body: participantData,
      startY: 77,
      theme: 'plain',
      styles: {
        fontSize: 8.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52, textColor: [71, 85, 105] },
        1: { cellWidth: 130 },
      },
      margin: { left: margin, right: margin },
    });

    const afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 140;

    // 6. Security Box / QR Placeholder
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, afterTableY, pageWidth - margin * 2, 24, 2, 2, 'FD');

    // Mini QR Simulation Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin + 4, afterTableY + 3, 18, 18, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 107, 79);
    doc.text('HSN26', margin + 13, afterTableY + 11, { align: 'center' });
    doc.text('VALID', margin + 13, afterTableY + 15, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('VALIDASI REGISTRASI PESERTA', margin + 27, afterTableY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Harap tunjukkan dokumen ini (cetak atau file PDF) kepada petugas administrasi panitia saat\nTechnical Meeting.',
      margin + 27,
      afterTableY + 13
    );

    // 7. Ketentuan & Tata Tertib Penting
    const rulesY = afterTableY + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('B. GRUP WA PESERTA LOMBA', margin, rulesY);

    const rulesList = [
      '1. Lomba Permainan Tradisional (PAUD/RA/TK) = https://chat.whatsapp.com/DIHmvpIL5yjLgFqrMARSBs.',
      '2. Lomba Video Konten Kreatif HSN (SD/MI) = https://chat.whatsapp.com/JTQQrAbrjG5092DbN37GXt.',
      '3. Lomba Poster Digital HSN (SMP/MTs) = https://chat.whatsapp.com/DvJaElIcPmXKwmds8e4TJ9.',
      '4. Lomba Public Speaking HSN (MA/SMA/SMK) = https://chat.whatsapp.com/GBdDEb46fWzLwaW2phTmvR.',
      '5. Lomba Seni Pagar Nusa = https://chat.whatsapp.com/L3CO2E377DO7rFCQMclib8.',
      '6. Lomba Video Konten Kreatif (IPNU/IPPNU) = https://chat.whatsapp.com/GucbcI6eLBLJJXijpq8L2N.',
      '7. Lomba Video Konten Kreatif (Fatayat) = https://chat.whatsapp.com/GuzkmHNH1Ym4Xtgt4HoljS.',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    rulesList.forEach((r, idx) => {
      doc.text(r, margin, rulesY + 5 + idx * 4.5);
    });

    // 8. Tanda Tangan & Pengesahan Panitia
    const signY = rulesY + 70;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    // Kiri: Ketua Panitia
    doc.text('Mengetahui,', 40, signY);
    doc.setFont('helvetica', 'bold');
    doc.text('Ketua Panitia HSN 2026', 40, signY + 4);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Tanda Tangan & Stempel Resmi)', 40, signY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Far\'ul Anam, M.Pd', 40, signY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Panitia HSN 2026', 40, signY + 26);

    // Kanan: Sekretariat Pelaksana
    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Poncokusumo, ${nowStr}`, pageWidth - 40, signY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Sekretariat Administrasi', pageWidth - 40, signY + 4, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Tanda Tangan & Stempel Resmi)', pageWidth - 40, signY + 16, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Imam Muhidin, S.Pd', pageWidth - 40, signY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Koordinator Peserta & Pendaftaran', pageWidth - 40, signY + 26, { align: 'center' });

    // Footer copyright bar
    doc.setFillColor(0, 107, 79);
    doc.rect(0, 292, pageWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      'FESTIVAL SANTRI NUSANTARA 2026 • PERINGATAN HARI SANTRI NASIONAL 2026',
      pageWidth / 2,
      295.5,
      { align: 'center' }
    );

    // Generate output blob & conditionally trigger download
    const filename = `Bukti_Pendaftaran_HSN2026_${ticket.registrationNumber}.pdf`;
    const blob = doc.output('blob');
    let url: string | undefined;
    let success = true;

    if (triggerDownload) {
      try {
        doc.save(filename);
      } catch {
        // ignore
      }
      const dl = downloadBlobSafely(blob, filename);
      success = dl.success;
      url = dl.url;
    } else {
      try {
        url = URL.createObjectURL(blob);
      } catch {
        // fallback
      }
    }

    return { success, filename, url, blob };
  } catch (err) {
    console.error('generateRegistrationTicketPDF error:', err);
    return { success: false, filename: 'ticket.pdf' };
  }
}

/**
 * Generate official PDF Summary Report for Admin (Rekapitulasi Peserta Terdaftar)
 */
export function generateParticipantReportPDF(
  participants: ParticipantRegistration[],
  categoryFilter: string,
  statusFilter: string
): { success: boolean; filename: string; url?: string; blob?: Blob } {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm

    // Kop Surat Resmi
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text('PANITIA FESTIVAL HARI SANTRI NASIONAL (HSN) 2026', pageWidth / 2, 13, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(0, 107, 79);
    doc.text('MAJELIS WAKIL CABANG NAHDLATUL ULAMA (MWC NU) KECAMATAN PONCOKUSUMO', pageWidth / 2, 18.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text('Sekretariat: Kompleks Kantor MWC NU Poncokusumo, Kab. Malang, Jawa Timur 65157 • Narahubung Panitia: 0857-3119-4085', pageWidth / 2, 23, { align: 'center' });

    // Garis Ganda Kop Surat
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.7);
    doc.line(14, 25.5, pageWidth - 14, 25.5);
    doc.setLineWidth(0.2);
    doc.line(14, 26.5, pageWidth - 14, 26.5);

    // Judul Dokumen
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(10, 10, 10);
    doc.text('DAFTAR REKAPITULASI PESERTA TERDAFTAR', pageWidth / 2, 32.5, { align: 'center' });

    // Info Filter & Waktu Cetak
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const catText = categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter;
    const statText = statusFilter === 'ALL' ? 'Semua Status' : statusFilter;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Kategori: ${catText}   •   Status: ${statText}   •   Total: ${participants.length} Peserta   •   Tanggal Cetak: ${dateStr}`, pageWidth / 2, 37, { align: 'center' });

    // Tabel 8 Kolom
    const tableHeaders = [
      ['NO.', 'NO. REG', 'NAMA PESERTA', 'KATEGORI', 'CABANG LOMBA', 'LEMBAGA', 'KONTAK WA', 'STATUS']
    ];

    const tableRows = participants.map((p, idx) => [
      (idx + 1).toString(),
      p.registrationNumber || '-',
      p.fullName || '-',
      p.category || '-',
      p.competitionTitle || '-',
      p.institution || '-',
      p.whatsapp || '-',
      p.status || '-'
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 30, 30],
        lineColor: [160, 160, 160],
        lineWidth: 0.1,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [3, 21, 37],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 30 },
        2: { fontStyle: 'bold', cellWidth: 42 },
        3: { halign: 'center', cellWidth: 24 },
        4: { cellWidth: 46 },
        5: { cellWidth: 50 },
        6: { halign: 'center', cellWidth: 32 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === 'Terverifikasi') {
            data.cell.styles.textColor = [0, 128, 80];
          } else if (val === 'Menunggu' || val === 'Menunggu Verifikasi') {
            data.cell.styles.textColor = [190, 110, 0];
          } else {
            data.cell.styles.textColor = [190, 20, 20];
          }
        }
      },
      margin: { left: 14, right: 14, bottom: 32 },
    });

    // Tanda Tangan Pengesahan di halaman akhir
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = finalY + 8;
    if (signY + 26 > pageHeight) {
      doc.addPage();
      signY = 22;
    }

    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);

    // Kiri: Ketua Panitia
    doc.text('Mengetahui,', 40, signY);
    doc.setFont('helvetica', 'bold');
    doc.text('Ketua Panitia HSN 2026', 40, signY + 4);
    doc.text('Far\'ul Anam, M.Pd', 40, signY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Panitia HSN 2026', 40, signY + 20);

    // Kanan: Sekretariat Pelaksana
    doc.text(`Poncokusumo, ${dateStr}`, pageWidth - 40, signY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text('Sekretariat Pelaksana', pageWidth - 40, signY + 4, { align: 'right' });
    doc.text('Imam Muhidin, S.Pd', pageWidth - 40, signY + 16, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Koordinator Administrasi & Peserta', pageWidth - 40, signY + 20, { align: 'right' });

    const sanitizedCat = categoryFilter.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Rekap_Peserta_HSN2026_${categoryFilter === 'ALL' ? 'Semua' : sanitizedCat}.pdf`;
    try {
      doc.save(filename);
    } catch {
      // ignore
    }
    const blob = doc.output('blob');
    const { success, url } = downloadBlobSafely(blob, filename);

    return { success, filename, url, blob };
  } catch (err) {
    console.error('generateParticipantReportPDF error:', err);
    return { success: false, filename: 'rekap_peserta.pdf' };
  }
}
