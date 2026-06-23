import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import DueAlerts from "@/components/DueAlerts";
import OpenDecisions from "@/components/OpenDecisions";
import {
  Rocket,
  CalendarClock,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Gavel,
  CalendarCheck,
} from "lucide-react";
import {
  getProfile,
  getDueKpis,
  getMyDecisions,
  getMyInitiatives,
  getMyRecommendations,
} from "@/lib/data";
import {
  computeRecStatus,
  REC_STATUS,
} from "@/lib/recommendation-status";

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB");
}

const STATUS_LABEL: Record<string, string> = {
  planned: "مخطّطة",
  in_progress: "قيد التنفيذ",
};

export default async function MyTasksPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [dueItems, decisions, initiatives, recommendations] = await Promise.all([
    getDueKpis(profile),
    getMyDecisions(profile.id),
    getMyInitiatives(profile.id),
    getMyRecommendations(profile.id),
  ]);

  const total =
    dueItems.length +
    decisions.length +
    initiatives.length +
    recommendations.length;

  return (
    <>
      <Header profile={profile} title="مهامّي" />
      <div className="space-y-6">
        <div className="card bg-gradient-to-l from-brand-dark to-brand-primary p-5 text-white">
          <p className="text-sm text-brand-pale/80">
            مرحبًا {profile.full_name || ""} 👋
          </p>
          <p className="mt-1 text-lg font-bold">
            {total === 0
              ? "لا توجد مهام معلّقة عليك حاليًا — عمل رائع!"
              : `لديك ${total} عنصرًا بحاجة لمتابعتك`}
          </p>
        </div>

        {/* مؤشرات مستحقّة للإدخال */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-dark">
            <ClipboardList size={18} className="text-brand-primary" />
            مؤشرات بحاجة لإدخال نتائجها
          </h2>
          {dueItems.length === 0 ? (
            <div className="card flex items-center gap-2 p-5 text-sm text-slate-400">
              <CheckCircle2 size={16} className="text-green-500" />
              لا توجد مؤشرات مستحقّة للإدخال الآن.
            </div>
          ) : (
            <DueAlerts items={dueItems} />
          )}
        </section>

        {/* قرارات مُسنَدة إليّ */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-dark">
            <Gavel size={18} className="text-brand-primary" />
            قرارات تنفيذية مُسنَدة إليّ
          </h2>
          {decisions.length === 0 ? (
            <div className="card flex items-center gap-2 p-5 text-sm text-slate-400">
              <CheckCircle2 size={16} className="text-green-500" />
              لا توجد قرارات مفتوحة مُسنَدة إليك.
            </div>
          ) : (
            <OpenDecisions decisions={decisions} />
          )}
        </section>

        {/* توصيات اجتماعات مُسنَدة إليّ */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-dark">
            <CalendarCheck size={18} className="text-brand-primary" />
            توصيات اجتماعات مُسنَدة إليّ
          </h2>
          {recommendations.length === 0 ? (
            <div className="card flex items-center gap-2 p-5 text-sm text-slate-400">
              <CheckCircle2 size={16} className="text-green-500" />
              لا توجد توصيات مفتوحة مُسنَدة إليك.
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((r) => {
                const st =
                  REC_STATUS[
                    computeRecStatus({
                      closed: r.closure_status === "closed",
                      due_date: r.due_date,
                    })
                  ];
                return (
                  <Link
                    key={r.id}
                    href="/meetings"
                    className="card group block p-4 transition hover:border-brand-pale"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-sm font-bold text-brand-dark group-hover:text-brand-primary">
                          {r.name}
                          <ArrowLeft size={13} className="text-slate-300" />
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          {r.meeting?.title && <span>{r.meeting.title}</span>}
                          {r.domain?.name && <span>· {r.domain.name}</span>}
                          {r.due_date && (
                            <span className="flex items-center gap-1">
                              <CalendarClock size={12} />
                              استحقاق: {fmtDate(r.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
                        style={{ backgroundColor: `${st.color}1a`, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* مبادرات/خطط أملكها */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-dark">
            <Rocket size={18} className="text-brand-primary" />
            خطط ومبادرات أتولّاها
          </h2>
          {initiatives.length === 0 ? (
            <div className="card flex items-center gap-2 p-5 text-sm text-slate-400">
              <CheckCircle2 size={16} className="text-green-500" />
              لا توجد خطط أو مبادرات نشطة عليك.
            </div>
          ) : (
            <div className="space-y-2">
              {initiatives.map((i) => (
                <Link
                  key={i.id}
                  href={`/kpis/${i.kpi_id}`}
                  className="card group block p-4 transition hover:border-brand-pale"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-bold text-brand-dark group-hover:text-brand-primary">
                        {i.title}
                        <ArrowLeft size={13} className="text-slate-300" />
                      </p>
                      {i.kpi?.name && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {i.kpi.name}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                          {STATUS_LABEL[i.status] ?? i.status}
                        </span>
                        {i.due_date && (
                          <span className="flex items-center gap-1">
                            <CalendarClock size={12} />
                            استحقاق: {fmtDate(i.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="mb-1 text-left text-xs font-bold text-brand-dark">
                        {i.progress}%
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-primary"
                          style={{ width: `${i.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
