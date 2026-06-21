// منصة المساجد المتكاملة — إرسال دعوة بريد للمستخدم
// يحفظ الدور والإدارة والمنصب في invitations ثم يرسل بريد دعوة.
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
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return json({ error: "الدعوة متاحة لمدير النظام فقط." }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "viewer");
    const title = body.title ? String(body.title).trim() : null;
    const orgUnitId = body.org_unit_id ?? null;
    const redirectTo = body.redirect_to ?? undefined;
    if (!email || !email.includes("@")) return json({ error: "بريد غير صحيح." }, 400);
    const validRoles = ["admin", "executive", "owner", "employee", "viewer"];
    if (!validRoles.includes(role)) return json({ error: "دور غير صالح." }, 400);

    const { error: invErr } = await admin.from("invitations")
      .upsert({ email, role, org_unit_id: orgUnitId, title }, { onConflict: "email" });
    if (invErr) return json({ error: "تعذّر حفظ الدعوة: " + invErr.message }, 500);

    const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: email.split("@")[0] },
      redirectTo,
    });
    if (mailErr) {
      const msg = mailErr.message.includes("already") || mailErr.message.includes("registered")
        ? "هذا البريد مسجّل مسبقاً — حُدّثت الدعوة، ولا حاجة لإيميل جديد."
        : "تعذّر إرسال البريد: " + mailErr.message;
      return json({ ok: true, warning: msg });
    }
    return json({ ok: true, message: "تم إرسال بريد الدعوة بنجاح." });
  } catch (e) {
    return json({ error: "خطأ غير متوقع: " + String(e) }, 500);
  }
});
