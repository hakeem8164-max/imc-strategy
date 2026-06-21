"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDimension,
  deleteDimension,
  addKpi,
  updateKpi,
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
  type Kpi,
  type OrgUnit,
  type Aggregation,
  type Polarity,
  type Unit,
} from "@/lib/types";

export default function KpiLibrary({
  dimensions,
  kpis,
  orgUnits,
}: {
  dimensions: Dimension[];
  kpis: Kpi[];
  orgUnits: OrgUnit[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Kpi | null>(null);

  // إضافة بعد
  const [showAddDim, setShowAddDim] = useState(false);
  const [dimName, setDimName] = useState("");
  const [dimColor, setDimColor] = useState("#8C341F");

  const ownerName = (id: string | null) =>
    id ? orgUnits.find((u) => u.id === id)?.name ?? "—" : "—";

  function toggleOpen(id: string) {
    setOpen((s) => ({ ...s, [id]: !s[id] }));
  }

  function createDim() {
    startTransition(async () => {
      const res = await addDimension(dimName, dimColor);
      if (res.ok) {
        setDimName("");
        setShowAddDim(false);
        router.refresh();
      } else alert(res.error);
    });
  }

  function removeDim(d: Dimension) {
    if (confirm(`حذف البعد «${d.name}»؟`)) {
      startTransition(async () => {
        const res = await deleteDimension(d.id);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  function createKpi(dimId: string) {
    startTransition(async () => {
      const res = await addKpi(dimId);
      if (res.ok) {
        setOpen((s) => ({ ...s, [dimId]: true }));
        router.refresh();
      } else alert(res.error);
    });
  }

  function toggleActive(k: Kpi) {
    startTransition(async () => {
      const res = await toggleKpiActive(k.id, !k.is_active);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  }

  function removeKpi(k: Kpi) {
    if (confirm(`حذف المؤشر «${k.name}»؟ سيُحذف مع كل قياساته.`)) {
      startTransition(async () => {
        const res = await deleteKpi(k.id);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {dimensions.length} أبعاد · {kpis.length} مؤشر
        </p>
        <button onClick={() => setShowAddDim((v) => !v)} className="btn-primary">
          + بُعد جديد
        </button>
      </div>

      {showAddDim && (
        <div className="card flex flex-wrap items-end gap-2 p-4">
          <div>
            <label className="label">اسم البعد</label>
            <input
              className="input"
              placeholder="مثال: الاستدامة"
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

      {/* أكورديون الأبعاد */}
      <div className="space-y-3">
        {dimensions.map((d) => {
          const list = kpis.filter((k) => k.dimension_id === d.id);
          const isOpen = open[d.id];
          return (
            <div key={d.id} className="card overflow-hidden">
              <div
                className="flex cursor-pointer items-center gap-3 px-5 py-4"
                style={{ backgroundColor: `${d.color}14` }}
                onClick={() => toggleOpen(d.id)}
              >
                <span
                  className={`text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <h3 className="font-bold text-mushar-dark">{d.name}</h3>
                <span className="text-sm text-slate-400">({list.length})</span>
                <div className="mr-auto flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createKpi(d.id);
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-mushar-primary shadow-sm hover:bg-mushar-pale/40"
                  >
                    + مؤشر
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDim(d);
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
                  >
                    حذف البعد
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {list.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-slate-400">
                      لا مؤشرات بعد — اضغط «+ مؤشر».
                    </p>
                  ) : (
                    list.map((k) => (
                      <div
                        key={k.id}
                        className={`flex flex-wrap items-center gap-3 px-5 py-3 ${
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
                            {POLARITIES.find((p) => p.value === k.polarity)?.label}
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
                        {/* مفتاح التفعيل */}
                        <button
                          onClick={() => toggleActive(k)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            k.is_active ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          title={k.is_active ? "مفعّل" : "موقوف"}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                              k.is_active ? "-translate-x-0.5" : "-translate-x-5"
                            }`}
                          />
                        </button>
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
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
        {dimensions.length === 0 && (
          <div className="card p-10 text-center text-sm text-slate-400">
            لا توجد أبعاد بعد — أضِف أول بُعد.
          </div>
        )}
      </div>

      {editing && (
        <EditKpiModal
          kpi={editing}
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
  orgUnits,
  onClose,
  onSaved,
}: {
  kpi: Kpi;
  orgUnits: OrgUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<KpiInput>({
    name: kpi.name,
    description: kpi.description,
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
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

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
      <input
        type="number"
        step="any"
        className="input"
        placeholder="اختياري"
        value={f[key] ?? ""}
        onChange={(e) => set({ [key]: numOrNull(e.target.value) } as Partial<KpiInput>)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-mushar-dark">تحرير المؤشر</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

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
              <select
                className="input"
                value={f.owner_unit_id ?? ""}
                onChange={(e) => set({ owner_unit_id: e.target.value || null })}
              >
                <option value="">— بدون —</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_type}: {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">دورية القياس</label>
              <select
                className="input"
                value={f.frequency ?? ""}
                onChange={(e) => set({ frequency: e.target.value || null })}
              >
                <option value="">— اختر —</option>
                {FREQUENCIES.map((fr) => (
                  <option key={fr} value={fr}>
                    {fr}
                  </option>
                ))}
              </select>
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
              <select
                className="input"
                value={f.unit}
                onChange={(e) => set({ unit: e.target.value as Unit })}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">القطبية</label>
              <select
                className="input"
                value={f.polarity}
                onChange={(e) => set({ polarity: e.target.value as Polarity })}
              >
                {POLARITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">آلية الاحتساب</label>
              <select
                className="input"
                value={f.aggregation}
                onChange={(e) =>
                  set({ aggregation: e.target.value as Aggregation })
                }
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="label">مستهدفات الأرباع (اترك أي ربع فارغًا إن لم يكن له مستهدف)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {qInput("الربع الأول", "target_q1")}
              {qInput("الربع الثاني", "target_q2")}
              {qInput("الربع الثالث", "target_q3")}
              {qInput("الربع الرابع", "target_q4")}
            </div>
          </div>

          <div className="rounded-xl bg-mushar-pale/30 px-4 py-3">
            <span className="text-sm text-slate-600">المستهدف الكلي (تلقائي): </span>
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
    </div>
  );
}
