"use client";

export type GanttRow = {
  id: string;
  title: string;
  start: number; // ms
  due: number; // ms
  color: string;
  progress: number; // 0..100
};

const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

export default function GanttChart({
  rows,
  labelWidth = 150,
  monthWidth = 76,
}: {
  rows: GanttRow[];
  labelWidth?: number;
  monthWidth?: number;
}) {
  if (rows.length === 0)
    return <p className="text-xs text-slate-400">لا بيانات كافية لعرض المخطط.</p>;

  const minT = Math.min(...rows.map((r) => r.start));
  const maxT = Math.max(...rows.map((r) => r.due));
  const dMin = new Date(minT);
  const dMax = new Date(maxT);
  const axisMin = +new Date(dMin.getFullYear(), dMin.getMonth(), 1);
  const axisMax = +new Date(dMax.getFullYear(), dMax.getMonth() + 1, 1);
  const span = Math.max(axisMax - axisMin, 1);
  const pos = (t: number) => ((t - axisMin) / span) * 100;

  const months: { start: number; next: number; m: number; y: number }[] = [];
  {
    const c = new Date(axisMin);
    while (+c < axisMax) {
      const next = new Date(c.getFullYear(), c.getMonth() + 1, 1);
      months.push({ start: +c, next: +next, m: c.getMonth(), y: c.getFullYear() });
      c.setMonth(c.getMonth() + 1);
    }
  }
  const years = Array.from(new Set(months.map((mo) => mo.y)));
  const minWidth = Math.max(months.length * monthWidth, 480);
  const now = Date.now();
  const todayPct = now >= axisMin && now <= axisMax ? pos(now) : null;
  const headerH = 64;

  return (
    <div dir="rtl" className="flex gap-2">
      {/* الأسماء يميناً */}
      <div className="shrink-0" style={{ width: labelWidth }}>
        <div style={{ height: headerH }} />
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

      {/* المخطط */}
      <div className="flex-1 overflow-x-auto">
        <div className="relative" style={{ minWidth }}>
          {/* السنوات */}
          <div className="relative h-5">
            {years.map((y) => {
              const left = pos(+new Date(y, 0, 1) < axisMin ? axisMin : +new Date(y, 0, 1));
              const end = +new Date(y + 1, 0, 1) > axisMax ? axisMax : +new Date(y + 1, 0, 1);
              return (
                <div
                  key={y}
                  className="absolute top-0 flex h-5 items-center justify-center border-l border-slate-200 text-[11px] font-bold text-mushar-dark"
                  style={{ insetInlineStart: `${left}%`, width: `${pos(end) - left}%` }}
                >
                  {y}
                </div>
              );
            })}
          </div>
          {/* أسماء الأشهر */}
          <div className="relative h-6">
            {months.map((mo, idx) => {
              const left = pos(mo.start);
              return (
                <div
                  key={idx}
                  className="absolute top-0 flex h-6 items-center justify-center overflow-hidden border-l border-slate-200 text-[10px] font-semibold text-slate-500"
                  style={{ insetInlineStart: `${left}%`, width: `${pos(mo.next) - left}%` }}
                >
                  {MONTHS_AR[mo.m]}
                </div>
              );
            })}
          </div>
          {/* أرقام الأسابيع بالنسبة للسنة */}
          <div className="relative h-5 border-b border-slate-200">
            {months.map((mo, idx) => {
              const left = pos(mo.start);
              const w = pos(mo.next) - left;
              return [0, 1, 2, 3].map((k) => {
                const segStart = mo.start + ((mo.next - mo.start) * k) / 4;
                const jan1 = +new Date(new Date(segStart).getFullYear(), 0, 1);
                const week = Math.floor((segStart - jan1) / (7 * 86400000)) + 1;
                return (
                  <div
                    key={`${idx}-${k}`}
                    className={`absolute top-0 flex h-5 items-center justify-center text-[9px] text-slate-400 ${k === 0 ? "border-l border-slate-200" : "border-l border-dashed border-slate-100"}`}
                    style={{ insetInlineStart: `${left + (w * k) / 4}%`, width: `${w / 4}%` }}
                    title={`أسبوع ${week} من ${new Date(segStart).getFullYear()}`}
                  >
                    {week}
                  </div>
                );
              });
            })}
          </div>

          {/* خطوط شبكية + اليوم خلف الصفوف */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0" style={{ top: headerH }}>
            {months.map((mo, idx) => {
              const left = pos(mo.start);
              const w = pos(mo.next) - left;
              return (
                <div key={idx}>
                  <div className="absolute bottom-0 top-0 border-l border-slate-200/70" style={{ insetInlineStart: `${left}%` }} />
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="absolute bottom-0 top-0 border-l border-dashed border-slate-100" style={{ insetInlineStart: `${left + (w * k) / 4}%` }} />
                  ))}
                </div>
              );
            })}
            {todayPct !== null && (
              <div className="absolute bottom-0 top-0 z-10 w-0.5 bg-mushar-accent" style={{ insetInlineStart: `${todayPct}%` }} title="اليوم" />
            )}
          </div>

          {/* الصفوف */}
          <div className="relative">
            {rows.map((r) => {
              const left = pos(r.start);
              const width = Math.max(pos(r.due) - left, 0.8);
              return (
                <div key={r.id} className="relative h-7">
                  <div
                    className="absolute top-1 h-5 overflow-hidden rounded"
                    style={{ insetInlineStart: `${left}%`, width: `${width}%`, backgroundColor: `${r.color}33` }}
                    title={`${new Date(r.start).toLocaleDateString("en-CA")} → ${new Date(r.due).toLocaleDateString("en-CA")} · ${r.progress}%`}
                  >
                    <div
                      className="flex h-full items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${Math.min(r.progress, 100)}%`, backgroundColor: r.color }}
                    >
                      {width > 5 ? `${r.progress}%` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
