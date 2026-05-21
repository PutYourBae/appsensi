import * as XLSX from "xlsx";
import { formatRupiah } from "@/lib/mock-data";

export interface IncomeDataRow {
  memberId: string;
  memberName: string;
  hadir: number;
  persentase: number;
  eligible: boolean;
  pendapatan: number;
  pembulatan: number;
}

export interface AttendanceExportRow {
  name: string;
  id: string;
  days: Record<number, boolean>;
  total: number;
  persen: string;
  totalDays: number;
}

// ── Excel: Pendapatan ───────────────────────────────────────────────────────
export function exportToExcel(
  data: IncomeDataRow[],
  filename: string,
  totalSaldo: number,
  totalDibagi: number
) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: string[][] = [
    ["LAPORAN DISTRIBUSI PENDAPATAN GTA MABAR"],
    [""],
    ["Total Saldo Pembagian", formatRupiah(totalSaldo)],
    ["Total Dibagikan", formatRupiah(totalDibagi)],
    ["Sisa Pembulatan", formatRupiah(totalSaldo - totalDibagi)],
    ["Jumlah Anggota Eligible", data.filter((r) => r.eligible).length.toString()],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  // Detail sheet
  const header = [
    "No",
    "Nama Anggota",
    "ID Anggota",
    "Kehadiran (hari)",
    "Persentase (%)",
    "Eligible",
    "Pendapatan Kotor (Rp)",
    "Pendapatan Bersih (Rp)",
  ];

  const rows = data.map((row, i) => [
    i + 1,
    row.memberName,
    row.memberId,
    row.hadir,
    parseFloat(row.persentase.toFixed(2)),
    row.eligible ? "Ya" : "Tidak",
    row.pendapatan,
    row.pembulatan,
  ]);

  const wsDetail = XLSX.utils.aoa_to_sheet([header, ...rows]);
  wsDetail["!cols"] = [
    { wch: 4 },   // No
    { wch: 22 },  // Nama
    { wch: 12 },  // ID
    { wch: 16 },  // Kehadiran
    { wch: 14 },  // Persentase
    { wch: 10 },  // Eligible
    { wch: 22 },  // Kotor
    { wch: 24 },  // Bersih
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Pendapatan");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Excel: Absensi CSV ──────────────────────────────────────────────────────
export function exportAttendanceCSV(
  rows: AttendanceExportRow[],
  filename: string,
  monthLabel: string
) {
  if (rows.length === 0) return;
  const totalDays = rows[0].totalDays;

  // Build header row: Name, ID, 1, 2, ..., totalDays, Total, %
  const dayHeaders = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());
  const header = ["Nama", "ID", ...dayHeaders, "Total", "%"];

  const dataRows = rows.map((r) => {
    const dayCells = Array.from({ length: totalDays }, (_, i) =>
      r.days[i + 1] === true ? "✓" : "-"
    );
    return [r.name, r.id, ...dayCells, r.total, r.persen];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

  // Fixed-width cols: Name(22), ID(10), day cols(4 each), Total(8), %(6)
  ws["!cols"] = [
    { wch: 22 },
    { wch: 10 },
    ...Array(totalDays).fill({ wch: 4 }),
    { wch: 8 },
    { wch: 6 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Absensi ${monthLabel}`);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── PDF: Pendapatan ─────────────────────────────────────────────────────────
export async function exportToPDF(
  data: IncomeDataRow[],
  filename: string,
  title: string,
  totalSaldo: number,
  totalDibagi: number
) {
  // Dynamic import to avoid SSR issues
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");

  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN DISTRIBUSI PENDAPATAN", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 28);

  // Summary box
  doc.setFontSize(10);
  doc.text(`Total Saldo      : ${formatRupiah(totalSaldo)}`, 14, 38);
  doc.text(`Total Dibagi     : ${formatRupiah(totalDibagi)}`, 14, 44);
  doc.text(
    `Sisa Pembulatan  : ${formatRupiah(totalSaldo - totalDibagi)}`,
    14,
    50
  );

  const tableColumn = [
    "No",
    "Nama Anggota",
    "ID",
    "Hadir",
    "% Kehadiran",
    "Eligible",
    "Pendapatan Kotor",
    "Pendapatan Bersih",
  ];

  const tableRows = data.map((row, i) => [
    i + 1,
    row.memberName,
    row.memberId,
    row.hadir,
    `${row.persentase.toFixed(2)}%`,
    row.eligible ? "Ya" : "Tidak",
    formatRupiah(row.pendapatan),
    formatRupiah(row.pembulatan),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 58,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [108, 92, 231],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  doc.save(`${filename}.pdf`);
}
