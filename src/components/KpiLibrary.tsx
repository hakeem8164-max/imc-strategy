"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import NumberInput from "@/components/ui/NumberInput";
import Modal from "@/components/ui/Modal";
import { notify } from "@/components/ui/toast";
import { confirmDialog, promptDialog } from "@/components/ui/confirm";
import {
  addDimension,
  deleteDimension,
  addObjective,
  renameObjective,
  deleteObjective,
  addKpi,
  toggleKpiActive,
  deleteKpi,
  type KpiInput,
} from "@/app/(app)/admin/library/actions";
import {
  FREQUENCIES,
  UNITS,
  POLARITIES,
  AGGREGATIONS,
  computeTotalTarget,
  formatNum,
  type Dimension,
  type Objective,
  type Kpi,
  type OrgUnit,
  type Aggregation,
  type Polarity,
  type Unit,
} from "@/lib/types";

export default function KpiLibrary({
  dimensions,
  objectives,
  kpis,
  orgUnits,
}: {
  dimensions: Dimension[];
  objectives: Objective[];
  kpis: Kpi[];
  orgUnits: OrgUnit[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openDim, setOpenDim] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Kpi | null>(null);

  // إضافة منظور
  const [showAddDim, setShowAddDim] = useState(false);
  const [dimName, setDimName] = useState("");
  const [dimColor, setDimColor] = useState("#8C341F");

  // إضافة هدف (لكل منظور)
  const [addingObjFor, setAddingObjFor] = useState<string | null>(null);
  const [objName, setObjName] = useState("");

  const ownerName = (id: string | null) =>
    id ? orgUnits.find((u) => u.id === id)?.name ?? "—" : "—";

  function createDim() {
    startTransition(async () => {
      const res = await addDimension(dimName, dimColor);
      if (res.ok) {
        setDimName("");
        setShowAddDim(false);
        router.refresh();
      } else notify(res.error || "خطأ", "error");
    });
  }

  async function removeDim(d: Dimension) {
    if (await confirmDialog(`حذف المنظور «${d.name}»؟`, { danger: true, confirmText: "حذف" })) {
      startTransition(async () => {
        const res = await deleteDimension(d.id);
        if (res.ok) router.refresh();
        else notify(res.error || "خطأ", "error");
      });
    }
  }

  function createObjective(dimId: string) {
    if (!objName.trim()) return;
    startTransition(async () => {
      const res = await addObjective(dimId, objName);
      if (res.ok) {
        setObjName("");
        setAddingObjFor(null);
        setOpenDim((s) => ({ ...s, [dimId]: true }));
        router.refresh();
      } else notify(res.error || "خطأ", "error");
    });
  }

  async function editObjective(o: Objective) {
    const name = await promptDialog("اسم الهدف:", {
      title: "تعديل اسم الهدف",
      defaultValue: o.name,
      confirmText: "حفظ",
    });
    if (name == null) return;
    startTransition(async () => {
      const res = await renameObjective(o.id, name);
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  async function removeObjective(o: Objective) {
    if (await confirmDialog(`حذف الهدف «${o.name}»؟`, { danger: true, confirmText: "حذف" })) {
      startTransition(async () => {
        const res = await deleteObjective(o.id);
        if (res.ok) router.refresh();
        else notify(res.error || "خطأ", "error");
      });
    }
  }

  function createKpi(objId: string) {
    startTransition(async () => {
      const res = await addKpi(objId);
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  function toggleActive(k: Kpi) {
    startTransition(async () => {
      const res = await toggleKpiActive(k.id, !k.is_active);
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  async function removeKpi(k: Kpi) {
    if (await confirmDialog(`حذف المؤشر «${k.name}»؟ سيُحذف مع كل قياساته.`, { danger: true, confirmText: "حذف" })) {
      startTransition(async () => {
        const res = await deleteKpi(k.id);
        if (res.ok) router.refresh();
        else notify(res.error || "خطأ", "error");
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {dimensions.length} مناظير · {objectives.length} أهداف · {kpis.length} مؤشر
        </p>
        <button onClick={() => setShowAddDim((v) => !v)} className="btn-primary">
          + منظور جديد
        </button>
      </div>

      {showAddDim && (
        <div className="card flex flex-wrap items-end gap-2 p-4">
          <div>
            <label className="label">اسم المنظور</label>
            <input
              className="input"
              placeholder="مثال: المنظور المالي"
              value={dimName}
              onChange={(e) => setDimName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">اللون</label>
            <input
              type="color"
              className="h-[42px] w-16 cursor-pointer rounded-lg border border-slate-200 p-1"
              value={dimColor}
              onChange={(e) => setDimColor(e.target.value)}
            />
          </div>
          <button onClick={createDim} disabled={pending} className="btn-primary">
            حفظ
          </button>
          <button onClick={() => setShowAddDim(false)} className="btn-ghost">
            إلغاء
          </button>
        </div>
      )}

      {/* أكورديون المناظير */}
      <div className="space-y-3">
        {dimensions.map((d) => {
          const dimObjectives = objectives.filter((o) => o.dimension_id === d.id);
          const dimKpiCount = kpis.filter((k) => k.dimension_id === d.id).length;
          const isOpen = openDim[d.id];
          return (
            <Collapsible.Root
              key={d.id}
              open={isOpen}
              onOpenChange={(o) => setOpenDim((s) => ({ ...s, [d.id]: o }))}
              className="card overflow-hidden"
            >
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ backgroundColor: `${d.color}14` }}
              >
                <Collapsible.Trigger className="flex flex-1 items-center gap-3 text-right outline-none">
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <h3 className="font-bold text-mushar-dark">{d.name}</h3>
                  <span className="text-xs text-slate-400">
                    ({dimObjectives.length} أهداف · {dimKpiCount} مؤشر)
                  </span>
                </Collapsible.Trigger>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAddingObjFor(d.id);
                      setObjName("");
                      setOpenDim((s) => ({ ...s, [d.id]: true }));
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-mushar-primary shadow-sm hover:bg-mushar-pale/40"
                  >
                    + هدف
                  </button>
                  <button
                    onClick={() => removeDim(d)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
                  >
                    حذف المنظور
                  </button>
                </div>
              </div>

              <Collapsible.Panel>
                <div className="space-y-3 p-4">
                  {addingObjFor === d.id && (
                    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                      <div className="flex-1">
                        <label className="label">اسم الهدف الجديد</label>
                        <input
                          className="input"
                          placeholder="مثال: تعزيز الاستقرار المالي"
                          value={objName}
                          onChange={(e) => setObjName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => createObjective(d.id)}
                        disabled={pending}
                        className="btn-primary"
                      >
                        حفظ الهدف
                      </button>
                      <button
                        onClick={() => setAddingObjFor(null)}
                        className="btn-ghost"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}

                  {dimObjectives.length === 0 && addingObjFor !== d.id && (
                    <p className="py-4 text-center text-sm text-slate-400">
                      لا أهداف بعد — اضغط «+ هدف».
                    </p>
                  )}

                  {dimObjectives.map((o) => {
                    const list = kpis.filter((k) => k.objective_id === o.id);
                    return (
                      <div
                        key={o.id}
                        className="rounded-xl border border-slate-100"
                      >
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                          <span className="text-xs font-bold text-mushar-accent">
                            {o.code ?? "هدف"}
                          </span>
                          <h4 className="text-sm font-bold text-mushar-dark">
                            {o.name}
                          </h4>
                          <span className="text-xs text-slate-400">
                            ({list.length} مؤشر)
                          </span>
                          <div className="mr-auto flex items-center gap-1">
                            <button
                              onClick={() => createKpi(o.id)}
                              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-mushar-primary shadow-sm hover:bg-mushar-pale/40"
                            >
                              + مؤشر
                            </button>
                            <button
                              onClick={() => editObjective(o)}
                              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => removeObjective(o)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
                            >
                              حذف
                            </button>
                          </div>
                        </div>

                        {list.length === 0 ? (
                          <p className="px-4 py-4 text-center text-xs text-slate-400">
                            لا مؤشرات تحت هذا الهدف — اضغط «+ مؤشر».
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {list.map((k) => (
                              <div
                                key={k.id}
                                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                                  k.is_active ? "" : "bg-slate-50/60 opacity-70"
                                }`}
                              >
                                <div className="min-w-[200px] flex-1">
                                  <p className="text-sm font-semibold text-mushar-dark">
                                    {k.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    المالك: {ownerName(k.owner_unit_id)} ·{" "}
                                    {k.frequency || "—"} ·{" "}
                                    {
                                      POLARITIES.find(
                                        (p) => p.value === k.polarity
                                      )?.label
                                    }
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[11px] text-slate-400">
                                    المستهدف الكلي
                                  </p>
                                  <p className="text-sm font-bold text-mushar-primary">
                                    {k.target_total != null
                                      ? formatNum(k.target_total)
                                      : "—"}
                                    {k.unit}
                                  </p>
                                </div>
                                <ToggleSwitch
                                  checked={k.is_active}
                                  onCheckedChange={() => toggleActive(k)}
                                  title={k.is_active ? "مفعّل" : "موقوف"}
                                />
                                <button
                                  onClick={() => setEditing(k)}
                                  className="btn-ghost px-3 py-1.5 text-xs"
                                >
                                  تحرير
                                </button>
                                <button
                                  onClick={() => removeKpi(k)}
                                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
                                >
                                  حذف
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Collapsible.Panel>
            </Collapsible.Root>
          );
        })}
        {dimensions.length === 0 && (
          <div className="card p-10 text-center text-sm text-slate-400">
            لا توجد مناظير بعد — أضِف أول منظور.
          </div>
        )}
      </div>

      {editing && (
        <EditKpiModal
          kpi={editing}
          objectives={objectives}
          dimensions={dimensions}
          orgUnits={orgUnits}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditKpiModal({
  kpi,
  objectives,
  dimensions,
  orgUnits,
  onClose,
  onSaved,
}: {
  kpi: Kpi;
  objectives: Objective[];
  dimensions: Dimension[];
  orgUnits: OrgUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<KpiInput>({
    name: kpi.name,
    description: kpi.description,
    objective_id: kpi.objective_id,
    owner_unit_id: kpi.owner_unit_id,
    measurement_method: kpi.measurement_method,
    unit: kpi.unit,
    frequency: kpi.frequency,
    polarity: kpi.polarity,
    aggregation: kpi.aggregation,
    target_q1: kpi.target_q1,
    target_q2: kpi.target_q2,
    target_q3: kpi.target_q3,
    target_q4: kpi.target_q4,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<KpiInput>) => setF((s) => ({ ...s, ...patch }));

  const dimName = (id: string) =>
    dimensions.find((d) => d.id === id)?.name ?? "";

  const total = computeTotalTarget(f.aggregation, [
    f.target_q1,
    f.target_q2,
    f.target_q3,
    f.target_q4,
  ]);

  async function save() {
    setBusy(true);
    setErr(null);
    const { updateKpi } = await import("@/app/(app)/admin/library/actions");
    const res = await updateKpi(kpi.id, f);
    setBusy(false);
    if (res.ok) onSaved();
    else setErr(res.error || "خطأ");
  }

  const qInput = (
    label: string,
    key: "target_q1" | "target_q2" | "target_q3" | "target_q4"
  ) => (
    <div>
      <label className="label">{label}</label>
      <NumberInput
        step={1}
        value={f[key] ?? null}
        onValueChange={(n) => set({ [key]: n } as Partial<KpiInput>)}
      />
    </div>
  );

  return (
    <Modal open onClose={onClose} title="تحرير المؤشر">
      <div>
        <div className="space-y-4">
          <div>
            <label className="label">اسم المؤشر</label>
            <input
              className="input"
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">الهدف الاستراتيجي (المنظور)</label>
            <FilterSelect
              className="w-full"
              value={f.objective_id ?? ""}
              onValueChange={(v) => set({ objective_id: v || null })}
              options={[
                { value: "", label: "— بدون هدف —" },
                ...objectives.map((o) => ({
                  value: o.id,
                  label: `${dimName(o.dimension_id)} ← ${o.name}`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="label">الوصف</label>
            <textarea
              className="input min-h-[70px]"
              value={f.description ?? ""}
              onChange={(e) => set({ description: e.target.value || null })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">المالك (من الهيكل التنظيمي)</label>
              <FilterSelect
                className="w-full"
                value={f.owner_unit_id ?? ""}
                onValueChange={(v) => set({ owner_unit_id: v || null })}
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
              <label className="label">دورية القياس</label>
              <FilterSelect
                className="w-full"
                value={f.frequency ?? ""}
                onValueChange={(v) => set({ frequency: v || null })}
                options={[
                  { value: "", label: "— اختر —" },
                  ...FREQUENCIES.map((fr) => ({ value: fr, label: fr })),
                ]}
              />
            </div>
          </div>

          <div>
            <label className="label">المعادلة (آلية القياس)</label>
            <textarea
              className="input min-h-[60px]"
              value={f.measurement_method ?? ""}
              onChange={(e) =>
                set({ measurement_method: e.target.value || null })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">الوحدة</label>
              <FilterSelect
                className="w-full"
                value={f.unit ?? ""}
                onValueChange={(v) => set({ unit: v as Unit })}
                options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
              />
            </div>
            <div>
              <label className="label">القطبية</label>
              <FilterSelect
                className="w-full"
                value={f.polarity ?? ""}
                onValueChange={(v) => set({ polarity: v as Polarity })}
                options={POLARITIES.map((p) => ({
                  value: p.value,
                  label: p.label,
                }))}
              />
            </div>
            <div>
              <label className="label">آلية الاحتساب</label>
              <FilterSelect
                className="w-full"
                value={f.aggregation ?? ""}
                onValueChange={(v) => set({ aggregation: v as Aggregation })}
                options={AGGREGATIONS.map((a) => ({
                  value: a.value,
                  label: a.label,
                }))}
              />
            </div>
          </div>

          <div>
            <p className="label">
              مستهدفات الأرباع (اترك أي ربع فارغًا إن لم يكن له مستهدف)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {qInput("الربع الأول", "target_q1")}
              {qInput("الربع الثاني", "target_q2")}
              {qInput("الربع الثالث", "target_q3")}
              {qInput("الربع الرابع", "target_q4")}
            </div>
          </div>

          <div className="rounded-xl bg-mushar-pale/30 px-4 py-3">
            <span className="text-sm text-slate-600">
              المستهدف الكلي (تلقائي):{" "}
            </span>
            <span className="text-lg font-bold text-mushar-primary">
              {total != null ? formatNum(total) : "—"}
              {f.unit}
            </span>
            <span className="mr-2 text-xs text-slate-400">
              (حسب آلية:{" "}
              {AGGREGATIONS.find((a) => a.value === f.aggregation)?.label})
            </span>
          </div>

          {err && (
            <div className="rounded-lg bg-mushar-accent/10 px-3 py-2.5 text-sm text-mushar-accent">
              {err}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            إلغاء
          </button>
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
