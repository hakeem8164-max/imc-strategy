import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Kpi } from "@/lib/types";
import { formatValue, achievementPct, achievementColor } from "@/lib/format";

export default function KpiCard({
  kpi,
  value = null,
  prevValue = null,
}: {
  kpi: Kpi;
  value?: number | null;
  prevValue?: number | null;
}) {
  const target = kpi.target_total ?? kpi.target_q4 ?? kpi.target_q3 ?? null;
  const pct = achievementPct(value, target);
  const color = achievementColor(pct);

  let trend: null | { up: boolean; flat: boolean; good: boolean } = null;
  if (value !== null && prevValue !== null && prevValue !== undefined) {
    const delta = value - prevValue;
    const up = delta > 0;
    const good = kpi.polarity === "negative" ? !up : up;
    trend = { up, flat: delta === 0, good };
  }
  const trendColor = !trend
    ? "#94a3b8"
    : trend.flat
    ? "#94a3b8"
    : trend.good
    ? "#16a34a"
    : "#A11249";

  return (
    <Link
      href={`/kpis/${kpi.id}`}
      className="card group flex flex-col gap-3 p-5 transition hover:shadow-cardHover"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: `${kpi.dimension?.color ?? "#056073"}1a`,
            color: kpi.dimension?.color ?? "#056073",
          }}
        >
          {kpi.dimension?.name ?? "—"}
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {kpi.frequency}
        </span>
      </div>

      <h3 className="text-sm font-bold leading-relaxed text-mushar-dark line-clamp-2">
        {kpi.name}
      </h3>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">آخر قيمة</p>
          <p className="text-xl font-extrabold text-mushar-dark">
            {formatValue(value, kpi.unit)}
          </p>
          {prevValue !== null && prevValue !== undefined && (
            <span
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: trendColor }}
              title="مقارنةً بالقياس السابق"
            >
              {trend &&
                (trend.flat ? (
                  <Minus size={13} />
                ) : trend.up ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                ))}
              السابق: {formatValue(prevValue, kpi.unit)}
            </span>
          )}
        </div>
        {target !== null && (
          <div className="shrink-0 text-left">
            <p className="whitespace-nowrap text-xs text-slate-400">
              المستهدف الكلي
            </p>
            <p className="text-sm font-semibold text-slate-600">
              {formatValue(target, kpi.unit)}
            </p>
          </div>
        )}
      </div>

      {pct !== null && (
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium">
            <span style={{ color }}>{pct}% من المستهدف الكلي</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
