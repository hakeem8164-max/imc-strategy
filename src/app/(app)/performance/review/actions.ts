"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_DATA_TAG } from "@/lib/data";

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

function reval() {
  revalidateTag(APP_DATA_TAG);
  revalidatePath("/performance/review");
  revalidatePath("/");
}

export async function submitEntry(input: {
  kpi_id: string;
  value: number;
  period_label: string;
  period_start: string;
  period_end: string;
  note: string | null;
  document_url: string | null;
  document_name: string | null;
}): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (Number.isNaN(input.value)) return { ok: false, error: "القيمة غير صحيحة" };
  if (!input.period_start || !input.period_end)
    return { ok: false, error: "حدّد تاريخ بداية ونهاية الفترة" };

  // مسار الاعتماد: الموظف → المدير، والمدير/المسؤول → مسؤول الأداء مباشرة
  const status = role === "employee" ? "pending_manager" : "pending_officer";

  const { error } = await supabase.from("kpi_entries").insert({
    kpi_id: input.kpi_id,
    value: input.value,
    period_label: input.period_label.trim(),
    period_date: input.period_end,
    period_start: input.period_start,
    period_end: input.period_end,
    note: input.note,
    document_url: input.document_url,
    document_name: input.document_name,
    status,
    submitted_at: new Date().toISOString(),
    created_by: user.id,
  });
  if (error)
    return { ok: false, error: "تعذّر الإرسال — قد لا تملك صلاحية هذا المؤشر." };
  reval();
  return { ok: true };
}

/** اعتماد المدير: يرفع النتيجة لمسؤول الأداء */
export async function managerApprove(entryId: string): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || (role !== "owner" && role !== "admin"))
    return { ok: false, error: "متاح لمدير الإدارة فقط" };
  const { error } = await supabase
    .from("kpi_entries")
    .update({
      status: "pending_officer",
      manager_reviewed_by: user.id,
      manager_reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", entryId)
    .eq("status", "pending_manager");
  if (error) return { ok: false, error: "تعذّر الاعتماد" };
  reval();
  return { ok: true };
}

/** إعادة المدير للموظف */
export async function managerReject(
  entryId: string,
  reason: string
): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || (role !== "owner" && role !== "admin"))
    return { ok: false, error: "متاح لمدير الإدارة فقط" };
  if (!reason.trim()) return { ok: false, error: "يجب ذكر سبب الإعادة" };
  const { error } = await supabase
    .from("kpi_entries")
    .update({
      status: "rejected",
      review_note: reason.trim(),
      manager_reviewed_by: user.id,
      manager_reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("status", "pending_manager");
  if (error) return { ok: false, error: "تعذّر الإعادة" };
  reval();
  return { ok: true };
}

/** الاعتماد النهائي من مسؤول الأداء */
export async function approveEntry(entryId: string): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || role !== "admin")
    return { ok: false, error: "متاح لمسؤول قياس الأداء فقط" };
  const { error } = await supabase
    .from("kpi_entries")
    .update({
      status: "approved",
      review_note: null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("status", "pending_officer");
  if (error) return { ok: false, error: "تعذّر الاعتماد" };
  reval();
  return { ok: true };
}

export async function rejectEntry(
  entryId: string,
  reason: string
): Promise<Result> {
  const { supabase, user, role } = await me();
  if (!user || role !== "admin")
    return { ok: false, error: "متاح لمسؤول قياس الأداء فقط" };
  if (!reason.trim()) return { ok: false, error: "يجب ذكر سبب الرفض" };
  const { error } = await supabase
    .from("kpi_entries")
    .update({
      status: "rejected",
      review_note: reason.trim(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("status", "pending_officer");
  if (error) return { ok: false, error: "تعذّر الرفض" };
  reval();
  return { ok: true };
}
