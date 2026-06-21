import type { Kpi, Polarity } from "@/lib/types";

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const Q_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"];
const Q_ENDS = ["03-31", "06-30", "09-30", "12-31"];

export interface PeriodOption {
  key: string;
  label: string;
  start: string; // بداية الفترة YYYY-MM-DD
  date: string; // نهاية الفترة YYYY-MM-DD
  quarter: number; // الربع الذي تقع فيه الفترة (لمطابقة المستهدف)
  useTotal?: boolean; // للسنوي: استخدم المستهدف الكلي
}

function monthStart(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
}
function monthEnd(year: number, monthIdx: number): string {
  const d = new Date(year, monthIdx + 1, 0).getDate();
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const qStart = ["01-01", "04-01", "07-01", "10-01"];
const qOf = (monthIdx: number) => Math.floor(monthIdx / 3) + 1;

/** يولّد فترات السنة حسب دورية القياس */
export function periodsForFrequency(
  frequency: string | null,
  year: number
): PeriodOption[] {
  const f = (frequency ?? "").trim();

  if (f === "شهري") {
    return MONTHS.map((m, i) => ({
      key: `m${i}`,
      label: `${m} ${year}`,
      start: monthStart(year, i),
      date: monthEnd(year, i),
      quarter: qOf(i),
    }));
  }

  if (f === "كل أسبوعين") {
    const out: PeriodOption[] = [];
    MONTHS.forEach((m, i) => {
      out.push({
        key: `b${i}a`,
        label: `1–15 ${m} ${year}`,
        start: monthStart(year, i),
        date: `${year}-${String(i + 1).padStart(2, "0")}-15`,
        quarter: qOf(i),
      });
      out.push({
        key: `b${i}b`,
        label: `16–نهاية ${m} ${year}`,
        start: `${year}-${String(i + 1).padStart(2, "0")}-16`,
        date: monthEnd(year, i),
        quarter: qOf(i),
      });
    });
    return out;
  }

  if (f === "نصف سنوي") {
    return [
      { key: "h1", label: `النصف الأول ${year}`, start: `${year}-01-01`, date: `${year}-06-30`, quarter: 2 },
      { key: "h2", label: `النصف الثاني ${year}`, start: `${year}-07-01`, date: `${year}-12-31`, quarter: 4 },
    ];
  }

  if (f === "سنوي") {
    return [
      { key: "y", label: `سنة ${year}`, start: `${year}-01-01`, date: `${year}-12-31`, quarter: 4, useTotal: true },
    ];
  }

  // ربعي والافتراضي
  return [1, 2, 3, 4].map((q) => ({
    key: `q${q}`,
    label: `الربع ${Q_NAMES[q - 1]} ${year}`,
    start: `${year}-${qStart[q - 1]}`,
    date: `${year}-${Q_ENDS[q - 1]}`,
    quarter: q,
  }));
}

/** الفترة الحالية حسب الدورية وتاريخ اليوم */
export function currentPeriodKey(
  frequency: string | null,
  d = new Date()
): string {
  const f = (frequency ?? "").trim();
  const m = d.getMonth();
  const day = d.getDate();
  if (f === "شهري") return `m${m}`;
  if (f === "كل أسبوعين") return `b${m}${day <= 15 ? "a" : "b"}`;
  if (f === "نصف سنوي") return m <= 5 ? "h1" : "h2";
  if (f === "سنوي") return "y";
  return `q${qOf(m)}`;
}

export function currentYear(d = new Date()): number {
  return d.getFullYear();
}

/** المستهدف المطابق للفترة (ربع أو كلي) */
export function periodTarget(kpi: Kpi, p: PeriodOption): number | null {
  if (p.useTotal) return kpi.target_total ?? null;
  return (
    [kpi.target_q1, kpi.target_q2, kpi.target_q3, kpi.target_q4][p.quarter - 1] ??
    null
  );
}

/** نسبة التحقّق مقابل المستهدف مع مراعاة القطبية (سالبة = الأقل أفضل) */
export function achievementRatio(
  value: number | null | undefined,
  target: number | null | undefined,
  polarity: Polarity
): number | null {
  if (value === null || value === undefined) return null;
  if (target === null || target === undefined || target === 0) return null;
  const pct =
    polarity === "negative" ? (target / value) * 100 : (value / target) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(pct);
}

/** اسم فترة قياس مشتق من تاريخ النهاية حسب الدورية */
export function labelForDate(frequency: string | null, dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const f = (frequency ?? "").trim();
  const m = d.getMonth();
  const year = d.getFullYear();
  if (f === "شهري") return `${MONTHS[m]} ${year}`;
  if (f === "كل أسبوعين")
    return d.getDate() <= 15
      ? `1–15 ${MONTHS[m]} ${year}`
      : `16–نهاية ${MONTHS[m]} ${year}`;
  if (f === "نصف سنوي") return m <= 5 ? `النصف الأول ${year}` : `النصف الثاني ${year}`;
  if (f === "سنوي") return `سنة ${year}`;
  return `الربع ${Q_NAMES[qOf(m)]} ${year}`;
}

/** المستهدف المطابق لتاريخ النهاية (ربع أو كلي للسنوي) */
export function targetForDate(kpi: Kpi, dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return kpi.target_total ?? null;
  if ((kpi.frequency ?? "").trim() === "سنوي") return kpi.target_total ?? null;
  const q = qOf(d.getMonth());
  return (
    [kpi.target_q1, kpi.target_q2, kpi.target_q3, kpi.target_q4][q - 1] ??
    kpi.target_total ??
    null
  );
}

export interface AchStatus {
  pct: number | null;
  label: string;
  color: string;
  met: boolean;
}

export function achievementStatus(
  value: number | null | undefined,
  target: number | null | undefined,
  polarity: Polarity
): AchStatus {
  if (value === null || value === undefined)
    return { pct: null, label: "لا توجد نتيجة", color: "#94a3b8", met: false };
  if (target === null || target === undefined || target === 0)
    return { pct: null, label: "بلا مستهدف", color: "#94a3b8", met: false };
  const pct = Math.round((value / target) * 100);
  const met = polarity === "negative" ? value <= target : value >= target;
  let color: string;
  let label: string;
  if (met) {
    color = "#16a34a";
    label = "محقّق";
  } else {
    const ratio = polarity === "negative" ? target / value : value / target;
    if (ratio >= 0.75) {
      color = "#f59e0b";
      label = "قريب من المستهدف";
    } else {
      color = "#A11249";
      label = "متعثّر";
    }
  }
  return { pct, label, color, met };
}
