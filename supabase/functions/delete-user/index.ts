// منصة المساجد المتكاملة — حذف مستخدم بالكامل (profiles + auth.users)
// يمنع: حذف النفس، وحذف آخر مدير نظام.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return json({ error: "إعدادات الخادم غير مكتملة." }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "غير مصرّح." }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) return json({ error: "تعذّر التحقق من المستخدم." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return json({ error: "الحذف متاح لمدير النظام فقط." }, 403);

    const body = await req.json().catch(() => ({}));
    const targetId = String(body.user_id ?? "");
    if (!targetId) return json({ error: "لم يُحدّد المستخدم." }, 400);
    if (targetId === user.id) return json({ error: "لا يمكنك حذف حسابك أنت." }, 400);

    const { data: target } = await admin.from("profiles").select("role").eq("id", targetId).single();
    if (target?.role === "admin") {
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) return json({ error: "لا يمكن حذف آخر مدير نظام." }, 400);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) return json({ error: "تعذّر الحذف: " + delErr.message }, 500);
    return json({ ok: true, message: "تم حذف المستخدم نهائياً." });
  } catch (e) {
    return json({ error: "خطأ غير متوقع: " + String(e) }, 500);
  }
});
