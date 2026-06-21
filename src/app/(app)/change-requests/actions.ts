"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChangeEntity, ChangeAction } from "@/lib/data";

type Result = { ok: boolean; error?: string };

function revalAll() {
  revalidatePath("/change-requests");
  revalidatePath("/initiatives");
  revalidatePath("/kpis");
  revalidatePath("/admin/library");
  revalidatePath("/");
}

/** رفع طلب تغيير (يُطبَّق فورًا إن كان الرافع هو الرئيس التنفيذي) */
export async function submitChange(input: {
  entity_type: ChangeEntity;
  action: ChangeAction;
  entity_id: string | null;
  title: string;
  payload: Record<string, unknown>;
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_change_request", {
    p_entity_type: input.entity_type,
    p_action: input.action,
    p_entity_id: input.entity_id,
    p_title: input.title,
    p_payload: input.payload,
  });
  if (error)
    return { ok: false, error: "تعذّر رفع الطلب — تأكد من صلاحيتك." };
  revalAll();
  return { ok: true };
}

export async function reviewChange(
  id: string,
  decision: "approve" | "reject",
  note: string | null
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_change_request", {
    p_id: id,
    p_decision: decision,
    p_note: note,
  });
  if (error) return { ok: false, error: "تعذّر تنفيذ المراجعة." };
  revalAll();
  return { ok: true };
}
