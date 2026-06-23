import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Dimension,
  Objective,
  Kpi,
  KpiEntry,
  Profile,
  OrgProfile,
  OrgUnit,
  OrgUnitTypeDef,
  Notification,
} from "@/lib/types";

type DB = Awaited<ReturnType<typeof createClient>>;

/** وسم التخزين المؤقت للبيانات العامّة — يُبطَل عند أي تعديل إداري */
export const APP_DATA_TAG = "app-data";

const adminDb = getAdminClient();

/**
 * يغلّف جالب بيانات عامّة بتخزين مؤقت عبر الطلبات (unstable_cache) عند
 * توفّر عميل مفتاح الخدمة؛ وإلا يتراجع لعميل الجلسة العادي بلا تخزين.
 * تُبطَل النتائج بوسم APP_DATA_TAG أو تلقائيًا كل 5 دقائق كأمان.
 */
function cachedGlobal<T>(
  key: string,
  fetcher: (db: DB) => Promise<T>
): () => Promise<T> {
  if (!adminDb) return () => createClient().then(fetcher);
  return unstable_cache(() => fetcher(adminDb as unknown as DB), ["appdata", key], {
    tags: [APP_DATA_TAG],
    revalidate: 300,
  });
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as Notification[]) ?? [];
}

export const getOrgProfile = cache(async (): Promise<OrgProfile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_profile")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as OrgProfile) ?? null;
});

export const getOrgUnitTypes = cachedGlobal("org_unit_types", async (db) => {
  const { data } = await db
    .from("org_unit_types")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return (data as OrgUnitTypeDef[]) ?? [];
});

export const getOrgUnits = cachedGlobal("org_units", async (db) => {
  const { data } = await db
    .from("org_units")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return (data as OrgUnit[]) ?? [];
});

export async function getRolePermissions(): Promise<
  { role: string; permission: string; allowed: boolean }[]
> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("*");
  return (data as { role: string; permission: string; allowed: boolean }[]) ?? [];
}

export async function getUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, org_unit:org_units(*)")
    .order("created_at");
  return (data as Profile[]) ?? [];
}

/**
 * المستخدم المُصادَق — مُخزّن مؤقتًا لكل طلب عبر cache() حتى لا يتكرّر
 * الاتصال بخادم المصادقة في التخطيط والصفحة والمكوّنات في نفس الطلب.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** الملف الشخصي — مُخزّن مؤقتًا لكل طلب (يُستدعى في عدّة أماكن) */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
});

/** مناظير الخطة فقط (تُستثنى المناظير المستقلة مثل أهداف الوقفين) */
export const getDimensions = cachedGlobal("dimensions_in_plan", async (db) => {
  const { data } = await db
    .from("dimensions")
    .select("*")
    .eq("in_plan", true)
    .order("sort_order");
  return (data as Dimension[]) ?? [];
});

/** كل المناظير بما فيها المستقلة (للإدارة) */
export const getAllDimensions = cachedGlobal("dimensions_all", async (db) => {
  const { data } = await db
    .from("dimensions")
    .select("*")
    .order("sort_order");
  return (data as Dimension[]) ?? [];
});

/** أهداف الخطة فقط مع منظورها */
export const getObjectives = cachedGlobal("objectives_in_plan", async (db) => {
  const { data } = await db
    .from("objectives")
    .select("*, dimension:dimensions(*)")
    .order("sort_order");
  return ((data as Objective[]) ?? []).filter(
    (o) => o.dimension?.in_plan !== false
  );
});

/** كل الأهداف بما فيها المستقلة (للإدارة) */
export const getAllObjectives = cachedGlobal("objectives_all", async (db) => {
  const { data } = await db
    .from("objectives")
    .select("*, dimension:dimensions(*)")
    .order("sort_order");
  return (data as Objective[]) ?? [];
});

// ===== أهداف الوقفين (منظور مستقل خارج الخطة) =====
export async function getEndowmentDimension(): Promise<Dimension | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dimensions")
    .select("*")
    .eq("slug", "awqaf")
    .maybeSingle();
  return (data as Dimension) ?? null;
}

export async function getEndowmentObjectives(): Promise<Objective[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("objectives")
    .select("*, dimension:dimensions(*)")
    .order("sort_order");
  return ((data as Objective[]) ?? []).filter(
    (o) => o.dimension?.in_plan === false
  );
}

export async function getEndowmentKpis(): Promise<Kpi[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpis")
    .select("*, dimension:dimensions(*), objective:objectives(*), owner_unit:org_units(*)")
    .eq("is_active", true)
    .order("sort_order");
  return ((data as Kpi[]) ?? []).filter((k) => k.dimension?.in_plan === false);
}

