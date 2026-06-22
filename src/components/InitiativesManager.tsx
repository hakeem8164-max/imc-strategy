"use client";

import { useState, useTransition } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Target,
  ChevronDown,
  Building2,
  User,
  Flag,
  PackageCheck,
} from "lucide-react";
import {
  createInitiative,
  removeInitiative,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
  addDeliverable,
  toggleDeliverable,
  deleteDeliverable,
} from "@/app/(app)/initiatives/actions";
import type { Objective, Profile, OrgUnit } from "@/lib/types";
import type { KpiInitiative } from "@/lib/data";
import { computeAutoStatus, AUTO_STATUS, achievedWeight } from "@/lib/initiative-status";

const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

type MsRow = { title: string; weight: string; start: string; due: string };
type DelRow = { title: string };

function StatusBadge({
  done,
  start_date,
  due_date,
}: {
  done: boolean;
  start_date: string | null;
  due_date: string | null;
}) {
  const s = AUTO_STATUS[computeAutoStatus({ done, start_date, due_date })];
  return (
    <span
      className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${s.color}1a`, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function InitiativesManager({
  objectives,
  users,
  orgUnits,
  initiatives,
  canManage,
}: {
  objectives: Objective[];
  users: Profile[];
  orgUnits: OrgUnit[];
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
  const [unitId, setUnitId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [startYear, setStartYear] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [ms, setMs] = useState<MsRow[]>(
    Array.from({ length: 5 }, () => ({ title: "", weight: "", start: "", due: "" }))
  );
  const [dels, setDels] = useState<DelRow[]>([{ title: "" }, { title: "" }]);

  const filledMs = ms.filter((m) => m.title.trim());
  const weightSum = filledMs.reduce((a, m) => a + (Number(m.weight) || 0), 0);
  const allMsWeighted = filledMs.every((m) => Number(m.weight) > 0);
  const valid =
    !!objectiveId &&
    !!title.trim() &&
    filledMs.length >= 5 &&
    allMsWeighted &&
    weightSum === 100;

  function resetForm() {
    setObjectiveId("");
    setTitle("");
    setDescription("");
    setUnitId("");
    setManagerId("");
    setStartYear("");
    setStart("");
    setDue("");
    setMs(Array.from({ length: 5 }, () => ({ title: "", weight: "", start: "", due: "" })));
    setDels([{ title: "" }, { title: "" }]);
    setErr(null);
  }

  function updateMs(idx: number, patch: Partial<MsRow>) {
    setMs((s) => s.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await createInitiative({
        objective_id: objectiveId,
        title,
        description: description || null,
        owner_unit_id: unitId || null,
        owner_user_id: managerId || null,
        start_year: startYear ? Number(startYear) : null,
        start_date: start || null,
        due_date: due || null,
        milestones: filledMs.map((m) => ({
          title: m.title,
          weight: Number(m.weight) || 0,
          start_date: m.start || null,
          due_date: m.due || null,
        })),
        deliverables: dels.filter((d) => d.title.trim()),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        alert("تم رفع طلب إنشاء المبادرة. سيظهر بعد اعتماده النهائي.");
        router.refresh();
      } else setErr(res.error || "خطأ");
    });
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
              <FilterSelect
                className="w-full"
                value={objectiveId ?? ""}
                onValueChange={(v) => setObjectiveId(v)}
                options={[
                  { value: "", label: "— اختر الهدف —" },
                  ...objectives.map((o) => ({
                    value: o.id,
                    label: `${o.dimension?.name ? `${o.dimension.name} ← ` : ""}${o.code ? `${o.code} ` : ""}${o.name}`,
                  })),
                ]}
              />
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
                className="input min-h-[60px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">الإدارة المالكة</label>
              <FilterSelect
                className="w-full"
                value={unitId ?? ""}
                onValueChange={(v) => setUnitId(v)}
                options={[
                  { value: "", label: "— بدون —" },
                  ...orgUnits.map((u) => ({
                    value: u.id,
                    label: `${u.unit_type}: ${u.name}`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="label">مدير المبادرة (المسؤول)</label>
              <FilterSelect
                className="w-full"
                value={managerId ?? ""}
                onValueChange={(v) => setManagerId(v)}
                options={[
                  { value: "", label: "— بدون —" },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.full_name ?? u.email ?? "",
                  })),
                ]}
              />
            </div>
            <div>
              <label className="label">سنة بداية المبادرة</label>
              <FilterSelect
                className="w-full"
                value={startYear ?? ""}
                onValueChange={(v) => setStartYear(v)}
                options={[
                  { value: "", label: "— اختر السنة —" },
                  ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
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

          {/* المعالم */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Flag size={15} className="text-mushar-primary" />
              <h4 className="text-sm font-bold text-mushar-dark">
                المعالم (5 على الأقل)
              </h4>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  filledMs.length >= 5 && weightSum === 100
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {filledMs.length} معلَم · مجموع الأوزان {weightSum}%
              </span>
            </div>
            <div className="space-y-2">
              {ms.map((m, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_130px_130px_auto]"
                >
                  <input
                    className="input py-1.5 text-xs"
                    placeholder={`المعلَم ${idx + 1}`}
                    value={m.title}
                    onChange={(e) => updateMs(idx, { title: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input py-1.5 text-xs"
                    placeholder="الوزن %"
                    value={m.weight}
                    onChange={(e) => updateMs(idx, { weight: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input py-1.5 text-xs"
                    title="تاريخ البداية"
                    value={m.start}
                    onChange={(e) => updateMs(idx, { start: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input py-1.5 text-xs"
                    title="تاريخ النهاية"
                    value={m.due}
                    onChange={(e) => updateMs(idx, { due: e.target.value })}
                  />
                  <button
                    onClick={() => setMs((s) => s.filter((_, i) => i !== idx))}
                    className="rounded-lg px-2 text-xs text-mushar-accent hover:bg-mushar-accent/10 disabled:cursor-not-allowed disabled:opacity-30"
                    title={ms.length <= 5 ? "الحد الأدنى 5 معالم" : "حذف الصف"}
                    disabled={ms.length <= 5}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setMs((s) => [...s, { title: "", weight: "", start: "", due: "" }])
              }
              className="btn-ghost mt-2 py-1.5 text-xs"
            >
              + صف معلَم
            </button>
          </div>

          {/* المخرجات */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <PackageCheck size={15} className="text-mushar-primary" />
              <h4 className="text-sm font-bold text-mushar-dark">
                المخرجات (كل مخرج على حدة)
              </h4>
            </div>
            <div className="space-y-2">
              {dels.map((d, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="input py-1.5 text-xs"
                    placeholder={`المخرج ${idx + 1}`}
                    value={d.title}
                    onChange={(e) =>
                      setDels((s) =>
                        s.map((x, i) =>
                          i === idx ? { title: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    onClick={() => setDels((s) => s.filter((_, i) => i !== idx))}
                    className="rounded-lg px-2 text-xs text-mushar-accent hover:bg-mushar-accent/10"
                    disabled={dels.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDels((s) => [...s, { title: "" }])}
              className="btn-ghost mt-2 py-1.5 text-xs"
            >
              + مخرج
            </button>
          </div>

          {err && (
            <div className="rounded-lg bg-mushar-accent/10 px-3 py-2.5 text-sm text-mushar-accent">
              {err}
            </div>
          )}
          {!valid && (
            <p className="text-[11px] text-amber-700">
              للحفظ: اختر الهدف، اكتب العنوان، وأدخل 5 معالم على الأقل، لكل معلَم
              وزن أكبر من صفر، ومجموع الأوزان 100%.
            </p>
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
            <button
              onClick={save}
              disabled={pending || !valid}
              className="btn-primary disabled:opacity-50"
            >
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
          {initiatives.map((i) => (
            <InitiativeCard
              key={i.id}
              i={i}
              users={users}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InitiativeCard({
  i,
  users,
  canManage,
}: {
  i: KpiInitiative;
  users: Profile[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const obj = i.objective;
  const milestones = i.milestones ?? [];
  const deliverables = i.deliverables ?? [];

  const totalWeight = milestones.reduce((a, m) => a + (m.weight ?? 0), 0);
  const doneWeight = achievedWeight(milestones);
  const allDone =
    milestones.length > 0 && milestones.every((m) => (m.progress ?? 0) >= 100);
  const delDone = deliverables.filter((d) => d.done).length;

  // تواريخ المبادرة الفعلية (المُدخلة أو المشتقّة من المعالم)
  const msStarts = milestones.map((m) => m.start_date).filter(Boolean) as string[];
  const msDues = milestones.map((m) => m.due_date).filter(Boolean) as string[];
  const effStart = i.start_date ?? msStarts.sort()[0] ?? null;
  const effDue = i.due_date ?? msDues.sort().slice(-1)[0] ?? null;

  const managerName =
    i.owner?.full_name ??
    (i.owner_user_id
      ? users.find((u) => u.id === i.owner_user_id)?.full_name
      : null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  }

  function remove() {
    if (confirm(`رفع طلب حذف المبادرة «${i.title}»؟`))
      run(() => removeInitiative(i.id, i.title));
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        {obj && (
          <span className="inline-flex items-center gap-1 rounded-md bg-mushar-pale/40 px-2 py-0.5 text-[11px] font-semibold text-mushar-primary">
            <Target size={12} />
            {obj.code ? `${obj.code} ` : ""}
            {obj.name}
          </span>
        )}
        <StatusBadge
          done={allDone || doneWeight === 100}
          start_date={effStart}
          due_date={effDue}
        />
      </div>

      <h3 className="text-sm font-bold leading-relaxed text-mushar-dark">
        {i.title}
      </h3>
      {i.description && (
        <p className="text-xs leading-relaxed text-slate-500">{i.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {i.start_year && (
          <span className="font-semibold text-mushar-dark">
            سنة البداية: {i.start_year}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Building2 size={12} /> {i.owner_unit?.name ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <User size={12} /> {managerName ?? "—"}
        </span>
        {effDue && <span>الاستحقاق: {effDue}</span>}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
          <span>الإنجاز (حسب أوزان المعالم)</span>
          <span>{doneWeight}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-mushar-primary"
            style={{ width: `${Math.min(doneWeight, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
          المعالم: {milestones.length} · الأوزان {totalWeight}%
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
          <PackageCheck size={12} /> المخرجات: {delDone}/{deliverables.length}
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="mr-auto inline-flex items-center gap-1 font-semibold text-mushar-primary hover:underline"
        >
          {open ? "إخفاء" : "للمزيد"}
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-slate-100 pt-4">
          <MilestonesSection
            initiativeId={i.id}
            milestones={milestones}
            canManage={canManage}
            onChange={() => router.refresh()}
          />
          <DeliverablesSection
            initiativeId={i.id}
            deliverables={deliverables}
            canManage={canManage}
            onChange={() => router.refresh()}
          />
        </div>
      )}

      {canManage && (
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={remove}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
          >
            <Trash2 size={14} /> حذف المبادرة
          </button>
        </div>
      )}
    </div>
  );
}

