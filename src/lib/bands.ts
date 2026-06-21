export interface Band {
  id: string;
  label: string;
  min_pct: number;
  color: string;
  sort_order: number;
}

export interface AppSettings {
  id: number;
  due_soon_days: number;
}

/** الشطور الافتراضية إن لم تُحمّل من قاعدة البيانات */
export const DEFAULT_BANDS: Band[] = [
  { id: "d1", label: "ممتاز", min_pct: 100, color: "#16a34a", sort_order: 1 },
  { id: "d2", label: "جيد جدًا", min_pct: 85, color: "#67C5B9", sort_order: 2 },
  { id: "d3", label: "جيد", min_pct: 70, color: "#f59e0b", sort_order: 3 },
  { id: "d4", label: "يحتاج تحسينًا", min_pct: 0, color: "#A11249", sort_order: 4 },
];

/** يرجع الشطر المطابق لنسبة التحقّق */
export function bandFor(
  pct: number | null | undefined,
  bands: Band[]
): { label: string; color: string } {
  if (pct === null || pct === undefined)
    return { label: "بلا بيانات", color: "#cbd5e1" };
  const sorted = [...bands].sort((a, b) => b.min_pct - a.min_pct);
  for (const b of sorted) {
    if (pct >= b.min_pct) return { label: b.label, color: b.color };
  }
  const last = sorted[sorted.length - 1];
  return last
    ? { label: last.label, color: last.color }
    : { label: "—", color: "#94a3b8" };
}
