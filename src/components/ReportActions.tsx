"use client";

import { Printer, FileSpreadsheet } from "lucide-react";

export type ReportRow = {
  name: string;
  dim: string;
  unit: string;
  value: string;
  target: string;
  ratio: string;
  status: string;
  period: string;
};

export default function ReportActions({
  rows,
  filename,
}: {
  rows: ReportRow[];
  filename: string;
}) {
  function exportCsv() {
    const headers = [
      "المؤشر",
      "البُعد",
      "الإدارة",
      "القيمة",
      "المستهدف",
      "نسبة التحقّق %",
      "الحالة",
      "الفترة",
    ];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(","),
      ...rows.map((r) =>
        [r.name, r.dim, r.unit, r.value, r.target, r.ratio, r.status, r.period]
          .map(esc)
          .join(",")
      ),
    ];
    // BOM لضمان قراءة العربية في Excel
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button onClick={() => window.print()} className="btn-primary">
        <Printer size={16} />
        طباعة / حفظ PDF
      </button>
      <button onClick={exportCsv} className="btn-ghost">
        <FileSpreadsheet size={16} />
        تصدير Excel/CSV
      </button>
    </div>
  );
}
