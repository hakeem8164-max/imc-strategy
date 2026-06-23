// مسار خفيف لإبقاء وظائف الخادم «دافئة» (يستدعيه Vercel Cron دوريًّا)
// لتقليل تأخّر «البدء البارد» على أول طلب بعد فترة خمول.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
