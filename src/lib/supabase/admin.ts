import { createServerClient } from "@supabase/ssr";

/**
 * عميل بمفتاح الخدمة (service_role) — للاستخدام داخل الخادم فقط ضمن
 * دوال التخزين المؤقت (unstable_cache) التي لا تصل إلى كوكيز الطلب.
 *
 * يقرأ بيانات مرجعية عامّة غير خاصّة بمستخدم (تتجاوز RLS). يعود null إذا
 * لم يُضبط المفتاح، فيتراجع التطبيق تلقائيًا إلى عميل الجلسة العادي.
 *
 * تنبيه: لا يجوز كشف SUPABASE_SERVICE_ROLE_KEY للمتصفّح (بدون بادئة NEXT_PUBLIC).
 */
let cachedAdmin: ReturnType<typeof createServerClient> | null | undefined;

export function getAdminClient() {
  if (cachedAdmin !== undefined) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cachedAdmin =
    url && key
      ? createServerClient(url, key, {
          cookies: { getAll: () => [], setAll: () => {} },
        })
      : null;
  return cachedAdmin;
}
