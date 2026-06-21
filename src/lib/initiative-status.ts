// حساب الحالة تلقائيًا بالتواريخ — للمعالم وللمبادرة
export type AutoStatus =
  | "not_started"
  | "in_progress"
  | "late"
  | "stalled"
  | "done";

export const AUTO_STATUS: Record<AutoStatus, { label: string; color: string }> = {
  not_started: { label: "لم يبدأ", color: "#94A3B8" },
  in_progress: { label: "وفق المخطط", color: "#16A34A" },
  late: { label: "متأخر", color: "#EAB308" },
  stalled: { label: "متعثر", color: "#DC2626" },
  done: { label: "منجز", color: "#0D9488" },
};

// متأخر حتى أسبوعين، وبعدها متعثر
export const LATE_LIMIT_DAYS = 14;

function toDay(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}
function todayUTC(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** الحالة التلقائية بناءً على تاريخ البداية/النهاية وحالة الإنجاز */
export function computeAutoStatus(opts: {
  done?: boolean;
  start_date: string | null;
  due_date: string | null;
  now?: Date;
}): AutoStatus {
  if (opts.done) return "done";
  const today = todayUTC(opts.now);
  if (opts.start_date && today < toDay(opts.start_date)) return "not_started";
  if (opts.due_date) {
    const due = toDay(opts.due_date);
    if (today <= due) return "in_progress";
    const overdue = Math.round((today - due) / 86400000);
    return overdue <= LATE_LIMIT_DAYS ? "late" : "stalled";
  }
  return "in_progress";
}

/** الوزن المنجَز = مجموع (وزن المعلم × نسبة إنجازه) ÷ 100 */
export function achievedWeight(
  milestones: { weight: number; progress: number }[]
): number {
  return Math.round(
    milestones.reduce((a, m) => a + (m.weight ?? 0) * (m.progress ?? 0), 0) / 100
  );
}
