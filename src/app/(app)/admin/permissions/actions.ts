"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setPermission(
  role: string,
  permission: string,
  allowed: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "غير مصرّح" };

  const { error } = await supabase
    .from("role_permissions")
    .upsert({ role, permission, allowed }, { onConflict: "role,permission" });

  if (error)
    return { ok: false, error: "تعذّر الحفظ — تحتاج صلاحية مدير النظام." };

  revalidatePath("/admin/permissions");
  return { ok: true };
}