/** مؤشرات الخطة النشطة فقط (تُستثنى المؤشرات المستقلة مثل أهداف الوقفين) */
export const getKpis = cachedGlobal("kpis_active", async (db) => {
  const { data } = await db
    .from("kpis")
    .select("*, dimension:dimensions(*), objective:objectives(*), owner_unit:org_units(*)")
    .eq("is_active", true)
    .order("sort_order");
  return ((data as Kpi[]) ?? []).filter((k) => k.dimension?.in_plan !== false);
});

export const getAllKpis = cachedGlobal("kpis_all", async (db) => {
  const { data } = await db
    .from("kpis")
    .select("*, dimension:dimensions(*), objective:objectives(*), owner_unit:org_units(*)")
    .order("sort_order");
  return (data as Kpi[]) ?? [];
});

export async function getKpiById(id: string): Promise<Kpi | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpis")
    .select("*, dimension:dimensions(*), objective:objectives(*), owner_unit:org_units(*)")
    .eq("id", id)
    .single();
  return (data as Kpi) ?? null;
}

export const getLatestEntries = cachedGlobal("latest_entries", async (db) => {
  const { data } = await db
    .from("kpi_entries")
    .select("*")
    .eq("status", "approved")
    .order("period_date", { ascending: false });

  const latest: Record<string, KpiEntry> = {};
  for (const e of (data as KpiEntry[]) ?? []) {
    if (!latest[e.kpi_id]) latest[e.kpi_id] = e;
  }
  return latest;
});

/** كل القياسات المعتمدة (لتتبّع الأداء عبر الزمن) */
export const getApprovedEntries = cachedGlobal("approved_entries", async (db) => {
  const { data } = await db
    .from("kpi_entries")
    .select("*, kpi:kpis(*)")
    .eq("status", "approved")
    .order("period_date", { ascending: true });
  return (data as KpiEntry[]) ?? [];
});

/** القياسات بانتظار الاعتماد النهائي (لمسؤول قياس الأداء) */
export async function getPendingEntries(): Promise<KpiEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_entries")
    .select("*, kpi:kpis(*, dimension:dimensions(*))")
    .eq("status", "pending_officer")
    .order("submitted_at", { ascending: true });
  return (data as KpiEntry[]) ?? [];
}

/** القياسات بانتظار اعتماد المدير ضمن وحدته */
export async function getManagerPending(
  profile: Profile | null
): Promise<KpiEntry[]> {
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_entries")
    .select("*, kpi:kpis(*, dimension:dimensions(*))")
    .eq("status", "pending_manager")
    .order("submitted_at", { ascending: true });
  const list = (data as KpiEntry[]) ?? [];
  if (profile.role === "admin") return list;
  return list.filter((e) => e.kpi && canEditKpi(profile, e.kpi));
}

/** قياسات أنشأها المستخدم الحالي (لمتابعة حالتها) */
export async function getMySubmissions(userId: string): Promise<KpiEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_entries")
    .select("*, kpi:kpis(*, dimension:dimensions(*))")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  return (data as KpiEntry[]) ?? [];
}

export async function getEntriesForKpi(kpiId: string): Promise<KpiEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_entries")
    .select("*")
    .eq("kpi_id", kpiId)
    .order("period_date", { ascending: true });
  return (data as KpiEntry[]) ?? [];
}

/** هل يستطيع المستخدم إدخال قيمة لهذا المؤشر؟ يُستخدم للعرض فقط؛ الحماية الفعلية عبر RLS. */
export function canEditKpi(profile: Profile | null, kpi: Kpi): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  if (profile.role !== "owner" && profile.role !== "employee") return false;
  if (kpi.owner_user_id && kpi.owner_user_id === profile.id) return true;
  if (kpi.owner_title && profile.title && kpi.owner_title === profile.title)
    return true;
  if (
    kpi.owner_unit_id &&
    profile.org_unit_id &&
    kpi.owner_unit_id === profile.org_unit_id
  )
    return true;
  return false;
}

export interface AuditEntry {
  id: number;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null } | null;
}

export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, user:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditEntry[]) ?? [];
}

export interface DueItem {
  kpi: Kpi;
  periodLabel: string;
  end: string;
  state: "due" | "overdue";
  daysLeft: number;
}

