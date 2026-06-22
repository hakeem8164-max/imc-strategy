export type Role = "admin" | "executive" | "owner" | "employee" | "viewer" | "secretary";

export type Unit = "%" | "$" | "#" | "";

export interface Dimension {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  in_plan: boolean;
}

// الهدف الاستراتيجي: يندرج تحت المنظور (Dimension) وتندرج تحته المؤشرات
export interface Objective {
  id: string;
  dimension_id: string;
  code: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  dimension?: Dimension;
}

export interface Profile {
  id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  role: Role;
  org_unit_id: string | null;
  status: string;
  created_at: string;
  org_unit?: OrgUnit | null;
}

export interface OrgProfile {
  id: number;
  name: string;
  logo_url: string | null;
  updated_at: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  unit_type: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

// أنواع الوحدات القابلة للتخصيص من قِبل المدير
export interface OrgUnitTypeDef {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Kpi {
  id: string;
  code: string;
  dimension_id: string;
  objective_id: string | null;
  name: string;
  description: string | null;
  owner_title: string | null;
  owner_user_id: string | null;
  owner_unit_id: string | null;
  frequency: string | null;
  measurement_method: string | null;
  unit: Unit;
  polarity: Polarity;
  aggregation: Aggregation;
  baseline: number | null;
  target_q1: number | null;
  target_q2: number | null;
  target_q3: number | null;
  target_q4: number | null;
  target_total: number | null;
  is_active: boolean;
  sort_order: number;
  dimension?: Dimension;
  objective?: Objective | null;
  owner_unit?: OrgUnit | null;
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export type Polarity = "positive" | "negative";
export type Aggregation = "cumulative" | "sum" | "last" | "average";

export const POLARITIES: { value: Polarity; label: string }[] = [
  { value: "positive", label: "موجبة (الأعلى أفضل)" },
  { value: "negative", label: "سالبة (الأقل أفضل)" },
];

export const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: "cumulative", label: "تراكمي" },
  { value: "sum", label: "مجموع" },
  { value: "last", label: "آخر قيمة" },
  { value: "average", label: "متوسط" },
];

/** حساب المستهدف الكلي تلقائيًا حسب آلية الاحتساب ومستهدفات الأرباع */
export function computeTotalTarget(
  aggregation: Aggregation,
  quarters: (number | null)[]
): number | null {
  const vals = quarters.filter(
    (v): v is number => v !== null && v !== undefined && !Number.isNaN(v)
  );
  if (vals.length === 0) return null;
  switch (aggregation) {
    case "sum":
    case "cumulative":
      return vals.reduce((a, b) => a + b, 0);
    case "average":
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    case "last":
      return vals[vals.length - 1];
    default:
      return null;
  }
}

export type EntryStatus =
  | "pending_manager"
  | "pending_officer"
  | "approved"
  | "rejected"
  | "submitted";

export interface KpiEntry {
  id: string;
  kpi_id: string;
  period_label: string;
  period_date: string;
  period_start: string | null;
  period_end: string | null;
  value: number;
  note: string | null;
  status: EntryStatus;
  document_url: string | null;
  document_name: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  kpi?: Kpi;
}

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  pending_manager: "بانتظار اعتماد المدير",
  pending_officer: "بانتظار اعتماد مسؤول الأداء",
  approved: "معتمد",
  rejected: "مُعاد/مرفوض",
  submitted: "بانتظار الاعتماد",
};

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const FREQUENCIES = [
  "كل أسبوعين",
  "شهري",
  "ربعي",
  "نصف سنوي",
  "سنوي",
] as const;

export const UNITS: { value: Unit; label: string }[] = [
  { value: "%", label: "نسبة مئوية (%)" },
  { value: "$", label: "مبلغ ($)" },
  { value: "#", label: "عدد (#)" },
  { value: "", label: "بدون وحدة" },
];

export const OWNER_TITLES = [
  "نائب الرئيس لتطوير الأعمال",
  "رئيس قطاع المالية",
  "نائب الرئيس للعمليات",
  "رئيس قطاع الاستراتيجية",
  "رئيس قطاع الخدمات المشتركة",
  "د. هشام",
] as const;

export interface RolePermission {
  role: Role;
  permission: string;
  allowed: boolean;
}

// كتالوج الصلاحيات القابلة للضبط
export const PERMISSIONS: { key: string; label: string }[] = [
  { key: "view_dashboard", label: "عرض لوحة المعلومات" },
  { key: "view_kpis", label: "عرض المؤشرات" },
  { key: "enter_values", label: "إدخال القياسات" },
  { key: "manage_kpis", label: "إدارة المؤشرات (إضافة/تعديل)" },
  { key: "manage_users", label: "إدارة المستخدمين" },
  { key: "manage_org", label: "إدارة الهيكل التنظيمي" },
  { key: "manage_permissions", label: "إدارة الصلاحيات" },
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مسؤول قياس الأداء",
  executive: "الرئيس التنفيذي",
  owner: "مدير قطاع/إدارة/محفظة",
  employee: "موظف إدخال البيانات",
  viewer: "مشاهد",
  secretary: "أمين اللجان",
};

/** وصف موجز لكل دور */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "إدارة كاملة للمنصة والاعتماد النهائي للنتائج.",
  executive: "اطّلاع كامل على لوحة القيادة والمؤشرات دون تعديل.",
  owner: "يُدخل النتائج، ويعتمد ما يرسله موظفو إدارته قبل رفعها للمسؤول.",
  employee: "يُدخل نتائج مؤشرات إدارته وترسل لمدير الإدارة.",
  viewer: "اطّلاع محدود.",
  secretary: "يوثّق محاضر الاجتماعات ويسجّل التوصيات ويتابعها.",
};
