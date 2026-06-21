"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  computeTotalTarget,
  type Aggregation,
  type Polarity,
  type Unit,
} from "@/lib/types";

type Result = { ok: boolean; error?: string; id?: string };

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

function revalidateAll() {
  revalidatePath("/admin/library");
  revalidatePath("/kpis");
  revalidatePath("/dimensions");
  revalidatePath("/");
}

// ===== الأبعاد =====
export async function addDimension(name: string, color: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  if (!name.trim()) return { ok: false, error: "اسم البعد مطلوب" };
  const { count } = await supabase
    .from("dimensions")
    .select("id", { count: "exact", head: true });
  const slug = "dim-" + Math.random().toString(36).slice(2, 9);
  const { error } = await supabase
    .from("dimensions")
    .insert({ name: name.trim(), color, slug, sort_order: (count ?? 0) + 1 });
  if (error)
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "هذا البعد موجود مسبقًا"
        : "تعذّر الإضافة",
    };
  revalidateAll();
  return { ok: true };
}

export async function deleteDimension(id: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { count } = await supabase
    .from("kpis")
    .select("id", { count: "exact", head: true })
    .eq("dimension_id", id);
  if ((count ?? 0) > 0)
    return { ok: false, error: "لا يمكن حذف بُعد يحتوي على مؤشرات. احذف مؤشراته أولًا." };
  const { error } = await supabase.from("dimensions").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidateAll();
  return { ok: true };
}

// ===== المؤشرات =====
export async function addKpi(dimensionId: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { count } = await supabase
    .from("kpis")
    .select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("kpis")
    .insert({
      dimension_id: dimensionId,
      code: String((count ?? 0) + 1),
      name: "مؤشر جديد",
      unit: "%",
      polarity: "positive",
      aggregation: "sum",
      is_active: true,
      sort_order: (count ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "تعذّر الإضافة" };
  revalidateAll();
  return { ok: true, id: data?.id };
}

export interface KpiInput {
  name: string;
  description: string | null;
  owner_unit_id: string | null;
  measurement_method: string | null;
  unit: Unit;
  frequency: string | null;
  polarity: Polarity;
  aggregation: Aggregation;
  target_q1: number | null;
  target_q2: number | null;
  target_q3: number | null;
  target_q4: number | null;
}

export async function updateKpi(id: string, input: KpiInput): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  if (!input.name.trim()) return { ok: false, error: "اسم المؤشر مطلوب" };

  const target_total = computeTotalTarget(input.aggregation, [
    input.target_q1,
    input.target_q2,
    input.target_q3,
    input.target_q4,
  ]);

  const { error } = await supabase
    .from("kpis")
    .update({
      name: input.name.trim(),
      description: input.description,
      owner_unit_id: input.owner_unit_id,
      measurement_method: input.measurement_method,
      unit: input.unit,
      frequency: input.frequency,
      polarity: input.polarity,
      aggregation: input.aggregation,
      target_q1: input.target_q1,
      target_q2: input.target_q2,
      target_q3: input.target_q3,
      target_q4: input.target_q4,
      target_total,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحفظ" };
  revalidateAll();
  return { ok: true };
}

export async function toggleKpiActive(
  id: string,
  active: boolean
): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase
    .from("kpis")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التغيير" };
  revalidateAll();
  return { ok: true };
}

export async function deleteKpi(id: string): Promise<Result> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: "صلاحية مدير النظام مطلوبة" };
  const { error } = await supabase.from("kpis").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidateAll();
  return { ok: true };
}