function MilestonesSection({
  initiativeId,
  milestones,
  canManage,
  onChange,
}: {
  initiativeId: string;
  milestones: NonNullable<KpiInitiative["milestones"]>;
  canManage: boolean;
  onChange: () => void;
}) {
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");

  function add() {
    if (!title.trim()) return;
    if (!(Number(weight) > 0)) {
      alert("لكل معلَم وزن أكبر من صفر.");
      return;
    }
    startTransition(async () => {
      const res = await addMilestone({
        initiative_id: initiativeId,
        title,
        weight: weight ? Number(weight) : 0,
        start_date: start || null,
        due_date: due || null,
        sort_order: milestones.length + 1,
      });
      if (res.ok) {
        setTitle("");
        setWeight("");
        setStart("");
        setDue("");
        onChange();
      } else alert(res.error);
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onChange();
      else alert(res.error);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Flag size={14} className="text-mushar-primary" />
        <h4 className="text-sm font-bold text-mushar-dark">المعالم</h4>
      </div>
      <div className="space-y-1.5">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
          >
            <input
              type="checkbox"
              checked={m.done}
              disabled={!canManage}
              onChange={(e) => act(() => toggleMilestone(m.id, e.target.checked))}
              className="h-4 w-4 accent-mushar-primary"
            />
            <span
              className={`font-medium ${
                m.done ? "text-slate-400 line-through" : "text-mushar-dark"
              }`}
            >
              {m.title}
            </span>
            <span className="rounded bg-white px-1.5 py-0.5 font-bold text-mushar-primary">
              {m.weight}%
            </span>
            <StatusBadge
              done={(m.progress ?? 0) >= 100}
              start_date={m.start_date}
              due_date={m.due_date}
            />
            <span className="text-slate-400">
              {m.start_date ?? "؟"} → {m.due_date ?? "؟"}
            </span>
            {canManage && (
              <button
                onClick={() => {
                  if (milestones.length <= 5) {
                    alert("لا يمكن النزول تحت 5 معالم.");
                    return;
                  }
                  act(() => deleteMilestone(m.id));
                }}
                className="mr-auto text-mushar-accent hover:underline disabled:opacity-30"
                disabled={milestones.length <= 5}
              >
                حذف
              </button>
            )}
          </div>
        ))}
        {milestones.length === 0 && (
          <p className="text-xs text-slate-400">لا معالم.</p>
        )}
      </div>

      {canManage && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-200 p-2 sm:grid-cols-5">
          <input
            className="input col-span-2 py-1.5 text-xs"
            placeholder="عنوان المعلَم"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="number"
            min={0}
            max={100}
            className="input py-1.5 text-xs"
            placeholder="الوزن %"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            type="date"
            className="input py-1.5 text-xs"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            className="input py-1.5 text-xs"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <button
            onClick={add}
            className="btn-primary col-span-2 py-1.5 text-xs sm:col-span-5"
          >
            + إضافة معلَم
          </button>
        </div>
      )}
    </div>
  );
}

