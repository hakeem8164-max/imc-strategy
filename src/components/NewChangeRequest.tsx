"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { submitChange } from "@/app/(app)/change-requests/actions";
import { createClient } from "@/lib/supabase/client";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import NumberInput from "@/components/ui/NumberInput";
import { notify } from "@/components/ui/toast";
import {
  UNITS,
  POLARITIES,
  AGGREGATIONS,
  FREQUENCIES,
  type Dimension,
  type Objective,
  type Kpi,
  type OrgUnit,
  type Profile,
} from "@/lib/types";
import type { ChangeEntity, ChangeAction } from "@/lib/data";

const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

type InputKind =
  | "text"
  | "textarea"
  | "dimension"
  | "objective"
  | "unit"
  | "polarity"
  | "aggregation"
  | "frequency"
  | "owner_unit"
  | "owner_user"
  | "year"
  | "date"
  | "targets";

type Aspect = { key: string; label: string; kind: InputKind; payloadKey: string };

type InitLite = {
  id: string;
  title: string;
  description: string | null;
  owner_unit_id: string | null;
  owner_user_id: string | null;
  start_year: number | null;
  start_date: string | null;
  due_date: string | null;
};

const ASPECTS: Record<"objective" | "kpi" | "initiative", Aspect[]> = {
  objective: [
    { key: "name", label: "اسم الهدف", kind: "text", payloadKey: "name" },
    { key: "description", label: "وصف الهدف", kind: "textarea", payloadKey: "description" },
    { key: "dimension", label: "المنظور", kind: "dimension", payloadKey: "dimension_id" },
  ],
  kpi: [
    { key: "name", label: "اسم المؤشر", kind: "text", payloadKey: "name" },
    { key: "description", label: "وصف المؤشر", kind: "textarea", payloadKey: "description" },
    { key: "method", label: "معادلة/طريقة القياس", kind: "textarea", payloadKey: "measurement_method" },
    { key: "unit", label: "الوحدة", kind: "unit", payloadKey: "unit" },
    { key: "polarity", label: "القطبية", kind: "polarity", payloadKey: "polarity" },
    { key: "aggregation", label: "آلية الاحتساب", kind: "aggregation", payloadKey: "aggregation" },
    { key: "frequency", label: "دورية القياس", kind: "frequency", payloadKey: "frequency" },
    { key: "owner", label: "المالك (الإدارة)", kind: "owner_unit", payloadKey: "owner_unit_id" },
    { key: "objective", label: "الهدف المرتبط", kind: "objective", payloadKey: "objective_id" },
    { key: "targets", label: "المستهدفات", kind: "targets", payloadKey: "" },
  ],
  initiative: [
    { key: "title", label: "اسم المبادرة", kind: "text", payloadKey: "title" },
    { key: "description", label: "الوصف", kind: "textarea", payloadKey: "description" },
    { key: "owner_unit", label: "الإدارة المالكة", kind: "owner_unit", payloadKey: "owner_unit_id" },
    { key: "owner_user", label: "مدير المبادرة", kind: "owner_user", payloadKey: "owner_user_id" },
    { key: "start_year", label: "سنة البداية", kind: "year", payloadKey: "start_year" },
    { key: "start_date", label: "تاريخ البداية", kind: "date", payloadKey: "start_date" },
    { key: "due_date", label: "تاريخ الاستحقاق", kind: "date", payloadKey: "due_date" },
  ],
};

const DOMAIN_LABEL: Record<string, string> = {
  objective: "هدف",
  kpi: "مؤشر",
  initiative: "مبادرة",
};