/** المؤشرات المستحقّة/المتأخّرة للمستخدم الحالي (تذكير قبل/بعد انتهاء فترة القياس) */
export async function getDueKpis(profile: Profile | null): Promise<DueItem[]> {
  if (!profile || profile.role === "viewer") return [];
  const { periodsForFrequency, currentPeriodKey, currentYear } = await import(
    "@/lib/period"
  );
  const supabase = await createClient();

  const kpis = await getKpis();
  const editable = kpis.filter((k) => canEditKpi(profile, k));
  if (editable.length === 0) return [];

  const ids = editable.map((k) => k.id);
  const { data: entries } = await supabase
    .from("kpi_entries")
    .select("kpi_id, period_end")
    .in("kpi_id", ids)
    .in("status", ["pending_manager", "pending_officer", "approved"]);
  const submitted = new Set(
    ((entries as { kpi_id: string; period_end: string | null }[]) ?? []).map(
      (e) => `${e.kpi_id}|${e.period_end}`
    )
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = currentYear();
  const out: DueItem[] = [];

  for (const k of editable) {
    const periods = periodsForFrequency(k.frequency, year);
    const cur =
      periods.find((p) => p.key === currentPeriodKey(k.frequency)) ?? periods[0];
    if (!cur) continue;
    if (submitted.has(`${k.id}|${cur.date}`)) continue; // أُدخلت
    const end = new Date(cur.date);
    end.setHours(0, 0, 0, 0);
    const daysLeft = Math.round(
      (end.getTime() - today.getTime()) / 86400000
    );
    if (daysLeft < 0) {
      out.push({ kpi: k, periodLabel: cur.label, end: cur.date, state: "overdue", daysLeft });
    } else if (daysLeft <= 7) {
      out.push({ kpi: k, periodLabel: cur.label, end: cur.date, state: "due", daysLeft });
    }
  }
  // المتأخر أولًا ثم الأقرب انتهاءً
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export const getBands = cachedGlobal("performance_bands", async (db) => {
  const { data } = await db
    .from("performance_bands")
    .select("*")
    .order("min_pct", { ascending: false });
  const { DEFAULT_BANDS } = await import("@/lib/bands");
  const arr = (data as import("@/lib/bands").Band[]) ?? [];
  return arr.length ? arr : DEFAULT_BANDS;
});

export async function getAppSettings(): Promise<import("@/lib/bands").AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as import("@/lib/bands").AppSettings) ?? { id: 1, due_soon_days: 7 };
}

/** القيمة المعتمدة السابقة (ثاني أحدث) لكل مؤشر — للمقارنة والاتجاه */
export async function getPreviousValues(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_entries")
    .select("kpi_id, value, period_date")
    .eq("status", "approved")
    .order("period_date", { ascending: false });
  const count: Record<string, number> = {};
  const prev: Record<string, number> = {};
  for (const e of (data as { kpi_id: string; value: number }[]) ?? []) {
    count[e.kpi_id] = (count[e.kpi_id] ?? 0) + 1;
    if (count[e.kpi_id] === 2) prev[e.kpi_id] = e.value;
  }
  return prev;
}

export interface KpiDecision {
  id: string;
  kpi_id: string;
  body: string;
  action: string | null;
  assigned_user_id: string | null;
  due_date: string | null;
  status: "open" | "done";
  created_by: string | null;
  created_at: string;
  reminded_on?: string | null;
  assignee?: { full_name: string | null } | null;
  author?: { full_name: string | null } | null;
  kpi?: { id: string; name: string } | null;
  updates?: { count: number }[];
}

export interface KpiDecisionUpdate {
  id: string;
  decision_id: string;
  body: string;
  mention_user_id: string | null;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
  mention?: { full_name: string | null } | null;
}

const DECISION_SELECT =
  "*, assignee:profiles!kpi_decisions_assigned_user_id_fkey(full_name), author:profiles!kpi_decisions_created_by_fkey(full_name), kpi:kpis(id,name), updates:kpi_decision_updates(count)";

export async function getDecisionsForKpi(kpiId: string): Promise<KpiDecision[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decisions")
    .select(DECISION_SELECT)
    .eq("kpi_id", kpiId)
    .order("created_at", { ascending: false });
  return (data as KpiDecision[]) ?? [];
}

export async function getOpenDecisions(): Promise<KpiDecision[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decisions")
    .select(DECISION_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as KpiDecision[]) ?? [];
}

/** كل القرارات (لصفحة المتابعة الموحّدة) */
export async function getAllDecisions(): Promise<KpiDecision[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decisions")
    .select(DECISION_SELECT)
    .order("created_at", { ascending: false });
  return (data as KpiDecision[]) ?? [];
}

const UPDATE_SELECT =
  "*, author:profiles!kpi_decision_updates_created_by_fkey(full_name), mention:profiles!kpi_decision_updates_mention_user_id_fkey(full_name)";

