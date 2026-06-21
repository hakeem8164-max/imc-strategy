"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function updateUser(
  userId: string,
  data: {
    role: Role;
    title: string | null;
    full_name: string | null;
    org_unit_id: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "غير مصرّح" };

  const { error } = await supabase
    .from("profiles")
    .update({
      role: data.role,
      title: data.title,
      full_name: data.full_name,
      org_unit_id: data.org_unit_id,
    })
    .eq("id", userId);

  if (error)
    return { ok: false, error: "تعذّر التحديث — تحتاج صلاحية مدير النظام." };

  revalidatePath("/admin/users");
  return { ok: true };
}
