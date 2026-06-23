"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gavel,
  UserCircle2,
  CalendarClock,
  ListChecks,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  Search,
} from "lucide-react";
import type { KpiDecision } from "@/lib/data";
import {
  toggleDecisionStatus,
  deleteDecision,
} from "@/app/(app)/kpis/[id]/decisions-actions";
import type { SimpleUser } from "@/components/KpiDecisions";
import FilterSelect from "@/components/ui/FilterSelect";
import { confirmDialog } from "@/components/ui/confirm";

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB");
}
function overdueOf(d: KpiDecision) {
  if (!d.due_date || d.status === "done") return false;
  const x = new Date(d.due_date);
  x.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return x.getTime() < t.getTime();
}

type StatusFilter = "all" | "open" | "overdue" | "done";

export default function DecisionsTracker({
  decisions,
  users,
  myUserId,
  canManage,
}: {
  decisions: KpiDecision[];
  users: SimpleUser[];
  myUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [assignee, setAssignee] = useState<string>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const open = decisions.filter((d) => d.status === "open").length;
    const overdue = decisions.filter(overdueOf).length;
    const done = decisions.filter((d) => d.status === "done").length;
    return { all: decisions.length, open, overdue, done };
  }, [decisions]);

  const list = useMemo(() => {
    return decisions.filter((d) => {
      if (status === "open" && d.status !== "open") return false;
      if (status === "done" && d.status !== "done") return false;
      if (status === "overdue" && !overdueOf(d)) return false;
      if (assignee === "me" && d.assigned_user_id !== myUserId) return false;
      if (assignee !== "all" && assignee !== "me" && d.assigned_user_id !== assignee)
        return false;
      if (q.trim()) {
        const hay = `${d.kpi?.name ?? ""} ${d.body} ${d.action ?? ""} ${
          d.assignee?.full_name ?? ""
        }`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [decisions, status, assignee, q, myUserId]);

  function toggle(d: KpiDecision) {
    start(async () => {
      await toggleDecisionStatus(
        d.id,
        d.kpi_id,
        d.status === "done" ? "open" : "done"
      );
      router.refresh();
    });
  }
  async function remove(d: KpiDecision) {
    if (!(await confirmDialog("حذف هذا القرار وكل تحديثاته؟", { danger: true, confirmText: "حذف" }))) return;
    start(async () => {
      await deleteDecision(d.id, d.kpi_id);
      router.refresh();
    });
  }

  const tabs: { key: StatusFilter; label: string; n: number }[] = [
    { key: "open", label: "قيد المتابعة", n: counts.open },
    { key: "overdue", label: "متأخرة", n: counts.overdue },
    { key: "done", label: "مكتملة", n: counts.done },
    { key: "all", label: "الكل", n: counts.all },
  ];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                status === t.key
                  ? "bg-brand-primary text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
              <span
                className={`mr-1.5 text-xs ${
                  status === t.key ? "text-white/80" : "text-slate-400"
                }`}
              >
                {t.n}
              </span>
            </button>
          ))}
        </div>
        <div className="mr-auto flex flex-wrap items-center gap-2">
          <FilterSelect
            value={assignee ?? ""}
            onValueChange={(v) => setAssignee(v)}
            options={[
              { value: "all", label: "كل المسؤولين" },
              { value: "me", label: "المُسنَد إليّ" },
              ...users.map((u) => ({
                value: u.id,
                label: u.full_name || "مستخدم",
              })),
            ]}
          />
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input w-44 py-2 pr-8 text-sm"
              placeholder="بحث…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">
          لا توجد قرارات مطابقة لهذه التصفية
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => {
            const overdue = overdueOf(d);
            const done = d.status === "done";
            const canFollow = canManage || d.assigned_user_id === myUserId;
            const updateCount = d.updates?.[0]?.count ?? 0;
            return (
              <div
                key={d.id}
                className={`card p-4 ${
                  done
                    ? "opacity-80"
                    : overdue
                    ? "border-r-4 border-brand-accent"
                    : "border-r-4 border-brand-primary"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/kpis/${d.kpi_id}`}
                      className="group inline-flex items-center gap-1 text-sm font-bold text-brand-dark hover:text-brand-primary"
                    >
                      <Gavel size={14} className="text-brand-primary" />
                      {d.kpi?.name ?? "مؤشر"}
                      <ArrowLeft
                        size={13}
                        className="text-slate-300 transition group-hover:text-brand-primary"
                      />
                    </Link>
                    <p
                      className={`mt-1 text-sm ${
                        done ? "text-slate-400 line-through" : "text-slate-600"
                      }`}
                    >
                      {d.body}
                    </p>
                    {d.action && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <ListChecks size={12} className="text-brand-primary" />
                        {d.action}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      {d.assignee?.full_name && (
                        <span className="flex items-center gap-1 font-semibold text-slate-500">
                          <UserCircle2 size={13} />
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
                      {updateCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} />
                          {updateCount} تحديث
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        done
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {done ? "مكتمل" : "قيد المتابعة"}
                    </span>
                    {canFollow && (
                      <button
                        onClick={() => toggle(d)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline disabled:opacity-50"
                      >
                        {done ? (
                          <>
                            <RotateCcw size={13} /> إعادة فتح
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> إكمال
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
