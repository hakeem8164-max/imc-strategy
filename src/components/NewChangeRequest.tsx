"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { submitChange } from "@/app/(app)/change-requests/actions";
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
  initiatives: { id: string; title: string }[];
  orgUnits: OrgUnit[];
  users: Profile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [domain, setDomain] = useState<"" | "objective" | "kpi" | "initiative">("");
  const [action, setAction] = useState<"" | ChangeAction>("");
  const [targetId, setTargetId] = useState("");
  const [aspectKey, setAspectKey] = useState("");
  const [v, setV] = useState<Record<string, string>>({});

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
    setErr(null);
  }

  function renderInput(kind: InputKind, key: string) {
    const common = "input";
    switch (kind) {
      case "textarea":
        return (
          <textarea className={`${common} min-h-[70px]`} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
        );
      case "dimension":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر المنظور —</option>
            {dimensions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        );
      case "objective":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر الهدف —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.dimension?.name ? `${o.dimension.name} ← ` : ""}{o.name}
              </option>
            ))}
          </select>
        );
      case "unit":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر —</option>
            {UNITS.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
          </select>
        );
      case "polarity":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر —</option>
            {POLARITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
          </select>
        );
      case "aggregation":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر —</option>
            {AGGREGATIONS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
          </select>
        );
      case "frequency":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر —</option>
            {FREQUENCIES.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        );
      case "owner_unit":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— بدون —</option>
            {orgUnits.map((u) => (<option key={u.id} value={u.id}>{u.unit_type}: {u.name}</option>))}
          </select>
        );
      case "owner_user":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— بدون —</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>))}
          </select>
        );
      case "year":
        return (
          <select className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
            <option value="">— اختر السنة —</option>
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        );
      case "date":
        return <input type="date" className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />;
      default:
        return <input className={common} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} />;
    }
  }

  // حقول الإنشاء حسب المجال
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

  function submit() {
    setErr(null);
    if (!domain || !action) return;

    let entity_type: ChangeEntity = domain;
    let entity_id: string | null = null;
    let title = "";
    let payload: Record<string, unknown> = {};

    if (action === "create") {
      if (domain === "initiative") return; // عبر صفحة المبادرات
      for (const f of createFields) payload[f.payloadKey] = v[f.payloadKey] ?? "";
      if (domain === "kpi") {
        const obj = objectives.find((o) => o.id === v.objective_id);
        if (obj) payload.dimension_id = obj.dimension_id;
      }
      const nm = (v.name ?? "").trim();
      if (!nm) return setErr("الاسم مطلوب.");
      title = `إنشاء ${DOMAIN_LABEL[domain]}: ${nm}`;
    } else if (action === "delete") {
      if (!targetId) return setErr("اختر العنصر المراد حذفه.");
      entity_id = targetId;
      title = `حذف ${DOMAIN_LABEL[domain]}: ${targetName}`;
    } else {
      // update
      if (!targetId) return setErr("اختر العنصر المراد تعديله.");
      if (!aspect) return setErr("اختر الحقل المراد تعديله.");
      entity_id = targetId;
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
        title = `تعديل المستهدفات لـ: ${targetName}`;
      } else {
        const val = v[aspect.payloadKey] ?? "";
        if (val === "") return setErr("أدخل القيمة الجديدة.");
        payload = { [aspect.payloadKey]: val };
        title = `تعديل (${aspect.label}) لـ${DOMAIN_LABEL[domain]}: ${targetName}`;
      }
    }

    startTransition(async () => {
      const res = await submitChange({ entity_type, action, entity_id, title, payload });
      if (res.ok) {
        reset();
        setOpen(false);
        alert("تم رفع طلب التغيير. يخضع لسلسلة الاعتماد قبل تطبيقه.");
        router.refresh();
      } else setErr(res.error || "خطأ");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-1.5">
        <Plus size={16} /> طلب تغيير جديد
      </button>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <h3 className="font-bold text-mushar-dark">طلب تغيير جديد</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">مجال طلب التغيير *</label>
          <select
            className="input"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value as typeof domain);
              setTargetId("");
              setAspectKey("");
              setV({});
            }}
          >
            <option value="">— اختر المجال —</option>
            <option value="objective">الأهداف</option>
            <option value="kpi">المؤشرات</option>
            <option value="initiative">المبادرات</option>
          </select>
        </div>
        <div>
          <label className="label">نوع طلب التغيير *</label>
          <select
            className="input"
            value={action}
            disabled={!domain}
            onChange={(e) => {
              setAction(e.target.value as typeof action);
              setTargetId("");
              setAspectKey("");
              setV({});
            }}
          >
            <option value="">— اختر النوع —</option>
            <option value="create">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
          </select>
        </div>
      </div>

      {/* إنشاء مبادرة → صفحة المبادرات */}
      {domain === "initiative" && action === "create" && (
        <div className="rounded-lg bg-mushar-pale/30 p-3 text-sm text-slate-600">
          إنشاء مبادرة جديدة يتم من{" "}
          <Link href="/initiatives" className="font-semibold text-mushar-primary underline">
            صفحة المبادرات
          </Link>{" "}
          (لاحتوائها على المعالم والمخرجات)، ويُرفع كطلب تغيير تلقائيًا.
        </div>
      )}

      {/* اختيار العنصر للتعديل/الحذف */}
      {(action === "update" || action === "delete") && domain && (
        <div>
          <label className="label">العنصر *</label>
          <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— اختر —</option>
            {targetList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* الحقل الفرعي للتعديل */}
      {action === "update" && domain && (
        <div>
          <label className="label">الحقل المراد تعديله *</label>
          <select
            className="input"
            value={aspectKey}
            onChange={(e) => {
              setAspectKey(e.target.value);
              setV({});
            }}
          >
            <option value="">— اختر الحقل —</option>
            {aspects.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* مدخل القيمة الجديدة (تعديل) */}
      {action === "update" && aspect && aspect.kind !== "targets" && (
        <div>
          <label className="label">القيمة الجديدة لـ«{aspect.label}» *</label>
          {renderInput(aspect.kind, aspect.payloadKey)}
        </div>
      )}
      {action === "update" && aspect && aspect.kind === "targets" && (
        <div>
          <label className="label">المستهدفات الجديدة</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["baseline", "خط الأساس"],
              ["target_q1", "الربع الأول"],
              ["target_q2", "الربع الثاني"],
              ["target_q3", "الربع الثالث"],
              ["target_q4", "الربع الرابع"],
              ["target_total", "المستهدف الكلي"],
            ].map(([k, lbl]) => (
              <div key={k}>
                <label className="label text-[11px]">{lbl}</label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={v[k] ?? ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* حقول الإنشاء */}
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

      {err && (
        <div className="rounded-lg bg-mushar-accent/10 px-3 py-2.5 text-sm text-mushar-accent">{err}</div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); reset(); }} className="btn-ghost">إلغاء</button>
        <button
          onClick={submit}
          disabled={pending || (domain === "initiative" && action === "create")}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "جارٍ الرفع…" : "رفع الطلب"}
        </button>
      </div>
    </div>
  );
}
