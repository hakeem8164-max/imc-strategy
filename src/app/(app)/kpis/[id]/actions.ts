"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_DATA_TAG } from "@/lib/data";

export type ActionResult = { ok: boolean; error?: string };

export async function addEntry(
  kpiId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };

  const value = Number(formData.get("value"));
  const periodLabel = String(formData.get("period_label") || "").trim();
  const periodDate = String(formData.get("period_date") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (Number.isNaN(value)) return { ok: false, error: "القيمة غير صحيحة" };
  if (!periodLabel) return { ok: false, error: "حدد الفترة" };
  if (!periodDate) return { ok: false, error: "حدد تاريخ الفترة" };

  // الحماية الفعلية عبر RLS؛ سيُرفض الإدخال إن لم يكن المستخدم مالكًا أو مديرًا
  const { error } = await supabase.from("kpi_entries").insert({
    kpi_id: kpiId,
    value,
    period_label: periodLabel,
    period_date: periodDate,
    note: note || null,
    created_by: user.id,
  });

  if (error) {
    return {
      ok: false,
      error: "تعذّر حفظ القيمة — قد لا تملك صلاحية الإدخال لهذا المؤشر.",
    };
  }

  revalidateTag(APP_DATA_TAG);
  revalidatePath(`/kpis/${kpiId}`);
  revalidatePath("/kpis");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteEntry(
  entryId: string,
  kpiId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("kpi_entries")
    .delete()
    .eq("id", entryId);
  if (error) return { ok: false, error: "تعذّر حذف القيمة" };
  revalidateTag(APP_DATA_TAG);
  revalidatePath(`/kpis/${kpiId}`);
  revalidatePath("/");
  return { ok: true };
}
