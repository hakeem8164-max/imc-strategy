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

export async function createInitiative(input: {
  objective_id: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  start_date: string | null;
  due_date: string | null;
}): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  if (!input.objective_id) return { ok: false, error: "اختر الهدف المرتبط" };
  if (!input.title.trim()) return { ok: false, error: "اكتب عنوان المبادرة" };

  const { error } = await supabase.from("kpi_initiatives").insert({
    objective_id: input.objective_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    owner_user_id: input.owner_user_id || null,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    created_by: user.id,
  });
  if (error)
    return {
      ok: false,
      error: "تعذّر الحفظ — صلاحية إنشاء المبادرات للمدير/التنفيذي.",
    };
  revalidatePath("/initiatives");
  revalidatePath("/");
  return { ok: true };
}

export async function setInitiativeStatus(
  id: string,
  status: InitiativeStatus,
  progress?: number
): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const upd: Record<string, unknown> = { status };
  if (progress != null)
    upd.progress = Math.max(0, Math.min(100, Math.round(progress)));
  else if (status === "done") upd.progress = 100;
  const { error } = await supabase
    .from("kpi_initiatives")
    .update(upd)
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر التحديث" };
  revalidatePath("/initiatives");
  return { ok: true };
}

export async function removeInitiative(id: string): Promise<Result> {
  const { supabase, user } = await uid();
  if (!user) return { ok: false, error: "غير مصرّح" };
  const { error } = await supabase
    .from("kpi_initiatives")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "تعذّر الحذف" };
  revalidatePath("/initiatives");
  return { ok: true };
}
