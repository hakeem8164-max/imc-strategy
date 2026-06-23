"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Plus,
  Trash2,
  UserCircle2,
  CalendarClock,
  CheckSquare,
  Square,
  Flag,
} from "lucide-react";
import type {
  KpiInitiative,
  KpiMilestone,
  InitiativeStatus,
} from "@/lib/data";
import type { SimpleUser } from "@/components/KpiDecisions";
import FilterSelect from "@/components/ui/FilterSelect";
import { confirmDialog } from "@/components/ui/confirm";
import {
  addInitiative,
  updateInitiative,
  deleteInitiative,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
} from "@/app/(app)/kpis/[id]/initiatives-actions";

const STATUS: Record<InitiativeStatus, { label: string; cls: string }> = {
  planned: { label: "مخطّطة", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-amber-100 text-amber-700" },
  done: { label: "مكتملة", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغاة", cls: "bg-rose-100 text-rose-600" },
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB");
}

export default function KpiInitiatives({
  kpiId,
  initiatives,
  users,
  canManage,
}: {
  kpiId: string;
  initiatives: KpiInitiative[];
  users: SimpleUser[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [owner, setOwner] = useState("");
  const [start_, setStart_] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await addInitiative({
        kpi_id: kpiId,
        title,
        description: desc || null,
        owner_user_id: owner || null,
        start_date: start_ || null,
        due_date: due || null,
      });
      if (!res.ok) {
        setErr(res.error ?? "تعذّر الحفظ");
        return;
      }
      setTitle("");
      setDesc("");
      setOwner("");
      setStart_("");
      setDue("");
      setOpen(false);
      router.refresh();
    });
  }

  const active = initiatives.filter(
    (i) => i.status !== "done" && i.status !== "cancelled"
  ).length;

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-dark">
          <Rocket size={18} className="text-brand-primary" />
          الخطط التصحيحية والمبادرات
          {active > 0 && (
            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
              {active} نشطة
            </span>
          )}
        </h3>
        {canManage && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost gap-1.5 text-sm"
          >
            <Plus size={16} />
            خطة جديدة
          </button>
        )}
      </div>

      {canManage && open && (
        <div className="mb-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              عنوان الخطة / المبادرة
            </label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: خطة رفع رضا المستفيدين"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              الوصف (اختياري)
            </label>
            <textarea
              className="input min-h-[60px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                المسؤول
              </label>
              <FilterSelect
                className="w-full"
                value={owner ?? ""}
                onValueChange={(v) => setOwner(v)}
                options={[
                  { value: "", label: "— اختر —" },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.full_name || "مستخدم",
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                البداية
              </label>
              <input
                type="date"
                className="input"
                value={start_}
                onChange={(e) => setStart_(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                الاستحقاق
              </label>
              <input
                type="date"
                className="input"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          {err && <p className="text-sm font-medium text-brand-accent">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={pending}
              className="btn-primary disabled:opacity-50"
            >
              حفظ
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {initiatives.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          لا توجد خطط تصحيحية أو مبادرات على هذا المؤشر بعد
        </p>
      ) : (
        <div className="space-y-3">
          {initiatives.map((i) => (
            <InitiativeItem
              key={i.id}
              kpiId={kpiId}
              initiative={i}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InitiativeItem({
  kpiId,
  initiative: i,
  canManage,
}: {
  kpiId: string;
  initiative: KpiInitiative;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msTitle, setMsTitle] = useState("");
  const [msDue, setMsDue] = useState("");
  const [showMs, setShowMs] = useState(false);

  const milestones = i.milestones ?? [];
  const doneCount = milestones.filter((m) => m.done).length;
  const st = STATUS[i.status];

  function setStatus(status: InitiativeStatus) {
    start(async () => {
      await updateInitiative(i.id, kpiId, { status });
      router.refresh();
    });
  }
  function setProgress(progress: number) {
    start(async () => {
      await updateInitiative(i.id, kpiId, { progress });
      router.refresh();
    });
  }
  async function remove() {
    if (!(await confirmDialog("حذف هذه الخطة وكل معالمها؟", { danger: true, confirmText: "حذف" }))) return;
    start(async () => {
      await deleteInitiative(i.id, kpiId);
      router.refresh();
    });
  }
  function addMs() {
    if (!msTitle.trim()) return;
    start(async () => {
      await addMilestone({
        initiative_id: i.id,
        kpi_id: kpiId,
        title: msTitle,
        due_date: msDue || null,
        sort_order: milestones.length,
      });
      setMsTitle("");
      setMsDue("");
      setShowMs(false);
      router.refresh();
    });
  }
  function toggleMs(m: KpiMilestone) {
    start(async () => {
      await toggleMilestone(m.id, kpiId, !m.done);
      router.refresh();
    });
  }
  function removeMs(m: KpiMilestone) {
    start(async () => {
      await deleteMilestone(m.id, kpiId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-dark">{i.title}</p>
          {i.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {i.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {i.owner?.full_name && (
              <span className="flex items-center gap-1 font-semibold text-slate-500">
                <UserCircle2 size={13} />
                {i.owner.full_name}
              </span>
            )}
            {i.due_date && (
              <span className="flex items-center gap-1">
                <CalendarClock size={12} />
                استحقاق: {fmtDate(i.due_date)}
              </span>
            )}
            {milestones.length > 0 && (
              <span>
                المعالم: {doneCount}/{milestones.length}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}
        >
          {st.label}
        </span>
      </div>

      {/* شريط التقدّم */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>نسبة الإنجاز</span>
          <span className="font-bold text-brand-dark">{i.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${i.progress}%` }}
          />
        </div>
      </div>

      {/* المعالم */}
      {milestones.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => canManage && toggleMs(m)}
                disabled={!canManage || pending}
                className="shrink-0 text-brand-primary disabled:opacity-60"
              >
                {m.done ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <span
                className={`flex-1 ${
                  m.done ? "text-slate-400 line-through" : "text-slate-600"
                }`}
              >
                {m.title}
              </span>
              {m.due_date && (
                <span className="text-[10px] text-slate-400">
                  {fmtDate(m.due_date)}
                </span>
              )}
              {canManage && (
                <button
                  onClick={() => removeMs(m)}
                  disabled={pending}
                  className="text-slate-300 hover:text-brand-accent"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* نموذج إضافة معلَم */}
      {canManage && showMs && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5">
          <input
            className="input flex-1 py-1.5 text-sm"
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="عنوان المعلَم"
          />
          <input
            type="date"
            className="input w-auto py-1.5 text-sm"
            value={msDue}
            onChange={(e) => setMsDue(e.target.value)}
          />
          <button
            onClick={addMs}
            disabled={pending}
            className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            إضافة
          </button>
        </div>
      )}

      {/* أدوات الإدارة */}
      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            الحالة:
            <FilterSelect
              className="w-full"
              value={i.status ?? ""}
              onValueChange={(v) => setStatus(v as InitiativeStatus)}
              disabled={pending}
              options={(Object.keys(STATUS) as InitiativeStatus[]).map((s) => ({
                value: s,
                label: STATUS[s].label,
              }))}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            الإنجاز %:
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={i.progress}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v !== i.progress) setProgress(v);
              }}
              className="input w-20 py-1 text-xs"
              disabled={pending}
            />
          </label>
          {!showMs && (
            <button
              onClick={() => setShowMs(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
            >
              <Flag size={13} /> معلَم
            </button>
          )}
          <button
            onClick={remove}
            disabled={pending}
            className="mr-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50"
          >
            <Trash2 size={13} /> حذف الخطة
          </button>
        </div>
      )}
    </div>
  );
}
