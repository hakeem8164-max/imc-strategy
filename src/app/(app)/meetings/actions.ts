"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function notifyMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[] | undefined,
  body: string
) {
  const uniq = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (!uniq.length) return;
  await supabase.from("notifications").insert(
    uniq.map((id) => ({
      user_id: id,
      title: "تمت الإشارة إليك",
      body,
      link: "/meetings",
    }))
  );
}

// ===== الاجتماع =====
export async function createMeeting(input: {
  type: string;
  title: string;
  meeting_date: string | null;
  committee: string | null;
  attendees: string | null;
  minutes: string | null;
  recommendations: {
    name: string;
    description: string | null;
    domain_id: string | null;
    owner_unit_id: string | null;
    owner_user_id: string | null;
    due_date: string | null;
    priority: "low" | "medium" | "high" | "critical";
    participant_unit_ids: string[];
  }[];
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.type) return { ok: false, error: "اختر نوع الاجتماع" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان الاجتماع" };

  const cycle = input.meeting_date
    ? String(new Date(input.meeting_date).getFullYear())
    : String(new Date().getFullYear());

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      type: input.type,
      title: input.title.trim(),
      meeting_date: input.meeting_date || null,
      committee: input.committee?.trim() || null,
      attendees: input.attendees?.trim() || null,
      minutes: input.minutes?.trim() || null,
      cycle,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !meeting)
    return { ok: false, error: "تعذّر حفظ الاجتماع — تأكد من صلاحيتك." };

  const recs = input.recommendations.filter((r) => r.name.trim());
  for (const r of recs) {
    const { data: rec, error: rErr } = await supabase
      .from("meeting_recommendations")
      .insert({
        meeting_id: meeting.id,
        name: r.name.trim(),
        description: r.description?.trim() || null,
        domain_id: r.domain_id || null,
        owner_unit_id: r.owner_unit_id || null,
        owner_user_id: r.owner_user_id || null,
        due_date: r.due_date || null,
        priority: r.priority || "medium",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (rErr || !rec) continue;
    const units = Array.from(new Set((r.participant_unit_ids ?? []).filter(Boolean)));
    if (units.length)
      await supabase.from("recommendation_participants").insert(
        units.map((u) => ({ recommendation_id: rec.id, org_unit_id: u }))
      );
    // إشعار المسؤول المكلَّف
    if (r.owner_user_id)
      await supabase.from("notifications").insert({
        user_id: r.owner_user_id,
        title: "توصية جديدة مُسنَدة إليك",
        body: r.name.trim(),
        link: "/meetings",
      });
  }

  revalidatePath("/meetings");
  revalidatePath("/my-tasks");
  return { ok: true };
}

export async function deleteMeeting(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/meetings");
  return { ok: true };
}

// ===== التوصيات =====
export async function addRecommendation(input: {
  meeting_id: string;
  name: string;
  description: string | null;
  domain_id: string | null;
  owner_unit_id: string | null;
  owner_user_id: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "critical";
  participant_unit_ids: string[];
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.name.trim()) return { ok: false, error: "اكتب نص التوصية" };
  const { data: rec, error } = await supabase
    .from("meeting_recommendations")
    .insert({
      meeting_id: input.meeting_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      domain_id: input.domain_id || null,
      owner_unit_id: input.owner_unit_id || null,
      owner_user_id: input.owner_user_id || null,
      due_date: input.due_date || null,
      priority: input.priority || "medium",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !rec) return { ok: false, error: "تعذّر إضافة التوصية" };
  const units = Array.from(new Set((input.participant_unit_ids ?? []).filter(Boolean)));
  if (units.length)
    await supabase.from("recommendation_participants").insert(
      units.map((u) => ({ recommendation_id: rec.id, org_unit_id: u }))
    );
  if (input.owner_user_id)
    await supabase.from("notifications").insert({
      user_id: input.owner_user_id,
      title: "توصية جديدة مُسنَدة إليك",
      body: input.name.trim(),
      link: "/meetings",
    });
  revalidatePath("/meetings");
  revalidatePath("/my-tasks");
  return { ok: true };
}

export async function deleteRecommendation(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("meeting_recommendations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/meetings");
  return { ok: true };
}

// ===== طلب الإغلاق ومراجعته =====
export async function requestClosure(input: {
  recommendation_id: string;
  doc_url: string;
  doc_name: string;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.doc_url) return { ok: false, error: "إرفاق وثيقة الإغلاق إلزامي." };
  const { error } = await supabase.rpc("request_recommendation_closure", {
    p_id: input.recommendation_id,
    p_doc_url: input.doc_url,
    p_doc_name: input.doc_name,
  });
  if (error) return { ok: false, error: "تعذّر رفع طلب الإغلاق" };
  revalidatePath("/meetings");
  revalidatePath("/my-tasks");
  return { ok: true };
}

export async function reviewClosure(input: {
  recommendation_id: string;
  approve: boolean;
  note: string | null;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase.rpc("review_recommendation_closure", {
    p_id: input.recommendation_id,
    p_approve: input.approve,
    p_note: input.note?.trim() || null,
  });
  if (error)
    return { ok: false, error: "تعذّر اعتماد الطلب — هذه الصلاحية لمسؤول القياس." };
  revalidatePath("/meetings");
  revalidatePath("/my-tasks");
  return { ok: true };
}

// ===== التحديات/التحديثات داخل التوصية =====
export async function addRecUpdate(input: {
  recommendation_id: string;
  kind: "update" | "challenge";
  body: string;
  severity?: "low" | "medium" | "high" | "critical" | null;
  mention_user_ids?: string[];
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.body.trim()) return { ok: false, error: "اكتب النص" };
  const severity = input.kind === "challenge" ? input.severity ?? "medium" : null;
  const { error } = await supabase.from("recommendation_updates").insert({
    recommendation_id: input.recommendation_id,
    kind: input.kind,
    body: input.body.trim(),
    severity,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  await notifyMentions(supabase, input.mention_user_ids, input.body.trim());
  revalidatePath("/meetings");
  return { ok: true };
}

export async function deleteRecUpdate(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("recommendation_updates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/meetings");
  return { ok: true };
}

export async function setRecUpdateResolved(
  id: string,
  resolved: boolean
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("recommendation_updates")
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/meetings");
  return { ok: true };
}

export async function addRecReply(input: {
  update_id: string;
  body: string;
  mention_user_ids?: string[];
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.body.trim()) return { ok: false, error: "اكتب الرد" };
  const { error } = await supabase.from("recommendation_update_replies").insert({
    update_id: input.update_id,
    body: input.body.trim(),
    created_by: user.id,
  });
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  await notifyMentions(supabase, input.mention_user_ids, input.body.trim());
  revalidatePath("/meetings");
  return { ok: true };
}

export async function deleteRecReply(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("recommendation_update_replies")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/meetings");
  return { ok: true };
}

// ===== مجالات التوصيات (إعدادات — مسؤول القياس) =====
export async function addDomain(name: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!name.trim()) return { ok: false, error: "اكتب اسم المجال" };
  const { data: max } = await supabase
    .from("recommendation_domains")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = ((max as { sort_order: number } | null)?.sort_order ?? 0) + 1;
  const { error } = await supabase
    .from("recommendation_domains")
    .insert({ name: name.trim(), sort_order: next });
  if (error) return { ok: false, error: "تعذّر الإضافة (قد يكون الاسم مكررًا)" };
  revalidatePath("/meetings");
  return { ok: true };
}

export async function renameDomain(id: string, name: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!name.trim()) return { ok: false, error: "اكتب اسم المجال" };
  const { error } = await supabase
    .from("recommendation_domains")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التعديل" };
  revalidatePath("/meetings");
  return { ok: true };
}

export async function toggleDomain(id: string, is_active: boolean): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("recommendation_domains")
    .update({ is_active })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/meetings");
  return { ok: true };
}
