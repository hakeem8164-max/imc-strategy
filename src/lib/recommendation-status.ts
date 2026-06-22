// حالة التوصية تلقائيًا — تبدأ من تاريخ المحضر ولها تاريخ استحقاق
export type RecStatus =
  | "on_track"
  | "near_due"
  | "late"
  | "stalled"
  | "done";

export const REC_STATUS: Record<RecStatus, { label: string; color: string }> = {
  on_track: { label: "قيد التنفيذ", color: "#16A34A" },
  near_due: { label: "قريبة من الانتهاء", color: "#EAB308" },
  late: { label: "متأخرة", color: "#F97316" },
  stalled: { label: "متعثرة", color: "#DC2626" },
  done: { label: "منفّذة", color: "#0D9488" },
};

// قريبة من الانتهاء: 5 أيام أو أقل متبقية. متأخرة: حتى 5 أيام بعد الاستحقاق. متعثرة: فوق ذلك.
export const NEAR_DUE_DAYS = 5;
export const LATE_LIMIT_DAYS = 5;

function toDay(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}
function todayUTC(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function computeRecStatus(opts: {
  closed?: boolean;
  due_date: string | null;
  now?: Date;
}): RecStatus {
  if (opts.closed) return "done";
  if (!opts.due_date) return "on_track";
  const today = todayUTC(opts.now);
  const due = toDay(opts.due_date);
  const daysLeft = Math.round((due - today) / 86400000);
  if (daysLeft > NEAR_DUE_DAYS) return "on_track";
  if (daysLeft >= 0) return "near_due";
  // تجاوز الاستحقاق
  const overdue = -daysLeft;
  return overdue <= LATE_LIMIT_DAYS ? "late" : "stalled";
}
