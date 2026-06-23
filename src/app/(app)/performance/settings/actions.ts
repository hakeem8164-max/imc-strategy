"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_DATA_TAG } from "@/lib/data";

type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, ok: data?.role === "admin" };
}

function reval() {
  revalidateTag(APP_DATA_TAG);
  revalidatePath("/performance/settings");
  revalidatePath("/");
}

export async function addBand(
  label: string,
  minPct: number,
  color: string
): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  if (!label.trim()) return { ok: false, error: "اسم المستوى مطلوب" };
  const { error } = await supabase
    .from("performance_bands")
    .insert({ label: label.trim(), min_pct: minPct, color });
  if (error) return { ok: false, error: "تعذّر الإضافة" };
  reval();
  return { ok: true };
}

export async function updateBand(
  id: string,
  patch: { label?: string; min_pct?: number; color?: string }
): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase
    .from("performance_bands")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التعديل" };
  reval();
  return { ok: true };
}

export async function deleteBand(id: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase.from("performance_bands").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  reval();
  return { ok: true };
}

export async function updateDueSoonDays(days: number): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase
    .from("app_settings")
    .update({ due_soon_days: days, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  reval();
  return { ok: true };
}
