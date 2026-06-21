import type { Unit } from "./types";

const numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatValue(value: number | null | undefined, unit: Unit): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = numFmt.format(value);
  switch (unit) {
    case "%":
      return `${n}%`;
    case "$":
      return `${n} ر.س`;
    case "#":
      return n;
    default:
      return n;
  }
}

/**
 * نسبة الإنجاز مقابل المستهدف. للمؤشرات التي يكون فيها الأقل أفضل
 * (مثل المصاريف والانحراف) يجب أن تُحسب بشكل عكسي، لكن نكتفي هنا
 * بالنسبة المباشرة كمؤشر بصري عام.
 */
export function achievementPct(
  value: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  if (target === null || target === undefined || target === 0) return null;
  return Math.round((value / target) * 100);
}

export function achievementColor(pct: number | null): string {
  if (pct === null) return "#94a3b8";
  if (pct >= 100) return "#16a34a";
  if (pct >= 75) return "#67C5B9";
  if (pct >= 50) return "#f59e0b";
  return "#A11249";
}
