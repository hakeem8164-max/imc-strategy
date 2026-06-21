"use client";

import { computeAutoStatus, AUTO_STATUS, achievedWeight } from "@/lib/initiative-status";
import GanttChart, { type GanttRow } from "@/components/GanttChart";
import type { KpiInitiative } from "@/lib/data";

export default function MasterGantt({
  initiatives,
}: {
  initiatives: KpiInitiative[];
}) {
  const rows: GanttRow[] = [];
  const unscheduled: string[] = [];

  for (const i of initiatives) {
    const ms = i.milestones ?? [];
    const starts = (ms.map((m) => m.start_date).filter(Boolean) as string[]).sort();
    const dues = (ms.map((m) => m.due_date).filter(Boolean) as string[]).sort();
    const startStr = i.start_date ?? starts[0] ?? null;
    const dueStr = i.due_date ?? dues.slice(-1)[0] ?? null;
    if (!startStr || !dueStr) {
      unscheduled.push(i.title);
      continue;
    }
    const prog = achievedWeight(ms);
    const allDone = ms.length > 0 && ms.every((m) => (m.progress ?? 0) >= 100);
    rows.push({
      id: i.id,
      title: i.title,
      start: +new Date(startStr),
      due: +new Date(dueStr),
      progress: prog,
      color:
        AUTO_STATUS[
          computeAutoStatus({
            done: !!i.completed_at || allDone || prog >= 100,
            start_date: startStr,
            due_date: dueStr,
          })
        ].color,
    });
  }

  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        لا مبادرات بتواريخ كافية لعرض المخطط الرئيسي.
      </p>
    );

  return (
    <div>
      <GanttChart rows={rows} />
      {unscheduled.length > 0 && (
        <p dir="rtl" className="mt-3 text-[11px] text-slate-400">
          غير مجدولة (بلا تواريخ): {unscheduled.join("، ")}
        </p>
      )}
    </div>
  );
}