export async function getDecisionUpdates(
  decisionId: string
): Promise<KpiDecisionUpdate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decision_updates")
    .select(UPDATE_SELECT)
    .eq("decision_id", decisionId)
    .order("created_at", { ascending: true });
  return (data as KpiDecisionUpdate[]) ?? [];
}

/** تحديثات كل القرارات المرتبطة بمؤشر، مجمّعة حسب القرار */
export async function getUpdatesByDecision(
  decisionIds: string[]
): Promise<Record<string, KpiDecisionUpdate[]>> {
  const map: Record<string, KpiDecisionUpdate[]> = {};
  if (decisionIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decision_updates")
    .select(UPDATE_SELECT)
    .in("decision_id", decisionIds)
    .order("created_at", { ascending: true });
  for (const u of (data as KpiDecisionUpdate[]) ?? []) {
    (map[u.decision_id] ??= []).push(u);
  }
  return map;
}

export type InitiativeStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "cancelled";

export interface KpiMilestone {
  id: string;
  initiative_id: string;
  title: string;
  done: boolean;
  progress: number;
  weight: number;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface KpiDeliverable {
  id: string;
  initiative_id: string;
  title: string;
  done: boolean;
  doc_url: string | null;
  doc_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface KpiInitiativeUpdateReply {
  id: string;
  update_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
}

export interface KpiInitiativeProgressUpdate {
  id: string;
  initiative_id: string;
  kind: "update" | "challenge";
  body: string;
  progress: number | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  resolved: boolean;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
  replies?: KpiInitiativeUpdateReply[];
}

export interface CriticalChallenge {
  id: string;
  initiative_id: string;
  body: string;
  created_at: string;
  initiative?: { id: string; title: string } | null;
}

/** التحديات الحرجة المفتوحة (لعرضها في لوحة الأداء التنفيذية) */
export async function getCriticalChallenges(): Promise<CriticalChallenge[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_initiative_updates")
    .select("id, initiative_id, body, created_at, initiative:kpi_initiatives(id,title)")
    .eq("kind", "challenge")
    .eq("severity", "critical")
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  return (data as unknown as CriticalChallenge[]) ?? [];
}

export interface KpiInitiative {
  id: string;
  kpi_id: string | null;
  objective_id: string | null;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  owner_unit_id: string | null;
  start_year: number | null;
  status: InitiativeStatus;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  lessons_learned: string | null;
  completed_at: string | null;
  completion_doc_url: string | null;
  completion_doc_name: string | null;
  created_by: string | null;
  created_at: string;
  owner?: { full_name: string | null } | null;
  owner_unit?: { id: string; name: string } | null;
  milestones?: KpiMilestone[];
  deliverables?: KpiDeliverable[];
  updates?: KpiInitiativeProgressUpdate[];
  kpi?: { id: string; name: string } | null;
  objective?: { id: string; name: string; code: string | null } | null;
}

/** كل المبادرات (لصفحة المبادرات الموحّدة) */
export async function getAllInitiatives(): Promise<KpiInitiative[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_initiatives")
    .select(
      "*, owner:profiles!kpi_initiatives_owner_user_id_fkey(full_name), owner_unit:org_units(id,name), kpi:kpis(id,name), objective:objectives(id,name,code), milestones:kpi_initiative_milestones(*), deliverables:kpi_initiative_deliverables(*), updates:kpi_initiative_updates(*, author:profiles!kpi_initiative_updates_created_by_fkey(full_name), replies:kpi_initiative_update_replies(*, author:profiles!kpi_initiative_update_replies_created_by_fkey(full_name)))"
    )
    .order("created_at", { ascending: false });
  const list = (data as KpiInitiative[]) ?? [];
  for (const i of list) {
    if (i.milestones) i.milestones.sort((a, b) => a.sort_order - b.sort_order);
    if (i.deliverables)
      i.deliverables.sort((a, b) => a.sort_order - b.sort_order);
    if (i.updates) {
      i.updates.sort((a, b) => b.created_at.localeCompare(a.created_at));
      for (const u of i.updates)
        if (u.replies)
          u.replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
  }
  return list;
}

export async function getInitiativesForKpi(
  kpiId: string
): Promise<KpiInitiative[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_initiatives")
    .select(
      "*, owner:profiles!kpi_initiatives_owner_user_id_fkey(full_name), milestones:kpi_initiative_milestones(*)"
    )
    .eq("kpi_id", kpiId)
    .order("created_at", { ascending: false });
  const list = (data as KpiInitiative[]) ?? [];
  for (const i of list) {
    if (i.milestones)
      i.milestones.sort((a, b) => a.sort_order - b.sort_order);
  }
  return list;
}

/** قرارات تنفيذية مُسنَدة للمستخدم الحالي وما زالت مفتوحة */
export async function getMyDecisions(userId: string): Promise<KpiDecision[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_decisions")
    .select(DECISION_SELECT)
    .eq("assigned_user_id", userId)
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data as KpiDecision[]) ?? [];
}

/** مبادرات/خطط يملكها المستخدم الحالي وما زالت نشطة */
export async function getMyInitiatives(userId: string): Promise<KpiInitiative[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_initiatives")
    .select("*, kpi:kpis(id,name)")
    .eq("owner_user_id", userId)
    .in("status", ["planned", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data as KpiInitiative[]) ?? [];
}

// ===== طلبات التغيير =====
export type ChangeEntity = "objective" | "initiative" | "kpi" | "target";
export type ChangeAction = "create" | "update" | "delete";
export type ChangeStatus =
  | "pending_manager"
  | "pending_officer"
  | "pending_executive"
  | "approved"
  | "rejected";

export interface ChangeRequest {
  id: string;
  entity_type: ChangeEntity;
  action: ChangeAction;
  entity_id: string | null;
  title: string;
  payload: Record<string, unknown>;
  status: ChangeStatus;
  requested_by: string | null;
  requester_unit_id: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string | null } | null;
  reviewer?: { full_name: string | null } | null;
}

export async function getChangeRequests(): Promise<ChangeRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_requests")
    .select(
      "*, requester:profiles!change_requests_requested_by_fkey(full_name), reviewer:profiles!change_requests_reviewed_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false });
  return (data as ChangeRequest[]) ?? [];
}

// ===== الاجتماعات والتوصيات =====
export interface RecommendationDomain {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface RecUpdateReply {
  id: string;
  update_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
}

export interface RecommendationUpdate {
  id: string;
  recommendation_id: string;
  kind: "update" | "challenge";
  body: string;
  severity: "low" | "medium" | "high" | "critical" | null;
  resolved: boolean;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
  replies?: RecUpdateReply[];
}

export interface MeetingRecommendation {
  id: string;
  meeting_id: string;
  name: string;
  description: string | null;
  domain_id: string | null;
  owner_unit_id: string | null;
  owner_user_id: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "critical";
  closure_status: "open" | "pending" | "closed";
  closure_doc_url: string | null;
  closure_doc_name: string | null;
  resolved_at: string | null;
  created_at: string;
  domain?: { id: string; name: string } | null;
  owner_unit?: { id: string; name: string } | null;
  owner?: { full_name: string | null } | null;
  participants?: { org_unit: { id: string; name: string } | null }[];
  updates?: RecommendationUpdate[];
  meeting?: { id: string; title: string; meeting_date: string | null } | null;
}

export interface Meeting {
  id: string;
  type: string;
  meeting_date: string | null;
  committee: string | null;
  title: string;
  attendees: string | null;
  minutes: string | null;
  cycle: string | null;
  created_at: string;
  recommendations?: MeetingRecommendation[];
}

export async function getRecommendationDomains(): Promise<RecommendationDomain[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendation_domains")
    .select("*")
    .order("sort_order");
  return (data as RecommendationDomain[]) ?? [];
}

export async function getMeetings(): Promise<Meeting[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select(
      "*, recommendations:meeting_recommendations(*, domain:recommendation_domains(id,name), owner_unit:org_units!meeting_recommendations_owner_unit_id_fkey(id,name), owner:profiles!meeting_recommendations_owner_user_id_fkey(full_name), participants:recommendation_participants(org_unit:org_units(id,name)), updates:recommendation_updates(*, author:profiles!recommendation_updates_created_by_fkey(full_name), replies:recommendation_update_replies(*, author:profiles!recommendation_update_replies_created_by_fkey(full_name))))"
    )
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const list = (data as Meeting[]) ?? [];
  for (const m of list) {
    if (m.recommendations) {
      m.recommendations.sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const r of m.recommendations)
        if (r.updates) {
          r.updates.sort((a, b) => b.created_at.localeCompare(a.created_at));
          for (const u of r.updates)
            if (u.replies) u.replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
        }
    }
  }
  return list;
}

/** توصيات مُسنَدة للمستخدم وغير مغلقة (لصفحة مهامّي) */
export async function getMyRecommendations(userId: string): Promise<MeetingRecommendation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_recommendations")
    .select("*, meeting:meetings(id,title,meeting_date), domain:recommendation_domains(id,name)")
    .eq("owner_user_id", userId)
    .neq("closure_status", "closed")
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data as MeetingRecommendation[]) ?? [];
}
