import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import { OverallGauge, PerformanceTrend } from "@/components/DashboardResults";
import {
  getProfile,
  getDimensions,
  getKpis,
  getLatestEntries,
  getApprovedEntries,
} from "@/lib/data";
import { achievementRatio } from "@/lib/period";
import { formatValue } from "@/lib/format";

export default async function DimensionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [dimensions, kpis, latest, approved] = await Promise.all([
    getDimensions(),
    getKpis(),
    getLatestEntries(),
    getApprovedEntries(),
  ]);

  const dim = dimensions.find((d) => d.id === id);
  if (!dim) notFound();

  const dimKpis = kpis.filter((k) => k.dimension_id === id);

  const rows = dimKpis
    .map((k) => {
      const value = latest[k.id]?.value ?? null;
      const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
      const ratio = achievementRatio(value, target, k.polarity);
      return { k, value, target, ratio };
    })
    .sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1));

  const withData = rows.filter((r) => r.ratio !== null);
  const overall =
    withData.length > 0
      ? Math.round(
          withData.reduce((s, r) => s + Math.min(r.ratio!, 100), 0) /
            withData.length
        )
      : 0;
  const met = withData.filter((r) => r.ratio! >= 100).length;
  const behind = withData.filter((r) => r.ratio! < 75).length;

  // اتجاه المنظور عبر الزمن
  const Q = ["ر1", "ر2", "ر3", "ر4"];
  const buckets = new Map<string, { sum: number; n: number; order: number }>();
  for (const e of approved) {
    if (!e.kpi || e.kpi.dimension_id !== id) continue;
    const d = new Date(e.period_end ?? e.period_date);
    if (Number.isNaN(d.getTime())) continue;
    const q = Math.floor(d.getMonth() / 3) + 1;
    const year = d.getFullYear();
    const qt =
      [e.kpi.target_q1, e.kpi.target_q2, e.kpi.target_q3, e.kpi.target_q4][
        q - 1
      ] ??
      e.kpi.target_total ??
      null;
    const ratio = achievementRatio(e.value, qt, e.kpi.polarity);
    if (ratio === null) continue;
    const key = `${Q[q - 1]} ${year}`;
    const cur = buckets.get(key) ?? { sum: 0, n: 0, order: year * 10 + q };
    cur.sum += Math.min(ratio, 100);
    cur.n += 1;
    buckets.set(key, cur);
  }
  const trendData = [...buckets.entries()]
    .map(([period, v]) => ({
      period,
      score: Math.round(v.sum / v.n),
      count: v.n,
      order: v.order,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ period, score, count }) => ({ period, score, count }));

  const color = (r: number | null) =>
    r === null
      ? "#cbd5e1"
      : r >= 100
      ? "#16a34a"
      : r >= 75
      ? "#f59e0b"
      : "#A11249";

  return (
    <>
      <Header profile={profile} title={`تحليل المنظور: ${dim.name}`} />
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-mushar-primary hover:underline"
        >
          → العودة إلى لوحة القيادة
        </Link>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="عدد المؤشرات" value={dimKpis.length} accent={dim.color} />
          <StatCard label="محقّقة" value={met} accent="#16a34a" />
          <StatCard label="متعثّرة" value={behind} accent="#A11249" />
          <StatCard
            label="لها نتائج"
            value={withData.length}
            accent="#94a3b8"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <OverallGauge score={overall} />
          <div className="lg:col-span-2">
            <PerformanceTrend data={trendData} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-mushar-dark">
            مؤشرات المنظور
          </h3>
          <div className="space-y-3">
            {rows.map((r) => (
              <Link
                key={r.k.id}
                href={`/kpis/${r.k.id}`}
                className="block rounded-xl px-2 py-2 transition hover:bg-slate-50"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-medium text-mushar-dark">
                    {r.k.name}
                  </span>
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{ color: color(r.ratio) }}
                  >
                    {r.ratio !== null ? `${r.ratio}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{r.k.frequency || "—"}</span>
                  <span>
                    {r.value !== null
                      ? `المتحقق ${formatValue(r.value, r.k.unit)}`
                      : "بانتظار النتيجة"}{" "}
                    {r.target !== null
                      ? `· المستهدف ${formatValue(r.target, r.k.unit)}`
                      : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(r.ratio ?? 0, 100)}%`,
                      backgroundColor: color(r.ratio),
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
