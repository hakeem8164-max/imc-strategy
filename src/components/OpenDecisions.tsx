import Link from "next/link";
import { Gavel, UserCircle2, CalendarClock, ArrowLeft } from "lucide-react";
import type { KpiDecision } from "@/lib/data";

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB");
}

function isOverdue(due: string | null) {
  if (!due) return false;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export default function OpenDecisions({
  decisions,
}: {
  decisions: KpiDecision[];
}) {
  if (decisions.length === 0) return null;

  return (
    <div className="card border-r-4 border-brand-accent p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gavel size={18} className="text-brand-accent" />
        <h3 className="text-sm font-bold text-brand-dark">
          قرارات ومتابعات تنفيذية مفتوحة
        </h3>
        <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-xs font-semibold text-brand-accent">
          {decisions.length}
        </span>
      </div>
      <div className="space-y-2">
        {decisions.map((d) => {
          const overdue = isOverdue(d.due_date);
          return (
            <Link
              key={d.id}
              href={`/kpis/${d.kpi_id}`}
              className="group flex items-start gap-3 rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-pale hover:bg-brand-pale/10"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-dark">
                  {d.kpi?.name ?? "مؤشر"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                  {d.body}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  {d.assignee?.full_name && (
                    <span className="flex items-center gap-1">
                      <UserCircle2 size={12} />
                      {d.assignee.full_name}
                    </span>
                  )}
                  {d.due_date && (
                    <span
                      className={`flex items-center gap-1 ${
                        overdue ? "font-semibold text-brand-accent" : ""
                      }`}
                    >
                      <CalendarClock size={12} />
                      {overdue ? "تأخّر: " : "استحقاق: "}
                      {fmtDate(d.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <ArrowLeft
                size={16}
                className="mt-1 shrink-0 text-slate-300 transition group-hover:text-brand-primary"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
