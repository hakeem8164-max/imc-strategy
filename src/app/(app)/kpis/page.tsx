import Header from "@/components/Header";
import KpiBrowser from "@/components/KpiBrowser";
import StatCard from "@/components/StatCard";
import {
  getProfile,
  getDimensions,
  getObjectives,
  getKpis,
  getLatestEntries,
  getApprovedEntries,
  getOrgUnits,
  getBands,
  canEditKpi,
} from "@/lib/data";
import { achievementStatus } from "@/lib/period";
import { redirect } from "next/navigation";
import type { Point } from "@/components/KpiBrowser";

export default async function KpisPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [dimensions, objectives, kpis, latest, approved, orgUnits, bands] =
    await Promise.all([
      getDimensions(),
      getObjectives(),
      getKpis(),
      getLatestEntries(),
      getApprovedEntries(),
      getOrgUnits(),
      getBands(),
    ]);

  // سلاسل القياسات المعتمدة لكل مؤشر (تصاعديًا) + قائمة الفترات
  const series: Record<string, Point[]> = {};
  const periodOrder = new Map<string, number>();
  for (const e of approved) {
    (series[e.kpi_id] ??= []).push({ label: e.period_label, value: e.value });
    const ord = new Date(e.period_end ?? e.period_date).getTime() || 0;
    periodOrder.set(e.period_label, Math.max(periodOrder.get(e.period_label) ?? 0, ord));
  }
  const periods = [...periodOrder.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  // شريط ملخّص: المتحقق / قيد المتابعة / بلا بيانات
  let withData = 0;
  let met = 0;
  let atRisk = 0;
  for (const k of kpis) {
    const v = latest[k.id]?.value ?? null;
    const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
    if (v === null) continue;
    withData++;
    const st = achievementStatus(v, target, k.polarity);
    if (st.met) met++;
    else if (st.pct !== null) atRisk++;
  }

  // نضع علامة على المؤشرات التي يملكها المستخدم لاستخدامها في فلتر "مؤشراتي"
  const marked = kpis.map((k) => ({ ...k, _mine: canEditKpi(profile, k) }));

  return (
    <>
      <Header profile={profile} title="التوجهات الاستراتيجية" />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="إجمالي المؤشرات" value={kpis.length} accent="#8C341F" />
          <StatCard
            label="محقّقة للمستهدف"
            value={met}
            accent="#16a34a"
            hint={`${withData} مؤشرًا له بيانات`}
          />
          <StatCard label="تحت المستهدف" value={atRisk} accent="#A11249" />
          <StatCard
            label="بانتظار البيانات"
            value={kpis.length - withData}
            accent="#94a3b8"
          />
        </div>
        <KpiBrowser
          kpis={marked}
          dimensions={dimensions}
          objectives={objectives}
          series={series}
          periods={periods}
          orgUnits={orgUnits}
          bands={bands}
        />
      </div>
    </>
  );
}
