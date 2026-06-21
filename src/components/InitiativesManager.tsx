"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target } from "lucide-react";
import {
  createInitiative,
  setInitiativeStatus,
  removeInitiative,
} from "@/app/(app)/initiatives/actions";
import type { Objective, Profile } from "@/lib/types";
import type { KpiInitiative, InitiativeStatus } from "@/lib/data";

const STATUS: Record<InitiativeStatus, { label: string; color: string }> = {
  planned: { label: "مخطّطة", color: "#64748b" },
  in_progress: { label: "قيد التنفيذ", color: "#2563eb" },
  done: { label: "مكتملة", color: "#16a34a" },
  cancelled: { label: "ملغاة", color: "#A11249" },
};

export default function InitiativesManager({
  objectives,
  users,
  initiatives,
  canManage,
}: {
  objectives: Objective[];
  users: Profile[];
  initiatives: KpiInitiative[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [objectiveId, setObjectiveId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");

  const objName = useMemo(() => {
    const m: Record<string, Objective> = {};
    for (const o of objectives) m[o.id] = o;
    return m;
  }, [objectives]);

  function resetForm() {
    setObjectiveId("");
    setTitle("");
    setDescription("");
    setOwnerId("");
    setStart("");
    setDue("");
    setErr(null);
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await createInitiative({
        objective_id: objectiveId,
        title,
        description: description || null,
        owner_user_id: ownerId || null,
        start_date: start || null,
        due_date: due || null,
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        router.refresh();
      } else setErr(res.error || "خطأ");
    });
  }

  function changeStatus(id: string, status: InitiativeStatus) {
    startTransition(async () => {
      const res = await setInitiativeStatus(id, status);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  }

  function remove(i: KpiInitiative) {
    if (confirm(`حذف المبادرة «${i.title}»؟`)) {
      startTransition(async () => {
        const res = await removeInitiative(i.id);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{initiatives.length} مبادرة</p>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> إنشاء مبادرة
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div className="card space-y-4 p-5">
          <h3 className="font-bold text-mushar-dark">مبادرة جديدة</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">الهدف الاستراتيجي المرتبط *</label>
              <select
                className="input"
                value={objectiveId}
                onChange={(e) => setObjectiveId(e.target.value)}
              >
                <option value="">— اختر الهدف —</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.dimension?.name ? `${o.dimension.name} ← ` : ""}
                    {o.code ? `${o.code} ` : ""}
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">عنوان المبادرة *</label>
              <input
                className="input"
                placeholder="مثال: إعداد دراسة الأنظمة واللوائح واقتراح التعديلات"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">الوصف</label>
              <textarea
                className="input min-h-[70px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">المالك</label>
              <select
                className="input"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">— بدون —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">تاريخ البداية</label>
                <input
                  type="date"
                  className="input"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  className="input"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
            </div>
          </div>

          {err && (
            <div className="rounded-lg bg-mushar-accent/10 px-3 py-2.5 text-sm text-mushar-accent">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn-ghost"
            >
              إلغاء
            </button>
            <button onClick={save} disabled={pending} className="btn-primary">
              {pending ? "جارٍ الحفظ…" : "حفظ المبادرة"}
            </button>
          </div>
        </div>
      )}

      {initiatives.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">
          لا توجد مبادرات بعد{canManage ? " — اضغط «إنشاء مبادرة»." : "."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {initiatives.map((i) => {
            const st = STATUS[i.status];
            const obj = i.objective ?? (i.objective_id ? objName[i.objective_id] : null);
            return (
              <div key={i.id} className="card space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  {obj && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-mushar-pale/40 px-2 py-0.5 text-[11px] font-semibold text-mushar-primary">
                      <Target size={12} />
                      {("code" in obj && obj.code) ? `${obj.code} ` : ""}
                      {obj.name}
                    </span>
                  )}
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: `${st.color}1a`, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                <h3 className="text-sm font-bold leading-relaxed text-mushar-dark">
                  {i.title}
                </h3>
                {i.description && (
                  <p className="text-xs leading-relaxed text-slate-500">
                    {i.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span>المالك: {i.owner?.full_name ?? "—"}</span>
                  {i.due_date && <span>الاستحقاق: {i.due_date}</span>}
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                    <span>الإنجاز</span>
                    <span>{i.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(i.progress, 100)}%`,
                        backgroundColor: st.color,
                      }}
                    />
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <select
                      className="input py-1.5 text-xs"
                      value={i.status}
                      onChange={(e) =>
                        changeStatus(i.id, e.target.value as InitiativeStatus)
                      }
                    >
                      {(
                        Object.keys(STATUS) as InitiativeStatus[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s].label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => remove(i)}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
                      title="حذف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
