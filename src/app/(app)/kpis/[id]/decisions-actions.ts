"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, user, role: (data?.role ?? null) as string | null };
}

function reval(kpiId: string) {
  revalidatePath(`/kpis/${kpiId}`);
  revalidatePath("/performance/decisions");
  revalidatePath("/");
}

export async function addDecision(input: {
  kpi_id: string;
  body: string;
  action: string | null;
  assigned_user_id: string;
  due_date: string;
}): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || (role !== "admin" && role !== "executive"))
    return { ok: false, error: "متاح للقيادة التنفيذية ومسؤول الأداء فقط" };
  if (!input.body.trim())
    return { ok: false, error: "اكتب نص القرار أو الملاحظة" };
  if (!input.assigned_user_id)
    return { ok: false, error: "حدّد الشخص المسؤول عن المتابعة" };
  if (!input.due_date)
    return { ok: false, error: "حدّد تاريخ الاستحقاق" };

  const { error } = await supabase.from("kpi_decisions").insert({
    kpi_id: input.kpi_id,
    body: input.body.trim(),
    action: input.action?.trim() || null,
    assigned_user_id: input.assigned_user_id,
    due_date: input.due_date,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "تعذّر حفظ القرار" };
  reval(input.kpi_id);
  return { ok: true };
}

export async function addDecisionUpdate(input: {
  decision_id: string;
  kpi_id: string;
  body: string;
  mention_user_id: string | null;
}): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.body.trim())
    return { ok: false, error: "اكتب نص التحديث" };

  const { error } = await supabase.from("kpi_decision_updates").insert({
    decision_id: input.decision_id,
    body: input.body.trim(),
    mention_user_id: input.mention_user_id || null,
    created_by: user.id,
  });
  if (error)
    return {
      ok: false,
      error: "تعذّر إضافة التحديث — يضيفه القائد أو الشخص المسؤول فقط.",
    };
  reval(input.kpi_id);
  return { ok: true };
}

export async function toggleDecisionStatus(
  id: string,
  kpiId: string,
  status: "open" | "done"
): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "غير مصرّح" };
  // الحماية الفعلية عبر RLS (المسؤول/الرئيس التنفيذي أو مالك الوحدة المُسنَدة)
  const { error } = await supabase
    .from("kpi_decisions")
    .update({ status })
    .eq("id", id);
  if (error)
    return { ok: false, error: "تعذّر تحديث الحالة — قد لا تملك الصلاحية" };
  reval(kpiId);
  return { ok: true };
}

export async function deleteDecision(
  id: string,
  kpiId: string
): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || (role !== "admin" && role !== "executive"))
    return { ok: false, error: "متاح للقيادة التنفيذية ومسؤول الأداء فقط" };
  const { error } = await supabase.from("kpi_decisions").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر حذف القرار" };
  reval(kpiId);
  return { ok: true };
}
