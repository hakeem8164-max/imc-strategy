// منصة المساجد المتكاملة — إنشاء مستخدم مباشرة (دون بريد)
// ينشئ حساباً مؤكَّداً فوراً بكلمة مرور مؤقتة مع علامة must_change_password.
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
    if (!me || me.role !== "admin") return json({ error: "إنشاء المستخدمين متاح لمدير النظام فقط." }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "viewer");
    const title = body.title ? String(body.title).trim() : null;
    const orgUnitId = body.org_unit_id ?? null;
    if (!email || !email.includes("@")) return json({ error: "بريد غير صحيح." }, 400);
    if (password.length < 6) return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." }, 400);
    const validRoles = ["admin", "executive", "owner", "employee", "viewer"];
    if (!validRoles.includes(role)) return json({ error: "دور غير صالح." }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName || email.split("@")[0], must_change_password: true },
    });
    if (createErr || !created?.user) {
      const msg = (createErr?.message ?? "").includes("already")
        ? "هذا البريد مسجّل مسبقاً."
        : "تعذّر الإنشاء: " + (createErr?.message ?? "خطأ غير معروف");
      return json({ error: msg }, 400);
    }

    const { error: profErr } = await admin.from("profiles")
      .update({ role, title, org_unit_id: orgUnitId, status: "active", full_name: fullName || email.split("@")[0], email })
      .eq("id", created.user.id);
    if (profErr) return json({ error: "أُنشئ الحساب لكن تعذّر ضبط الصلاحية: " + profErr.message }, 500);

    return json({ ok: true, message: "تم إنشاء الحساب بنجاح. سلّم المستخدم بياناته." });
  } catch (e) {
    return json({ error: "خطأ غير متوقع: " + String(e) }, 500);
  }
});