function DeliverablesSection({
  initiativeId,
  deliverables,
  canManage,
  onChange,
}: {
  initiativeId: string;
  deliverables: NonNullable<KpiInitiative["deliverables"]>;
  canManage: boolean;
  onChange: () => void;
}) {
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onChange();
      else alert(res.error);
    });
  }

  function add() {
    if (!title.trim()) return;
    act(async () => {
      const res = await addDeliverable({
        initiative_id: initiativeId,
        title,
        sort_order: deliverables.length + 1,
      });
      if (res.ok) setTitle("");
      return res;
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <PackageCheck size={14} className="text-mushar-primary" />
        <h4 className="text-sm font-bold text-mushar-dark">المخرجات</h4>
        <span className="text-[11px] text-slate-400">
          المنجز {deliverables.filter((d) => d.done).length} من{" "}
          {deliverables.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {deliverables.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
          >
            <input
              type="checkbox"
              checked={d.done}
              disabled={!canManage}
              onChange={(e) => act(() => toggleDeliverable(d.id, e.target.checked))}
              className="h-4 w-4 accent-emerald-600"
            />
            <span
              className={`font-medium ${
                d.done ? "text-emerald-700 line-through" : "text-mushar-dark"
              }`}
            >
              {d.title}
            </span>
            {canManage && (
              <button
                onClick={() => act(() => deleteDeliverable(d.id))}
                className="mr-auto text-mushar-accent hover:underline"
              >
                حذف
              </button>
            )}
          </div>
        ))}
        {deliverables.length === 0 && (
          <p className="text-xs text-slate-400">لا مخرجات.</p>
        )}
      </div>

      {canManage && (
        <div className="mt-2 flex gap-2">
          <input
            className="input py-1.5 text-xs"
            placeholder="أضف مخرجًا"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button onClick={add} className="btn-primary shrink-0 py-1.5 text-xs">
            + مخرج
          </button>
        </div>
      )}
    </div>
  );
}
