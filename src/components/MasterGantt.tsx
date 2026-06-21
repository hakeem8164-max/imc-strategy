"use client";

import { computeAutoStatus, AUTO_STATUS } from "@/lib/initiative-status";
import type { KpiInitiative } from "@/lib/data";

type Row = {
  id: string;
  title: string;
  start: number;
  due: number;
  color: string;
  label: string;
  progress: number;
};

export default function MasterGantt({
  initiatives,
}: {
  initiatives: KpiInitiative[];
}) {
  const rows: Row[] = [];
  const unscheduled: string[] = [];

  for (const i of initiatives) {
    const ms = i.milestones ?? [];
    const starts = ms.map((m) => m.start_date).filter(Boolean) as string[];
    const dues = ms.map((m) => m.due_date).filter(Boolean) as string[];
    const startStr = i.start_date ?? starts.sort()[0] ?? null;
    const dueStr = i.due_date ?? dues.sort().slice(-1)[0] ?? null;
    if (!startStr || !dueStr) {
      unscheduled.push(i.title);
      continue;
    }
    const doneWeight = ms
      .filter((m) => m.done)
      .reduce((a, m) => a + (m.weight ?? 0), 0);
    const allDone = ms.length > 0 && ms.every((m) => m.done);
    rows.push({
      id: i.id,
      title: i.title,
      start: +new Date(startStr),
      due: +new Date(dueStr),
      color:
        AUTO_STATUS[
          computeAutoStatus({
            done: !!i.completed_at || allDone || doneWeight === 100,
            start_date: startStr,
            due_date: dueStr,
          })
        ].color,
      label: `${doneWeight}%`,
      progress: doneWeight,
    });
  }

  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        لا مبادرات بتواريخ كافية لعرض المخطط الرئيسي.
      </p>
    );

  // محور زمني بالأشهر
  const minD = new Date(Math.min(...rows.map((r) => r.start)));
  const maxD = new Date(Math.max(...rows.map((r) => r.due)));
  const axisMin = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const axisMax = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 1);
  const span = Math.max(+axisMax - +axisMin, 1);

  const months: Date[] = [];
  const cur = new Date(axisMin);
  while (+cur < +axisMax) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  const pos = (t: number) => ((t - +axisMin) / span) * 100;
  const now = Date.now();
  const todayPct = now >= +axisMin && now <= +axisMax ? pos(now) : null;

  return (
    <div dir="ltr" className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* رأس الأشهر */}
        <div className="grid grid-cols-[160px_1fr] gap-2">
          <span />
          <div className="relative h-6 border-b border-slate-200">
            {months.map((m, idx) => (
              <div
                key={idx}
                className="absolute top-0 h-6 border-l border-slate-100 pl-1 text-[10px] text-slate-400"
                style={{ left: `${pos(+m)}%` }}
              >
                {m.toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}
              </div>
            ))}
          </div>
        </div>

        {/* الصفوف */}
        <div className="mt-1 space-y-1.5">
          {rows.map((r) => {
            const left = pos(r.start);
            const width = Math.max(pos(r.due) - pos(r.start), 1.5);
            return (
              <div key={r.id} className="grid grid-cols-[160px_1fr] items-center gap-2">
                <span
                  dir="rtl"
                  className="truncate text-[11px] font-medium text-slate-600"
                  title={r.title}
                >
                  {r.title}
                </span>
                <div className="relative h-6 rounded bg-slate-50">
                  {todayPct !== null && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-mushar-accent/70"
                      style={{ left: `${todayPct}%` }}
                      title="اليوم"
                    />
                  )}
                  <div
                    className="absolute top-0.5 flex h-5 items-center justify-end rounded px-1.5 text-[10px] font-bold text-white"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: r.color }}
                  >
                    {width > 8 ? r.label : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <p dir="rtl" className="mt-3 text-[11px] text-slate-400">
          غير مجدولة (بلا تواريخ): {unscheduled.join("، ")}
        </p>
      )}
    </div>
  );
}