export default function NewChangeRequest({
  dimensions,
  objectives,
  kpis,
  initiatives,
  orgUnits,
  users,
}: {
  dimensions: Dimension[];
  objectives: Objective[];
  kpis: Kpi[];
  initiatives: InitLite[];
  orgUnits: OrgUnit[];
  users: Profile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [domain, setDomain] = useState<"" | "objective" | "kpi" | "initiative">("");
  const [action, setAction] = useState<"" | ChangeAction>("");
  const [targetId, setTargetId] = useState("");
  const [aspectKey, setAspectKey] = useState("");
  const [v, setV] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));

  const targetList = useMemo(() => {
    if (domain === "objective")
      return objectives.map((o) => ({ id: o.id, name: `${o.code ?? ""} ${o.name}`.trim() }));
    if (domain === "kpi") return kpis.map((k) => ({ id: k.id, name: k.name }));
    if (domain === "initiative") return initiatives.map((i) => ({ id: i.id, name: i.title }));
    return [];
  }, [domain, objectives, kpis, initiatives]);

  const targetName = targetList.find((t) => t.id === targetId)?.name ?? "";
  const aspects = domain === "" ? [] : ASPECTS[domain];
  const aspect = aspects.find((a) => a.key === aspectKey) ?? null;

  function reset() {
    setDomain("");
    setAction("");
    setTargetId("");
    setAspectKey("");
    setV({});
    setReason("");
    setImpact("");
    setFile(null);
    setErr(null);
  }

  function labelOfValue(kind: InputKind, val: string): string {
    if (!val) return "—";
    switch (kind) {
      case "dimension":
        return dimensions.find((d) => d.id === val)?.name ?? val;
      case "objective":
        return objectives.find((o) => o.id === val)?.name ?? val;
      case "unit":
        return UNITS.find((u) => u.value === val)?.label ?? val;
      case "polarity":
        return POLARITIES.find((p) => p.value === val)?.label ?? val;
      case "aggregation":
        return AGGREGATIONS.find((a) => a.value === val)?.label ?? val;
      case "owner_unit":
        return orgUnits.find((u) => u.id === val)?.name ?? val;
      case "owner_user":
        return users.find((u) => u.id === val)?.full_name ?? val;
      default:
        return val;
    }
  }

  // القيمة الحالية للحقل المختار
  const currentValue = useMemo(() => {
    if (action !== "update" || !targetId || !aspect) return "";
    if (aspect.kind === "targets") {
      const k = kpis.find((x) => x.id === targetId);
      if (!k) return "";
      return `خط الأساس ${k.baseline ?? "—"} · ر1 ${k.target_q1 ?? "—"} · ر2 ${k.target_q2 ?? "—"} · ر3 ${k.target_q3 ?? "—"} · ر4 ${k.target_q4 ?? "—"} · الكلي ${k.target_total ?? "—"}`;
    }
    const pk = aspect.payloadKey;
    if (domain === "objective") {
      const o = objectives.find((x) => x.id === targetId);
      if (!o) return "";
      if (pk === "name") return o.name;
      if (pk === "description") return o.description ?? "—";
      if (pk === "dimension_id") return o.dimension?.name ?? "—";
    } else if (domain === "kpi") {
      const k = kpis.find((x) => x.id === targetId);
      if (!k) return "";
      const raw =
        pk === "name" ? k.name
        : pk === "description" ? (k.description ?? "")
        : pk === "measurement_method" ? (k.measurement_method ?? "")
        : pk === "unit" ? k.unit
        : pk === "polarity" ? k.polarity
        : pk === "aggregation" ? k.aggregation
        : pk === "frequency" ? (k.frequency ?? "")
        : pk === "owner_unit_id" ? (k.owner_unit_id ?? "")
        : pk === "objective_id" ? (k.objective_id ?? "")
        : "";
      return labelOfValue(aspect.kind, raw);
    } else if (domain === "initiative") {
      const i = initiatives.find((x) => x.id === targetId);
      if (!i) return "";
      const raw =
        pk === "title" ? i.title
        : pk === "description" ? (i.description ?? "")
        : pk === "owner_unit_id" ? (i.owner_unit_id ?? "")
        : pk === "owner_user_id" ? (i.owner_user_id ?? "")
        : pk === "start_year" ? (i.start_year ? String(i.start_year) : "")
        : pk === "start_date" ? (i.start_date ?? "")
        : pk === "due_date" ? (i.due_date ?? "")
        : "";
      return labelOfValue(aspect.kind, raw);
    }
    return "";
  }, [action, targetId, aspect, domain, objectives, kpis, initiatives, dimensions, orgUnits, users]);

  const createFields: Aspect[] =
    domain === "objective"
      ? [
          { key: "dimension_id", label: "المنظور *", kind: "dimension", payloadKey: "dimension_id" },
          { key: "name", label: "اسم الهدف *", kind: "text", payloadKey: "name" },
          { key: "description", label: "الوصف", kind: "textarea", payloadKey: "description" },
        ]
      : domain === "kpi"
      ? [
          { key: "objective_id", label: "الهدف المرتبط *", kind: "objective", payloadKey: "objective_id" },
          { key: "name", label: "اسم المؤشر *", kind: "text", payloadKey: "name" },
          { key: "description", label: "الوصف", kind: "textarea", payloadKey: "description" },
          { key: "measurement_method", label: "معادلة/طريقة القياس", kind: "textarea", payloadKey: "measurement_method" },
          { key: "unit", label: "الوحدة", kind: "unit", payloadKey: "unit" },
          { key: "polarity", label: "القطبية", kind: "polarity", payloadKey: "polarity" },
          { key: "aggregation", label: "آلية الاحتساب", kind: "aggregation", payloadKey: "aggregation" },
          { key: "frequency", label: "الدورية", kind: "frequency", payloadKey: "frequency" },
          { key: "owner_unit_id", label: "المالك (الإدارة)", kind: "owner_unit", payloadKey: "owner_unit_id" },
        ]
      : [];

  function renderInput(kind: InputKind, key: string) {
    switch (kind) {
      case "textarea":
        return <textarea className="input min-h-[70px]" value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />;
      case "dimension":
        return (
          <SearchableSelect className="w-full" placeholder="— اختر المنظور —" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={dimensions.map((d) => ({ value: d.id, label: d.name }))}
          />
        );
      case "objective":
        return (
          <SearchableSelect className="w-full" placeholder="— اختر الهدف —" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={objectives.map((o) => ({
              value: o.id,
              label: `${o.dimension?.name ? `${o.dimension.name} ← ` : ""}${o.name}`,
            }))}
          />
        );
      case "unit":
        return (
          <FilterSelect className="w-full" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={[
              { value: "", label: "— اختر —" },
              ...UNITS.map((u) => ({ value: u.value, label: u.label })),
            ]}
          />
        );
      case "polarity":
        return (
          <FilterSelect className="w-full" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={[
              { value: "", label: "— اختر —" },
              ...POLARITIES.map((p) => ({ value: p.value, label: p.label })),
            ]}
          />
        );
      case "aggregation":
        return (
          <FilterSelect className="w-full" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={[
              { value: "", label: "— اختر —" },
              ...AGGREGATIONS.map((a) => ({ value: a.value, label: a.label })),
            ]}
          />
        );
      case "frequency":
        return (
          <FilterSelect className="w-full" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={[
              { value: "", label: "— اختر —" },
              ...FREQUENCIES.map((f) => ({ value: f, label: f })),
            ]}
          />
        );
      case "owner_unit":
        return (
          <SearchableSelect className="w-full" placeholder="— بدون —" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={orgUnits.map((u) => ({ value: u.id, label: `${u.unit_type}: ${u.name}` }))}
          />
        );
      case "owner_user":
        return (
          <SearchableSelect className="w-full" placeholder="— بدون —" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={users.map((u) => ({ value: u.id, label: u.full_name ?? u.email ?? "" }))}
          />
        );
      case "year":
        return (
          <FilterSelect className="w-full" value={v[key] ?? ""} onValueChange={(val) => set(key, val)}
            options={[
              { value: "", label: "— اختر السنة —" },
              ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
        );
      case "date":
        return <input type="date" className="input" value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />;
      default:
        return <input className="input" value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />;
    }
  }

  async function submit() {
    setErr(null);
    if (!domain || !action) return setErr("اختر المجال ونوع التغيير.");
    if (!reason.trim()) return setErr("اذكر سبب طلب التغيير.");

    let entity_type: ChangeEntity = domain;
    let entity_id: string | null = null;
    let title = "";
    let payload: Record<string, unknown> = {};
    let fieldLabel = "";
    let newValueDisplay = "";

    if (action === "create") {
      if (domain === "initiative") return;
      for (const f of createFields) payload[f.payloadKey] = v[f.payloadKey] ?? "";
      if (domain === "kpi") {
        const obj = objectives.find((o) => o.id === v.objective_id);
        if (obj) payload.dimension_id = obj.dimension_id;
      }
      const nm = (v.name ?? "").trim();
      if (!nm) return setErr("الاسم مطلوب.");
      title = `إنشاء ${DOMAIN_LABEL[domain]}: ${nm}`;
      newValueDisplay = nm;
    } else if (action === "delete") {
      if (!targetId) return setErr("اختر العنصر المراد حذفه.");
      entity_id = targetId;
      title = `حذف ${DOMAIN_LABEL[domain]}: ${targetName}`;
    } else {
      if (!targetId) return setErr("اختر العنصر المراد تعديله.");
      if (!aspect) return setErr("اختر الحقل المراد تعديله.");
      entity_id = targetId;
      fieldLabel = aspect.label;
      if (aspect.kind === "targets") {
        entity_type = "target";
        payload = {
          baseline: v.baseline ?? "",
          target_q1: v.target_q1 ?? "",
          target_q2: v.target_q2 ?? "",
          target_q3: v.target_q3 ?? "",
          target_q4: v.target_q4 ?? "",
          target_total: v.target_total ?? "",
        };
        newValueDisplay = `ر1 ${v.target_q1 || "—"} · ر2 ${v.target_q2 || "—"} · ر3 ${v.target_q3 || "—"} · ر4 ${v.target_q4 || "—"} · الكلي ${v.target_total || "—"}`;
        title = `تعديل المستهدفات لـ: ${targetName}`;
      } else {
        const val = v[aspect.payloadKey] ?? "";
        if (val === "") return setErr("أدخل القيمة الجديدة.");
        payload = { [aspect.payloadKey]: val };
        newValueDisplay = labelOfValue(aspect.kind, val);
        title = `تعديل (${aspect.label}) لـ${DOMAIN_LABEL[domain]}: ${targetName}`;
      }
    }

    setBusy(true);

    // مرفق اختياري
    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    if (file) {
      const path = `change-requests/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("kpi-docs").upload(path, file);
      if (upErr) {
        setBusy(false);
        return setErr("تعذّر رفع المرفق: " + upErr.message);
      }
      attachment_url = path;
      attachment_name = file.name;
    }

    payload.__meta = {
      reason: reason.trim(),
      impact: impact.trim() || null,
      attachment_url,
      attachment_name,
      field_label: fieldLabel || null,
      current_value: currentValue || (action === "delete" ? targetName : null),
      new_value: newValueDisplay || null,
    };

    const res = await submitChange({ entity_type, action, entity_id, title, payload });
    setBusy(false);
    if (res.ok) {
      reset();
      setOpen(false);
      notify("تم رفع طلب التغيير. يخضع لسلسلة الاعتماد قبل تطبيقه.", "success");
      router.refresh();
    } else setErr(res.error || "خطأ");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-1.5">
        <Plus size={16} /> طلب تغيير جديد
      </button>
    );
  }

  const showCurrentNew =
    action === "update" && aspect && aspect.kind !== "targets";

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-brand-dark">طلب تغيير جديد</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">مجال طلب التغيير *</label>
          <FilterSelect
            className="w-full"
            value={domain ?? ""}
            onValueChange={(v) => { setDomain(v as typeof domain); setTargetId(""); setAspectKey(""); setV({}); }}
            options={[
              { value: "", label: "— اختر المجال —" },
              { value: "objective", label: "الأهداف" },
              { value: "kpi", label: "المؤشرات" },
              { value: "initiative", label: "المبادرات" },
            ]}
          />
        </div>
        <div>
          <label className="label">نوع طلب التغيير *</label>
          <FilterSelect
            className="w-full"
            value={action ?? ""}
            disabled={!domain}
            onValueChange={(v) => { setAction(v as typeof action); setTargetId(""); setAspectKey(""); setV({}); }}
            options={[
              { value: "", label: "— اختر النوع —" },
              { value: "create", label: "إضافة" },
              { value: "update", label: "تعديل" },
              { value: "delete", label: "حذف" },
            ]}
          />
        </div>
      </div>

      {domain === "initiative" && action === "create" && (
        <div className="rounded-lg bg-brand-pale/30 p-3 text-sm text-slate-600">
          إنشاء مبادرة جديدة يتم من{" "}
          <Link href="/initiatives" className="font-semibold text-brand-primary underline">صفحة المبادرات</Link>{" "}
          (لاحتوائها على المعالم والمخرجات)، ويُرفع كطلب تغيير تلقائيًا.
        </div>
      )}

      {(action === "update" || action === "delete") && domain && (
        <div>
          <label className="label">العنصر *</label>
          <SearchableSelect className="w-full" placeholder="ابحث واختر العنصر…" value={targetId ?? ""} onValueChange={(v) => setTargetId(v)}
            options={targetList.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>
      )}

      {action === "update" && domain && (
        <div>
          <label className="label">الحقل المراد تعديله *</label>
          <FilterSelect className="w-full" value={aspectKey ?? ""} onValueChange={(v) => { setAspectKey(v); setV({}); }}
            options={[
              { value: "", label: "— اختر الحقل —" },
              ...aspects.map((a) => ({ value: a.key, label: a.label })),
            ]}
          />
        </div>
      )}

      {/* القيمة الحالية ↔ الجديدة */}
      {showCurrentNew && aspect && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">القيمة الحالية</label>
            <div className="input min-h-[42px] whitespace-pre-wrap bg-slate-50 text-slate-600">
              {currentValue || "—"}
            </div>
          </div>
          <div>
            <label className="label">القيمة الجديدة *</label>
            {renderInput(aspect.kind, aspect.payloadKey)}
          </div>
        </div>
      )}

      {action === "update" && aspect && aspect.kind === "targets" && (
        <div className="space-y-2">
          <div>
            <label className="label">المستهدفات الحالية</label>
            <div className="input min-h-[42px] bg-slate-50 text-xs text-slate-600">{currentValue || "—"}</div>
          </div>
          <label className="label">المستهدفات الجديدة</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[["baseline","خط الأساس"],["target_q1","الربع الأول"],["target_q2","الربع الثاني"],["target_q3","الربع الثالث"],["target_q4","الربع الرابع"],["target_total","المستهدف الكلي"]].map(([k,lbl]) => (
              <div key={k}>
                <label className="label text-[11px]">{lbl}</label>
                <NumberInput
                  value={v[k] === "" || v[k] == null ? null : Number(v[k])}
                  onValueChange={(n) => set(k, n == null ? "" : String(n))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {action === "create" && createFields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {createFields.map((f) => (
            <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label">{f.label}</label>
              {renderInput(f.kind, f.payloadKey)}
            </div>
          ))}
        </div>
      )}

      {/* مبرّرات الطلب */}
      {domain && action && !(domain === "initiative" && action === "create") && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <label className="label">سبب طلب التغيير (لماذا؟) *</label>
            <textarea className="input min-h-[70px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اشرح مبرّر التغيير" />
          </div>
          <div>
            <label className="label">الأثر المتوقع</label>
            <textarea className="input min-h-[60px]" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="ما أثر هذا التغيير على الخطة/الأداء؟" />
          </div>
          <div>
            <label className="label">مرفق (اختياري)</label>
            <input
              type="file"
              className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-pale/50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-primary"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      {err && <div className="rounded-lg bg-brand-accent/10 px-3 py-2.5 text-sm text-brand-accent">{err}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); reset(); }} className="btn-ghost">إلغاء</button>
        <button
          onClick={submit}
          disabled={busy || (domain === "initiative" && action === "create")}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "جارٍ الرفع…" : "رفع الطلب"}
        </button>
      </div>
    </div>
  );
}
