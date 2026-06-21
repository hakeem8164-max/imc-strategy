"use client";

import { computeAutoStatus, AUTO_STATUS, achievedWeight } from "@/lib/initiative-status";
import type { KpiInitiative } from "@/lib/data";

type Row = {
  id: string;
  title: string;
  start: number;
  due: number;
  color: string;
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
      color:
        AUTO_STATUS[
          computeAutoStatus({
            done: !!i.completed_at || allDone || prog >= 100,
            start_date: startStr,
            due_date: dueStr,
          })
        ].color,
      progress: prog,
    });
  }

  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        لا مبادرات بتواريخ كافية لعرض المخطط الرئيسي.
      </p>
    );

  const minY = new Date(Math.min(...rows.map((r) => r.start))).getFullYear();
  const maxY = new Date(Math.max(...rows.map((r) => r.due))).getFullYear();
  const axisMin = +new Date(minY, 0, 1);
  const axisMax = +new Date(maxY + 1, 0, 1);
  const span = Math.max(axisMax - axisMin, 1);
  const pos = (t: number) => ((t - axisMin) / span) * 100;

  const years: number[] = [];
  for (let y = minY; y <= maxY; y++) years.push(y);

  // الأشهر مع خطوط الأسابيع (4 لكل شهر)
  const months: { start: number; next: number; m: number }[] = [];
  for (let y = minY; y <= maxY; y++)
    for (let mo = 0; mo < 12; mo++)
      months.push({ start: +new Date(y, mo, 1), next: +new Date(y, mo + 1, 1), m: mo });

  const monthCount = months.length;
  const minWidth = Math.max(monthCount * 46, 560);
  const now = Date.now();
  const todayPct = now >= axisMin && now <= axisMax ? pos(now) : null;

  const MONTH_AR = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  return (
   <div>
    <div dir="rtl" className="flex gap-2">
      {/* عمود الأسماء (يمين) */}
      <div className="w-40 shrink-0">
        <div className="h-[44px]" />
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex h-7 items-center truncate text-[11px] font-medium text-slate-600"
            title={r.title}
          >
            {r.title}
          </div>
        ))}
      </div>

      {/* منطقة المخطط */}
      <div className="flex-1 overflow-x-auto">
        <div className="relative" style={{ minWidth }}>
          {/* شريط السنوات */}
          <div className="relative h-5">
            {years.map((y) => {
              const left = pos(+new Date(y, 0, 1));
              const width = pos(+new Date(y + 1, 0, 1)) - left;
              return (
                <div
                  key={y}
                  className="absolute top-0 flex h-5 items-center justify-center border-l border-slate-200 text-[11px] font-bold text-mushar-dark"
                  style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                >
                  {y}
                </div>
              );
            })}
          </div>
          {/* شريط الأشهر */}
          <div className="relative h-6 border-b border-slate-200">
            {months.map((mo, idx) => {
              const left = pos(mo.start);
              const width = pos(mo.next) - left;
              return (
                <div
                  key={idx}
                  className="absolute top-0 flex h-6 items-center justify-center border-l border-slate-100 text-[10px] text-slate-400"
                  style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                >
                  {MONTH_AR[mo.m]}
                </div>
              );
            })}
          </div>

          {/* خطوط الأسابيع + الأشهر + اليوم خلف الصفوف */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0" style={{ top: 44 }}>
            {months.map((mo, idx) => {
              const left = pos(mo.start);
              const w = pos(mo.next) - left;
              return (
                <div key={idx}>
                  <div className="absolute bottom-0 top-0 border-l border-slate-200/70" style={{ insetInlineStart: `${left}%` }} />
                  {[1, 2, 3].map((k) => (
                    <div
                      key={k}
                      className="absolute bottom-0 top-0 border-l border-dashed border-slate-100"
                      style={{ insetInlineStart: `${left + (w * k) / 4}%` }}
                    />
                  ))}
                </div>
              );
            })}
            {todayPct !== null && (
              <div
                className="absolute bottom-0 top-0 z-10 w-0.5 bg-mushar-accent"
                style={{ insetInlineStart: `${todayPct}%` }}
                title="اليوم"
              />
            )}
          </div>

          {/* الصفوف */}
          <div className="relative">
            {rows.map((r) => {
              const left = pos(r.start);
              const width = Math.max(pos(r.due) - left, 1);
              return (
                <div key={r.id} className="relative h-7">
                  <div
                    className="absolute top-1 h-5 overflow-hidden rounded"
                    style={{
                      insetInlineStart: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `${r.color}33`,
                    }}
                  >
                    <div
                      className="flex h-full items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${r.progress}%`, backgroundColor: r.color }}
                    >
                      {width > 6 ? `${r.progress}%` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
