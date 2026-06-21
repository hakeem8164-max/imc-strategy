import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import HistoryChart from "@/components/HistoryChart";
import KpiDecisions from "@/components/KpiDecisions";
import KpiInitiatives from "@/components/KpiInitiatives";
import {
  getProfile,
  getKpiById,
  getEntriesForKpi,
  getDecisionsForKpi,
  getUpdatesByDecision,
  getInitiativesForKpi,
  getUsers,
  canEditKpi,
} from "@/lib/data";
import { formatValue, achievementPct, achievementColor } from "@/lib/format";

export default async function KpiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const kpi = await getKpiById(id);
  if (!kpi) notFound();

  const entries = await getEntriesForKpi(id);
  const canEdit = canEditKpi(profile, kpi);
  const decisions = await getDecisionsForKpi(id);
  const updatesByDecision = await getUpdatesByDecision(decisions.map((d) => d.id));
  const initiatives = await getInitiativesForKpi(id);
  const allUsers = await getUsers();
  const users = allUsers
    .filter((u) => u.status !== "inactive")
    .map((u) => ({ id: u.id, full_name: u.full_name }));
  const canManageDecisions =
    profile.role === "admin" || profile.role === "executive";
  // الخطط التصحيحية: القيادة أو من يملك صلاحية تحرير المؤشر (مالك/موظف الوحدة)
  const canManageInitiatives = canManageDecisions || canEdit;

  const latest = entries.length ? entries[entries.length - 1] : null;
  const target = kpi.target_total ?? kpi.target_q4 ?? kpi.target_q3 ?? null;
  const pct = achievementPct(latest?.value ?? null, target);
  const color = achievementColor(pct);

  const chartData = entries.map((e) => ({
    label: e.period_label,
    value: e.value,
  }));

  const meta: { label: string; value: string | null }[] = [
    { label: "المنظور", value: kpi.dimension?.name ?? null },
    { label: "الهدف الاستراتيجي", value: kpi.objective?.name ?? null },
    { label: "المالك", value: kpi.owner_title },
    { label: "دورية القياس", value: kpi.frequency },
    { label: "الوحدة", value: kpi.unit || "—" },
    {
      label: "خط الأساس",
      value: kpi.baseline != null ? formatValue(kpi.baseline, kpi.unit) : "—",
    },
    {
      label: "مستهدف الربع 3",
      value: kpi.target_q3 != null ? formatValue(kpi.target_q3, kpi.unit) : "—",
    },
    {
      label: "مستهدف الربع 4",
      value: kpi.target_q4 != null ? formatValue(kpi.target_q4, kpi.unit) : "—",
    },
  ];

  return (
    <>
      <Header profile={profile} title="تفاصيل المؤشر" />
      <div className="space-y-6">
        <Link
          href="/kpis"
          className="inline-flex items-center gap-1 text-sm font-medium text-mushar-primary hover:underline"
        >
          → العودة إلى المؤشرات
        </Link>

        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: `${kpi.dimension?.color ?? "#8C341F"}1a`,
                    color: kpi.dimension?.color ?? "#8C341F",
                  }}
                >
                  {kpi.dimension?.name}
                </span>
                <span className="text-xs text-slate-400">رقم {kpi.code}</span>
              </div>
              <h2 className="text-xl font-bold text-mushar-dark">{kpi.name}</h2>
              {kpi.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {kpi.description}
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">آخر قيمة</p>
              <p className="text-3xl font-extrabold text-mushar-dark">
                {formatValue(latest?.value ?? null, kpi.unit)}
              </p>
              {pct !== null && (
                <p className="mt-1 text-sm font-semibold" style={{ color }}>
                  {pct}% من المستهدف
                </p>
              )}
            </div>
          </div>

          {kpi.measurement_method && (
            <div className="mt-4 rounded-xl bg-mushar-pale/30 px-4 py-3 text-sm text-mushar-dark">
              <span className="font-semibold">آلية القياس: </span>
              {kpi.measurement_method}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {meta.map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] text-slate-400">{m.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-mushar-dark">
                  {m.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 text-base font-bold text-mushar-dark">
            تطور المؤشر عبر الزمن
          </h3>
          <HistoryChart
            data={chartData}
            target={target}
            baseline={kpi.baseline}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="mb-4 text-base font-bold text-mushar-dark">
              إدخال نتيجة
            </h3>
            {canEdit ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  أدخل نتيجة هذا المؤشر مرفقةً بالوثيقة الداعمة وأرسلها للاعتماد
                  من صفحة المراجعة والاعتماد.
                </p>
                <Link href="/performance/review" className="btn-primary">
                  الانتقال للإدخال والاعتماد
                </Link>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                ليس لديك صلاحية إدخال قياسات لهذا المؤشر.
                {kpi.owner_title && (
                  <>
                    <br />
                    هذا المؤشر مملوك لـ «{kpi.owner_title}».
                  </>
                )}
              </p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="mb-4 text-base font-bold text-mushar-dark">
              سجل القياسات ({entries.length})
            </h3>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                لا توجد قياسات مسجلة بعد
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {[...entries].reverse().map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-mushar-dark">
                        {e.period_label}
                      </p>
                      {e.note && (
                        <p className="text-xs text-slate-400">{e.note}</p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-mushar-primary">
                      {formatValue(e.value, kpi.unit)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <KpiInitiatives
          kpiId={kpi.id}
          initiatives={initiatives}
          users={users}
          canManage={canManageInitiatives}
        />

        <KpiDecisions
          kpiId={kpi.id}
          decisions={decisions}
          updatesByDecision={updatesByDecision}
          users={users}
          canManage={canManageDecisions}
          myUserId={profile.id}
        />
      </div>
    </>
  );
}
