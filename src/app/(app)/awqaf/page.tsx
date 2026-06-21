import { redirect } from "next/navigation";
import Header from "@/components/Header";
import KpiCard from "@/components/KpiCard";
import StatCard from "@/components/StatCard";
import {
  getProfile,
  getEndowmentDimension,
  getEndowmentObjectives,
  getEndowmentKpis,
  getLatestEntries,
  getPreviousValues,
} from "@/lib/data";

export default async function AwqafPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [dim, objectives, kpis, latest, prev] = await Promise.all([
    getEndowmentDimension(),
    getEndowmentObjectives(),
    getEndowmentKpis(),
    getLatestEntries(),
    getPreviousValues(),
  ]);

  const accent = dim?.color ?? "#7B4A2E";
  const withData = kpis.filter((k) => latest[k.id]?.value != null).length;

  const grouped = objectives.map((o) => ({
    o,
    list: kpis.filter((k) => k.objective_id === o.id),
  }));

  return (
    <>
      <Header profile={profile} title="أهداف الوقفين" />
      <div className="space-y-6">
        <div className="card border-r-4 p-5" style={{ borderColor: accent }}>
          <p className="text-sm leading-relaxed text-slate-600">
            أهداف خاصة بالوقفين، ومسؤولوها مستقلون عن قطاع المساجد. نتائجها{" "}
            <b>لا تُحتسب ضمن نتائج الخطة الاستراتيجية</b> في لوحات الأداء
            والتقارير، وتُتابَع هنا بشكل منفصل.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="الأهداف" value={objectives.length} accent={accent} />
          <StatCard label="المؤشرات" value={kpis.length} accent="#8C341F" />
          <StatCard label="مؤشرات لها بيانات" value={withData} accent="#16a34a" />
          <StatCard
            label="بانتظار البيانات"
            value={kpis.length - withData}
            accent="#94a3b8"
          />
        </div>

        {grouped.length === 0 ? (
          <div className="card p-12 text-center text-sm text-slate-400">
            لا توجد أهداف بعد.
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ o, list }) => (
              <section key={o.id}>
                <div className="mb-2 flex items-center gap-2">
                  {o.code && (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {o.code}
                    </span>
                  )}
                  <h2 className="text-base font-bold text-mushar-dark">{o.name}</h2>
                  <span className="text-xs text-slate-400">({list.length})</span>
                  <div className="mr-2 h-px flex-1 bg-slate-100" />
                </div>
                {o.description && (
                  <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-500">
                    {o.description}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((k) => (
                    <KpiCard
                      key={k.id}
                      kpi={k}
                      value={latest[k.id]?.value ?? null}
                      prevValue={prev[k.id] ?? null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
