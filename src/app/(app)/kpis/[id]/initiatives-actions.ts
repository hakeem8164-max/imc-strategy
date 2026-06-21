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

function reval(kpiId: string) {
  revalidatePath(`/kpis/${kpiId}`);
  revalidatePath("/");
}

export async function addInitiative(input: {
  kpi_id: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  due_date: string | null;
  start_date: string | null;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان الخطة/المبادرة" };

  const { error } = await supabase.from("kpi_initiatives").insert({
    kpi_id: input.kpi_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    owner_user_id: input.owner_user_id || null,
    due_date: input.due_date || null,
    start_date: input.start_date || null,
    created_by: user.id,
  });
  if (error)
    return { ok: false, error: "تعذّر الحفظ — قد لا تملك صلاحية هذا المؤشر." };
  reval(input.kpi_id);
  return { ok: true };
}

export async function updateInitiative(
  id: string,
  kpiId: string,
  patch: { status?: InitiativeStatus; progress?: number }
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const upd: Record<string, unknown> = {};
  if (patch.status) upd.status = patch.status;
  if (patch.progress != null)
    upd.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  const { error } = await supabase
    .from("kpi_initiatives")
    .update(upd)
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  reval(kpiId);
  return { ok: true };
}

export async function deleteInitiative(
  id: string,
  kpiId: string
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase.from("kpi_initiatives").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  reval(kpiId);
  return { ok: true };
}

export async function addMilestone(input: {
  initiative_id: string;
  kpi_id: string;
  title: string;
  due_date: string | null;
  sort_order: number;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان المعلَم" };
  const { error } = await supabase.from("kpi_initiative_milestones").insert({
    initiative_id: input.initiative_id,
    title: input.title.trim(),
    due_date: input.due_date || null,
    sort_order: input.sort_order,
  });
  if (error) return { ok: false, error: "تعذّر إضافة المعلَم" };
  reval(input.kpi_id);
  return { ok: true };
}

export async function toggleMilestone(
  id: string,
  kpiId: string,
  done: boolean
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_milestones")
    .update({ done })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  reval(kpiId);
  return { ok: true };
}

export async function deleteMilestone(
  id: string,
  kpiId: string
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiative_milestones")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  reval(kpiId);
  return { ok: true };
}
