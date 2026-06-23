import { redirect } from "next/navigation";
import Image from "next/image";
import ReportActions, { type ReportRow } from "@/components/ReportActions";
import {
  getProfile,
  getDimensions,
  getKpis,
  getApprovedEntries,
  getOrgUnits,
  getBands,
  getOrgProfile,
} from "@/lib/data";
import { achievementRatio } from "@/lib/period";
import { bandFor } from "@/lib/bands";
import { formatValue } from "@/lib/format";

export default async function ReportPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!["admin", "executive", "owner"].includes(profile.role)) redirect("/");

  const [dimensions, allKpis, approved, bands, orgUnits, org] =
    await Promise.all([
      getDimensions(),
      getKpis(),
      getApprovedEntries(),
      getBands(),
      getOrgUnits(),
      getOrgProfile(),
    ]);

  // سلاسل القياسات + أحدث فترة
  const series: Record<string, { label: string; value: number; ord: number }[]> =
    {};
  for (const e of approved) {
    (series[e.kpi_id] ??= []).push({
      label: e.period_label,
      value: e.value,
      ord: new Date(e.period_end ?? e.period_date).getTime() || 0,
    });
  }
  for (const k of Object.keys(series)) series[k].sort((a, b) => a.ord - b.ord);

  let latestPeriod = "";
  let latestOrd = -1;
  for (const arr of Object.values(series)) {
    const last = arr[arr.length - 1];
    if (last && last.ord > latestOrd) {
      latestOrd = last.ord;
      latestPeriod = last.label;
    }
  }

  type Row = {
    name: string;
    dim: string;
    unit: string;
    value: number;
    target: number;
    ratio: number;
    score: number;
    unitLabel: import("@/lib/types").Unit;
  };

  const rows: Row[] = [];
  for (const k of allKpis) {
    const pts = series[k.id] ?? [];
    const value = pts.length ? pts[pts.length - 1].value : null;
    const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
    const ratio = achievementRatio(value, target, k.polarity);
    if (ratio === null || value === null || target === null) continue;
    rows.push({
      name: k.name,
      dim: k.dimension?.name ?? "—",
      unit: k.owner_unit?.name ?? "غير محدّد",
      value,
      target,
      ratio,
      score: Math.min(ratio, 100),
      unitLabel: k.unit,
    });
  }

  const withData = rows.length;
  const totalKpis = allKpis.length;
  const overall =
    withData > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / withData)
      : 0;
  const dataConfidence = totalKpis
    ? Math.round((withData / totalKpis) * 100)
    : 0;
  const met = rows.filter((r) => r.ratio >= 100).length;
  const near = rows.filter((r) => r.ratio >= 75 && r.ratio < 100).length;
  const behind = rows.filter((r) => r.ratio < 75).length;

  const dimAgg = dimensions
    .map((d) => {
      const list = rows.filter((r) => r.dim === d.name);
      if (!list.length) return null;
      return {
        name: d.name,
        color: d.color,
        n: list.length,
        score: Math.round(list.reduce((s, r) => s + r.score, 0) / list.length),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score);

  const unitMap = new Map<
    string,
    { sum: number; n: number; met: number; behind: number }
  >();
  for (const r of rows) {
    if (r.unit === "غير محدّد") continue;
    const c = unitMap.get(r.unit) ?? { sum: 0, n: 0, met: 0, behind: 0 };
    c.sum += r.score;
    c.n += 1;
    if (r.ratio >= 100) c.met += 1;
    if (r.ratio < 75) c.behind += 1;
    unitMap.set(r.unit, c);
  }
  const unitStats = [...unitMap.entries()]
    .map(([name, v]) => ({
      name,
      n: v.n,
      met: v.met,
      behind: v.behind,
      score: Math.round(v.sum / v.n),
    }))
    .sort((a, b) => b.score - a.score);

  const top = [...rows].sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const under = [...rows].sort((a, b) => a.ratio - b.ratio).slice(0, 5);

  const today = new Date().toLocaleDateString("en-GB");
  const statusWord =
    overall >= 90
      ? "أداء متميّز"
      : overall >= 75
      ? "أداء جيّد"
      : overall >= 50
      ? "أداء متوسّط يحتاج متابعة"
      : "أداء متعثّر يحتاج تدخّلاً";

  const csvRows: ReportRow[] = rows.map((r) => ({
    name: r.name,
    dim: r.dim,
    unit: r.unit,
    value: formatValue(r.value, r.unitLabel),
    target: formatValue(r.target, r.unitLabel),
    ratio: String(r.ratio),
    status: bandFor(r.ratio, bands).label,
    period: latestPeriod || "—",
  }));

  const orgName = org?.name ?? "شركة المساجد المتكاملة";

  return (
    <div className="space-y-5">
      {/* أزرار (تختفي عند الطباعة) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-extrabold text-mushar-dark">
          التقرير التنفيذي
        </h1>
        <ReportActions
          rows={csvRows}
          filename={`تقرير-الأداء-${today.replace(/\//g, "-")}`}
        />
      </div>

      {/* ورقة التقرير */}
      <div className="card mx-auto max-w-[900px] p-8 print:border-0 print:shadow-none">
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-mushar-dark">
              تقرير أداء المؤشرات
            </h2>
            <p className="mt-1 text-sm text-slate-500">{orgName}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              فترة التقرير: {latestPeriod || "—"} · تاريخ الإصدار: {today}
            </p>
          </div>
          <Image
            src="/mushar-logo.png"
            alt="المساجد المتكاملة"
            width={110}
            height={66}
            className="h-auto w-[100px] dark:hidden"
          />
          <Image
            src="/mushar-logo-light.png"
            alt="المساجد المتكاملة"
            width={110}
            height={66}
            className="hidden h-auto w-[100px] dark:block"
          />
        </div>

        {/* الملخص التنفيذي */}
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-mushar-primary">
            الملخّص التنفيذي
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="الأداء العام" value={`${overall}%`} hint={statusWord} />
            <SummaryStat label="مؤشرات لها بيانات" value={`${withData} / ${totalKpis}`} hint={`ثقة البيانات ${dataConfidence}%`} />
            <SummaryStat label="محقّقة للمستهدف" value={String(met)} hint={`قريبة: ${near}`} color="#16a34a" />
            <SummaryStat label="متعثّرة" value={String(behind)} hint="تحتاج خطط معالجة" color="#A11249" />
          </div>
        </section>

        {/* الأداء حسب المنظور */}
        {dimAgg.length > 0 && (
          <section className="mt-7">
            <h3 className="mb-3 text-sm font-bold text-mushar-primary">
              الأداء حسب المنظور الاستراتيجي
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs text-slate-400">
                  <th className="py-2 font-semibold">المنظور</th>
                  <th className="py-2 font-semibold">عدد المؤشرات</th>
                  <th className="py-2 font-semibold">نسبة التحقّق</th>
                </tr>
              </thead>
              <tbody>
                {dimAgg.map((d) => (
                  <tr key={d.name} className="border-b border-slate-100">
                    <td className="py-2 font-semibold text-mushar-dark">
                      <span
                        className="ml-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.name}
                    </td>
                    <td className="py-2 text-slate-500">{d.n}</td>
                    <td
                      className="py-2 font-bold"
                      style={{ color: bandFor(d.score, bands).color }}
                    >
                      {d.score}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* مقارنة الإدارات */}
        {unitStats.length > 0 && (
          <section className="mt-7">
            <h3 className="mb-3 text-sm font-bold text-mushar-primary">
              مقارنة أداء الإدارات
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs text-slate-400">
                  <th className="py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">الإدارة</th>
                  <th className="py-2 font-semibold">المؤشرات</th>
                  <th className="py-2 font-semibold">محقّقة</th>
                  <th className="py-2 font-semibold">متعثّرة</th>
                  <th className="py-2 font-semibold">التحقّق</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.map((u, i) => (
                  <tr key={u.name} className="border-b border-slate-100">
                    <td className="py-2 text-slate-400">{i + 1}</td>
                    <td className="py-2 font-semibold text-mushar-dark">{u.name}</td>
                    <td className="py-2 text-slate-500">{u.n}</td>
                    <td className="py-2 text-green-600">{u.met}</td>
                    <td className="py-2 text-mushar-accent">{u.behind}</td>
                    <td
                      className="py-2 font-bold"
                      style={{ color: bandFor(u.score, bands).color }}
                    >
                      {u.score}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* أعلى وأدنى المؤشرات */}
        <section className="mt-7 grid gap-6 sm:grid-cols-2">
          <PerfList title="الأعلى تحقّقًا" rows={top} bands={bands} />
          <PerfList title="الأدنى تحقّقًا (أولوية المعالجة)" rows={under} bands={bands} />
        </section>

        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
          أُنشئ هذا التقرير تلقائيًا من منصة المساجد المتكاملة لإدارة الأداء — {today}
        </p>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className="mt-1 text-2xl font-extrabold text-mushar-dark"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function PerfList({
  title,
  rows,
  bands,
}: {
  title: string;
  rows: { name: string; unit: string; ratio: number }[];
  bands: import("@/lib/bands").Band[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-mushar-primary">{title}</h3>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              <span className="text-slate-400">{i + 1}. </span>
              <span className="font-semibold text-mushar-dark">{r.name}</span>
              <span className="text-xs text-slate-400"> — {r.unit}</span>
            </span>
            <span
              className="shrink-0 font-bold"
              style={{ color: bandFor(r.ratio, bands).color }}
            >
              {r.ratio}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
