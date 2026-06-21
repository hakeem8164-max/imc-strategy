"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function updateOrgName(name: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase
    .from("org_profile")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function addOrgUnit(input: {
  name: string;
  unit_type: string;
  parent_id: string | null;
}): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  if (!input.name.trim()) return { ok: false, error: "الاسم مطلوب" };
  const { error } = await supabase.from("org_units").insert({
    name: input.name.trim(),
    unit_type: input.unit_type,
    parent_id: input.parent_id,
  });
  if (error) return { ok: false, error: "تعذّر الإضافة" };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function renameOrgUnit(id: string, name: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase
    .from("org_units")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التعديل" };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteOrgUnit(id: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase.from("org_units").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/admin/settings");
  return { ok: true };
}

// ===== أنواع الوحدات =====

export async function addUnitType(
  name: string,
  color: string
): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  if (!name.trim()) return { ok: false, error: "اسم النوع مطلوب" };
  const { error } = await supabase
    .from("org_unit_types")
    .insert({ name: name.trim(), color });
  if (error)
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "هذا النوع موجود مسبقًا"
        : "تعذّر الإضافة",
    };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteUnitType(id: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase.from("org_unit_types").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/admin/settings");
  return { ok: true };
}
