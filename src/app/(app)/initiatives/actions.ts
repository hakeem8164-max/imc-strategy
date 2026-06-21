"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InitiativeStatus } from "@/lib/data";

type Result = { ok: boolean; error?: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ===== المبادرة =====
export async function createInitiative(input: {
  objective_id: string;
  title: string;
  description: string | null;
  owner_unit_id: string | null;
  owner_user_id: string | null;
  start_year: number | null;
  start_date: string | null;
  due_date: string | null;
  milestones: {
    title: string;
    weight: number;
    start_date: string | null;
    due_date: string | null;
  }[];
  deliverables: { title: string }[];
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.objective_id) return { ok: false, error: "اختر الهدف المرتبط" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان المبادرة" };

  const ms = input.milestones.filter((m) => m.title.trim());
  if (ms.length < 5)
    return { ok: false, error: "يلزم 5 معالم على الأقل." };
  if (ms.some((m) => !(Math.round(m.weight || 0) > 0)))
    return { ok: false, error: "كل معلَم يجب أن يكون له وزن أكبر من صفر." };
  const sum = ms.reduce((a, m) => a + Math.round(m.weight || 0), 0);
  if (sum !== 100)
    return {
      ok: false,
      error: `مجموع أوزان المعالم يجب أن يساوي 100% (الحالي ${sum}%).`,
    };

  // يُرفع كطلب تغيير ويخضع لسلسلة الاعتماد (يُطبَّق فورًا إن كان الرافع الرئيس التنفيذي)
  const payload = {
    objective_id: input.objective_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    owner_unit_id: input.owner_unit_id || null,
    owner_user_id: input.owner_user_id || null,
    start_year: input.start_year || null,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    milestones: ms.map((m) => ({
      title: m.title.trim(),
      weight: Math.max(0, Math.min(100, Math.round(m.weight || 0))),
      start_date: m.start_date || null,
      due_date: m.due_date || null,
    })),
    deliverables: input.deliverables
      .filter((d) => d.title.trim())
      .map((d) => ({ title: d.title.trim() })),
  };
  const { error } = await supabase.rpc("submit_change_request", {
    p_entity_type: "initiative",
    p_action: "create",
    p_entity_id: null,
    p_title: `إنشاء مبادرة: ${input.title.trim()}`,
    p_payload: payload,
  });
  if (error)
    return { ok: false, error: "تعذّر رفع الطلب — تأكد من صلاحيتك." };

  revalidatePath("/initiatives");
  revalidatePath("/change-requests");
  revalidatePath("/");
  return { ok: true };
}

export async function setInitiativeStatus(
  id: string,
  status: InitiativeStatus
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };

  // شرط الانتقال للتنفيذ/الإكمال: 5 معالم على الأقل ومجموع أوزانها 100%
  if (status === "in_progress" || status === "done") {
    const { data: ms } = await supabase
      .from("kpi_initiative_milestones")
      .select("weight")
      .eq("initiative_id", id);
    const list = (ms as { weight: number }[]) ?? [];
    if (list.length < 5)
      return { ok: false, error: "يلزم 5 معالم على الأقل قبل بدء التنفيذ." };
    const sum = list.reduce((a, m) => a + (m.weight ?? 0), 0);
    if (sum !== 100)
      return {
        ok: false,
        error: `مجموع أوزان المعالم يجب أن يساوي 100% (الحالي ${sum}%).`,
      };
  }

  const { error } = await supabase
    .from("kpi_initiatives")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function removeInitiative(
  id: string,
  title?: string
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase.rpc("submit_change_request", {
    p_entity_type: "initiative",
    p_action: "delete",
    p_entity_id: id,
    p_title: `حذف مبادرة${title ? `: ${title}` : ""}`,
    p_payload: {},
  });
  if (error) return { ok: false, error: "تعذّر رفع الطلب" };
  revalidatePath("/initiatives");
  revalidatePath("/change-requests");
  return { ok: true };
}

// ===== المعالم =====
export async function addMilestone(input: {
  initiative_id: string;
  title: string;
  weight: number;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان المعلَم" };
  if (!(Math.round(input.weight || 0) > 0))
    return { ok: false, error: "لكل معلَم وزن أكبر من صفر." };
  const weight = Math.max(0, Math.min(100, Math.round(input.weight || 0)));
  const { error } = await supabase.from("kpi_initiative_milestones").insert({
    initiative_id: input.initiative_id,
    title: input.title.trim(),
    weight,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    sort_order: input.sort_order,
  });
  if (error) return { ok: false, error: "تعذّر إضافة المعلَم" };
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function toggleMilestone(
  id: string,
  done: boolean
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_milestones")
    .update({ done, progress: done ? 100 : 0 })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives");
  return { ok: true };
}

/** تحديث نسبة إنجاز المعلم (0–100%)؛ 100% = مكتمل */
export async function setMilestoneProgress(
  id: string,
  progress: number
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const p = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const { error } = await supabase
    .from("kpi_initiative_milestones")
    .update({ progress: p, done: p >= 100 })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives/follow-up");
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function deleteMilestone(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_milestones")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/initiatives");
  return { ok: true };
}

// ===== المخرجات =====
export async function addDeliverable(input: {
  initiative_id: string;
  title: string;
  sort_order: number;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.title.trim()) return { ok: false, error: "اكتب المخرج" };
  const { error } = await supabase.from("kpi_initiative_deliverables").insert({
    initiative_id: input.initiative_id,
    title: input.title.trim(),
    sort_order: input.sort_order,
  });
  if (error) return { ok: false, error: "تعذّر إضافة المخرج" };
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function toggleDeliverable(
  id: string,
  done: boolean
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_deliverables")
    .update({ done })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function deleteDeliverable(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_deliverables")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/initiatives");
  return { ok: true };
}

// ===== تحديثات/تحديات المتابعة =====
export async function addInitiativeUpdate(input: {
  initiative_id: string;
  kind: "update" | "challenge";
  body: string;
  severity?: "low" | "medium" | "high" | "critical" | null;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.body.trim()) return { ok: false, error: "اكتب النص" };
  const severity = input.kind === "challenge" ? input.severity ?? "medium" : null;
  const { error } = await supabase.from("kpi_initiative_updates").insert({
    initiative_id: input.initiative_id,
    kind: input.kind,
    body: input.body.trim(),
    severity,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "تعذّر الحفظ" };

  // تنبيه القيادة عند تحدٍّ حرِج
  if (severity === "critical") {
    const { data: init } = await supabase
      .from("kpi_initiatives")
      .select("title")
      .eq("id", input.initiative_id)
      .single();
    const { data: leaders } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "executive"]);
    const title = (init as { title?: string } | null)?.title ?? "مبادرة";
    const rows = ((leaders as { id: string }[]) ?? []).map((l) => ({
      user_id: l.id,
      title: "تحدٍّ حرِج",
      body: `تحدٍّ حرِج على المبادرة: ${title}`,
      link: "/initiatives/follow-up",
    }));
    if (rows.length) await supabase.from("notifications").insert(rows);
  }

  revalidatePath("/initiatives/follow-up");
  revalidatePath("/initiatives");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteInitiativeUpdate(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_updates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/initiatives/follow-up");
  return { ok: true };
}

/** إغلاق/إعادة فتح تحديث أو تحدٍّ */
export async function setUpdateResolved(
  id: string,
  resolved: boolean
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_updates")
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives/follow-up");
  return { ok: true };
}

/** رد/تحديث على عنصر متابعة */
export async function addUpdateReply(input: {
  update_id: string;
  body: string;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.body.trim()) return { ok: false, error: "اكتب الرد" };
  const { error } = await supabase.from("kpi_initiative_update_replies").insert({
    update_id: input.update_id,
    body: input.body.trim(),
    created_by: user.id,
  });
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  revalidatePath("/initiatives/follow-up");
  return { ok: true };
}

export async function deleteUpdateReply(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_update_replies")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/initiatives/follow-up");
  return { ok: true };
}
