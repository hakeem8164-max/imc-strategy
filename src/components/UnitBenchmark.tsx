import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { bandFor, type Band } from "@/lib/bands";

export type UnitStat = {
  name: string;
  count: number;
  score: number;
  met: number;
  behind: number;
  delta: number | null;
};

export default function UnitBenchmark({
  data,
  bands,
}: {
  data: UnitStat[];
  bands: Band[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.score), 100);

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-mushar-dark">
        <Trophy size={18} className="text-mushar-primary" />
        مقارنة أداء الإدارات
      </h3>
      <p className="mb-4 text-xs text-slate-400">
        ترتيب الإدارات حسب متوسط نسبة التحقّق، مع الاتجاه مقارنةً بالفترة السابقة
      </p>
      <div className="space-y-2.5">
        {data.map((u, i) => {
          const color = bandFor(u.score, bands).color;
          return (
            <div
              key={u.name}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-mushar-dark">
                    {u.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold" style={{ color }}>
                    {u.score}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(u.score / max) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                  <span>{u.count} مؤشر</span>
                  <span className="text-green-600">{u.met} محقّقة</span>
                  {u.behind > 0 && (
                    <span className="text-mushar-accent">{u.behind} متعثّرة</span>
                  )}
                  {u.delta !== null && (
                    <span
                      className={`flex items-center gap-0.5 font-semibold ${
                        u.delta > 0
                          ? "text-emerald-600"
                          : u.delta < 0
                          ? "text-rose-600"
                          : "text-slate-400"
                      }`}
                    >
                      {u.delta > 0 ? (
                        <TrendingUp size={12} />
                      ) : u.delta < 0 ? (
                        <TrendingDown size={12} />
                      ) : (
                        <Minus size={12} />
                      )}
                      {u.delta > 0 ? "+" : ""}
                      {u.delta} نقطة
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
