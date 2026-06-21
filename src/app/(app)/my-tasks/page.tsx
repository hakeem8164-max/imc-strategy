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
} from "lucide-react";
import {
  getProfile,
  getDueKpis,
  getMyDecisions,
  getMyInitiatives,
} from "@/lib/data";

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

  const [dueItems, decisions, initiatives] = await Promise.all([
    getDueKpis(profile),
    getMyDecisions(profile.id),
    getMyInitiatives(profile.id),
  ]);

  const total = dueItems.length + decisions.length + initiatives.length;

  return (
    <>
      <Header profile={profile} title="مهامّي" />
      <div className="space-y-6">
        <div className="card bg-gradient-to-l from-mushar-dark to-mushar-primary p-5 text-white">
          <p className="text-sm text-mushar-pale/80">
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
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-mushar-dark">
            <ClipboardList size={18} className="text-mushar-primary" />
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
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-mushar-dark">
            <Gavel size={18} className="text-mushar-primary" />
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

        {/* مبادرات/خطط أملكها */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-mushar-dark">
            <Rocket size={18} className="text-mushar-primary" />
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
                  className="card group block p-4 transition hover:border-mushar-pale"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-bold text-mushar-dark group-hover:text-mushar-primary">
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
                      <div className="mb-1 text-left text-xs font-bold text-mushar-dark">
                        {i.progress}%
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-mushar-primary"
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
