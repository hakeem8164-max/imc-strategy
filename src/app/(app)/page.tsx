import { redirect } from "next/navigation";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import PrintButton from "@/components/PrintButton";
import DueAlerts from "@/components/DueAlerts";
import OpenDecisions from "@/components/OpenDecisions";
import UnitBenchmark from "@/components/UnitBenchmark";
import DashboardFilters from "@/components/DashboardFilters";
import {
  OverallGauge,
  StatusDonut,
  DimensionRadar,
  DimensionBars,
  PerformanceTrend,
} from "@/components/DashboardResults";
import {
  getProfile,
  getDimensions,
  getKpis,
  getApprovedEntries,
  getOrgUnits,
  getDueKpis,
  getBands,
  getOpenDecisions,
} from "@/lib/data";
import { achievementRatio } from "@/lib/period";
import { bandFor, type Band } from "@/lib/bands";
import { formatValue } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string; dim?: string; unit?: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const fPeriod = searchParams?.period ?? "";
  const fDim = searchParams?.dim ?? "";
  const fUnit = searchParams?.unit ?? "";

  const [dimensions, allKpis, approved, dueItems, bands, orgUnits, openDecisions] =
    await Promise.all([
      getDimensions(),
      getKpis(),
      getApprovedEntries(),
      getDueKpis(profile),
      getBands(),
      getOrgUnits(),
      getOpenDecisions(),
    ]);

  // سلاسل القياسات المعتمدة + قائمة الفترات
  const series: Record<string, { label: string; value: number }[]> = {};
  const periodOrder = new Map<string, number>();
  for (const e of approved) {
    (series[e.kpi_id] ??= []).push({ label: e.period_label, value: e.value });
    const ord = new Date(e.period_end ?? e.period_date).getTime() || 0;
    periodOrder.set(e.period_label, Math.max(periodOrder.get(e.period_label) ?? 0, ord));
  }
  const periods = [...periodOrder.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);

  // المؤشرات بعد فلترة المنظور/الإدارة
  const kpis = allKpis.filter(
    (k) =>
      (!fDim || k.dimension_id === fDim) &&
      (!fUnit || k.owner_unit_id === fUnit)
  );
  const usedUnits = orgUnits.filter((u) =>
    allKpis.some((k) => k.owner_unit_id === u.id)
  );

  type Row = {
    id: string;
    name: string;
    dim: string;
    ownerUnit: string;
    unit: string;
    value: number;
    target: number;
    ratio: number;
    score: number;
    prevRatio: number | null;
    delta: number | null;
  };

  const rows: Row[] = [];
  for (const k of kpis) {
    const pts = series[k.id] ?? [];
    let value: number | null = null;
    let prev: number | null = null;
    if (fPeriod) {
      const idx = pts.findIndex((p) => p.label === fPeriod);
      value = idx >= 0 ? pts[idx].value : null;
      prev = idx > 0 ? pts[idx - 1].value : null;
    } else {
      value = pts.length ? pts[pts.length - 1].value : null;
      prev = pts.length > 1 ? pts[pts.length - 2].value : null;
    }
    const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
    const ratio = achievementRatio(value, target, k.polarity);
    if (ratio === null || value === null || target === null) continue;
    const prevRatio = prev !== null ? achievementRatio(prev, target, k.polarity) : null;
    rows.push({
      id: k.id,
      name: k.name,
      dim: k.dimension?.name ?? "—",
      ownerUnit: k.owner_unit?.name ?? "غير محدّد",
      unit: k.unit,
      value,
      target,
      ratio,
      score: Math.min(ratio, 100),
      prevRatio,
      delta: prevRatio !== null ? ratio - prevRatio : null,
    });
  }

  const withData = rows.length;
  const totalKpis = kpis.length;
  const overall =
    withData > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / withData)
      : 0;
  const dataConfidence = totalKpis ? Math.round((withData / totalKpis) * 100) : 0;

  const withPrev = rows.filter((r) => r.prevRatio !== null);
  const overallPrev =
    withPrev.length > 0
      ? Math.round(
          withPrev.reduce((s, r) => s + Math.min(r.prevRatio!, 100), 0) /
            withPrev.length
        )
      : null;
  const overallDelta = overallPrev !== null ? overall - overallPrev : null;

  const met = rows.filter((r) => r.ratio >= 100).length;
  const near = rows.filter((r) => r.ratio >= 75 && r.ratio < 100).length;
  const behind = rows.filter((r) => r.ratio < 75).length;
  const noData = totalKpis - withData;

  const statusData = [
    ...bands.map((b) => ({
      name: b.label,
      value: rows.filter((r) => bandFor(r.ratio, bands).label === b.label).length,
      color: b.color,
    })),
    { name: "بلا بيانات", value: noData, color: "#cbd5e1" },
  ].filter((d) => d.value > 0);

  const dimAgg = dimensions
    .map((d) => {
      const list = rows.filter((r) => r.dim === d.name);
      if (list.length === 0) return null;
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        score: Math.round(list.reduce((s, r) => s + r.score, 0) / list.length),
      };
    })
    .filter((x): x is { id: string; name: string; color: string; score: number } => x !== null);

  const radarData = dimAgg.map((d) => ({ dimension: d.name, score: d.score }));
  const dimBarData = dimAgg.map((d) => ({ name: d.name, score: d.score }));

  // مقارنة معيارية تفصيلية للإدارات
  const unitStatMap = new Map<
    string,
    { sum: number; n: number; met: number; behind: number; dsum: number; dn: number }
  >();
  for (const r of rows) {
    if (r.ownerUnit === "غير محدّد") continue;
    const c =
      unitStatMap.get(r.ownerUnit) ??
      { sum: 0, n: 0, met: 0, behind: 0, dsum: 0, dn: 0 };
    c.sum += r.score;
    c.n += 1;
    if (r.ratio >= 100) c.met += 1;
    if (r.ratio < 75) c.behind += 1;
    if (r.delta !== null) {
      c.dsum += r.delta;
      c.dn += 1;
    }
    unitStatMap.set(r.ownerUnit, c);
  }
  const unitStats = [...unitStatMap.entries()]
    .map(([name, v]) => ({
      name,
      count: v.n,
      score: Math.round(v.sum / v.n),
      met: v.met,
      behind: v.behind,
      delta: v.dn ? Math.round(v.dsum / v.dn) : null,
    }))
    .sort((a, b) => b.score - a.score);

  const top = [...rows].sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const under = [...rows].sort((a, b) => a.ratio - b.ratio).slice(0, 5);

  const movers = rows.filter((r) => r.delta !== null);
  const improved = [...movers].sort((a, b) => b.delta! - a.delta!).filter((r) => r.delta! > 0).slice(0, 4);
  const declined = [...movers].sort((a, b) => a.delta! - b.delta!).filter((r) => r.delta! < 0).slice(0, 4);

  // اتجاه الأداء عبر الزمن (متأثّر بفلاتر المنظور/الإدارة)
  const Q_NAMES = ["ر1", "ر2", "ر3", "ر4"];
  const allowed = new Set(kpis.map((k) => k.id));
  const buckets = new Map<string, { sum: number; n: number; order: number }>();
  for (const e of approved) {
    if (!allowed.has(e.kpi_id) || !e.kpi) continue;
    const d = new Date(e.period_end ?? e.period_date);
    if (Number.isNaN(d.getTime())) continue;
    const q = Math.floor(d.getMonth() / 3) + 1;
    const year = d.getFullYear();
    const qt =
      [e.kpi.target_q1, e.kpi.target_q2, e.kpi.target_q3, e.kpi.target_q4][q - 1] ??
      e.kpi.target_total ??
      null;
    const ratio = achievementRatio(e.value, qt, e.kpi.polarity);
    if (ratio === null) continue;
    const key = `${Q_NAMES[q - 1]} ${year}`;
    const cur = buckets.get(key) ?? { sum: 0, n: 0, order: year * 10 + q };
    cur.sum += Math.min(ratio, 100);
    cur.n += 1;
    buckets.set(key, cur);
  }
  const trendData = [...buckets.entries()]
    .map(([period, v]) => ({ period, score: Math.round(v.sum / v.n), count: v.n, order: v.order }))
    .sort((a, b) => a.order - b.order)
    .map(({ period, score, count }) => ({ period, score, count }));

  // رؤى تلقائية
  const sortedDims = [...dimAgg].sort((a, b) => b.score - a.score);
  const insights: string[] = [];
  if (withData > 0) {
    if (overallDelta !== null && overallDelta !== 0)
      insights.push(`الأداء العام ${overallDelta > 0 ? "ارتفع" : "انخفض"} ${Math.abs(overallDelta)} نقطة عن الفترة السابقة (إلى ${overall}%).`);
    if (sortedDims.length > 0)
      insights.push(`أعلى منظور: «${sortedDims[0].name}» بنسبة ${sortedDims[0].score}%.`);
    if (sortedDims.length > 1) {
      const w = sortedDims[sortedDims.length - 1];
      insights.push(`أضعف منظور: «${w.name}» بنسبة ${w.score}% — يحتاج متابعة.`);
    }
    if (improved.length > 0) insights.push(`أكبر تحسّن: «${improved[0].name}» (+${improved[0].delta} نقطة).`);
    if (declined.length > 0) insights.push(`أكبر تراجع: «${declined[0].name}» (${declined[0].delta} نقطة).`);
    if (behind > 0) insights.push(`${behind} مؤشرًا متعثّرًا يحتاج خطة معالجة.`);
    if (dataConfidence < 100) insights.push(`ثقة البيانات ${dataConfidence}% — ${noData} مؤشرًا بلا نتيجة معتمدة لهذه الفترة.`);
  }

  const statusWord =
    overall >= 90 ? "أداء متميّز"
    : overall >= 75 ? "أداء جيد جدًا"
    : overall >= 50 ? "أداء جيد"
    : overall >= 25 ? "يحتاج تحسينًا"
    : "يحتاج عملًا كبيرًا";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-mushar-dark">لوحة القيادة</h1>
        <PrintButton />
      </div>

      <DashboardFilters dimensions={dimensions} orgUnits={usedUnits} periods={periods} />

      {/* بطاقة Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-l from-mushar-dark via-mushar-primary to-mushar-teal px-6 py-7 text-white shadow-card sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-sm text-mushar-pale/80">
              لوحة قيادة الأداء — المساجد المتكاملة{fPeriod ? ` · ${fPeriod}` : ""}
            </p>
            <p className="mt-3 text-5xl font-extrabold leading-none sm:text-6xl">{overall}%</p>
            <p className="mt-3 text-lg font-semibold text-mushar-pale">{statusWord}</p>
            {overallDelta !== null && (
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${
                  overallDelta > 0
                    ? "bg-emerald-400/20 text-emerald-100"
                    : overallDelta < 0
                    ? "bg-rose-400/20 text-rose-100"
                    : "bg-white/10 text-mushar-pale"
                }`}
              >
                {overallDelta > 0 ? <TrendingUp size={16} /> : overallDelta < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                {overallDelta > 0 ? "+" : ""}
                {overallDelta} نقطة عن الفترة السابقة
              </p>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4 sm:gap-3">
            {[
              { v: met, l: "محقّقة" },
              { v: behind, l: "متعثّرة" },
              { v: `${dataConfidence}%`, l: "ثقة البيانات" },
              { v: <>{withData}<span className="text-base text-mushar-pale/70">/{totalKpis}</span></>, l: "لها نتائج" },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2 py-3 text-center backdrop-blur sm:min-w-[88px] sm:px-3 sm:py-4">
                <p className="text-2xl font-extrabold">{b.v}</p>
                <p className="mt-1 text-[11px] text-mushar-pale/80">{b.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="card border-r-4 border-mushar-primary p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="text-mushar-primary" />
            <h3 className="text-sm font-bold text-mushar-dark">أبرز الرؤى</h3>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mushar-mint" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DueAlerts items={dueItems} />

      <OpenDecisions decisions={openDecisions} />

      {withData === 0 && (
        <div className="card border-r-4 border-mushar-mint p-5 text-sm text-slate-600">
          لا توجد نتائج معتمدة لهذا التصفية. جرّب تغيير الفلاتر أو اعتمد قياسات من
          صفحة <b>المراجعة والاعتماد</b>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="محقّقة للمستهدف" value={met} accent="#16a34a" icon="check" />
        <StatCard label="قريبة من المستهدف" value={near} accent="#f59e0b" icon="clock" />
        <StatCard label="متعثّرة" value={behind} accent="#A11249" icon="alert" />
        <StatCard label="بانتظار النتائج" value={noData} accent="#94a3b8" icon="hourglass" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <OverallGauge score={overall} />
        <DimensionRadar data={radarData} />
        <StatusDonut data={statusData} />
      </div>

      <PerformanceTrend data={trendData} />

      <DimensionBars data={dimBarData} />

      {unitStats.length > 0 ? (
        <UnitBenchmark data={unitStats} bands={bands} />
      ) : (
        <div className="card flex items-center justify-center p-5 text-sm text-slate-400">
          أسنِد المؤشرات لإدارات (من مكتبة المؤشرات) لعرض مقارنة أداء الإدارات
        </div>
      )}

      {(improved.length > 0 || declined.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MoverList title="الأكثر تحسّنًا" rows={improved} up />
          <MoverList title="الأكثر تراجعًا" rows={declined} up={false} />
        </div>
      )}

      {dimAgg.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-bold text-mushar-dark">
            تحليل المناظير (انقر للتعمّق)
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {dimAgg.map((d) => {
              const c = bandFor(d.score, bands).color;
              return (
                <Link
                  key={d.id}
                  href={`/performance/dimension/${d.id}`}
                  className="card p-4 transition hover:shadow-cardHover"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="line-clamp-1 text-sm font-semibold text-mushar-dark">{d.name}</span>
                  </div>
                  <p className="text-2xl font-extrabold" style={{ color: c }}>{d.score}%</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(d.score, 100)}%`, backgroundColor: c }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PerformerList title="أفضل المؤشرات أداءً" rows={top} bands={bands} />
        <PerformerList title="المؤشرات الأكثر تعثّرًا" rows={under} bands={bands} />
      </div>
    </div>
  );
}

function MoverList({
  title,
  rows,
  up,
}: {
  title: string;
  rows: { id: string; name: string; dim: string; ratio: number; delta: number | null }[];
  up: boolean;
}) {
  const c = up ? "#16a34a" : "#A11249";
  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-mushar-dark">
        {up ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-mushar-accent" />}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">لا توجد تغيّرات</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <Link key={r.id} href={`/kpis/${r.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 transition hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mushar-dark">{r.name}</p>
                <p className="text-[11px] text-slate-400">{r.dim}</p>
              </div>
              <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${c}1a`, color: c }}>
                {r.delta! > 0 ? "+" : ""}{r.delta} نقطة
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PerformerList({
  title,
  rows,
  bands,
}: {
  title: string;
  rows: { id: string; name: string; dim: string; unit: string; value: number; target: number; ratio: number }[];
  bands: Band[];
}) {
  const color = (r: number) => bandFor(r, bands).color;
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-bold text-mushar-dark">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">لا توجد بيانات</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/kpis/${r.id}`} className="block rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-medium text-mushar-dark">{r.name}</span>
                <span className="shrink-0 text-sm font-bold" style={{ color: color(r.ratio) }}>{r.ratio}%</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{r.dim}</span>
                <span>
                  المتحقق {formatValue(r.value, r.unit as never)} / المستهدف {formatValue(r.target, r.unit as never)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${Math.min(r.ratio, 100)}%`, backgroundColor: color(r.ratio) }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
