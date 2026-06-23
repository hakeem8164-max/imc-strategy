import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // طلبات الجلب المسبق (prefetch) لا تحتاج تحقّق جلسة عبر الشبكة؛
  // الحماية مكفولة في الطلب الفعلي وعلى مستوى الصفحة. تخطّيها يوفّر
  // رحلات auth/v1/user كثيرة عند تمرير الروابط.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    (request.headers.get("sec-purpose") || "").includes("prefetch");
  if (isPrefetch) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // التحقق من الجلسة: نحاول أولًا تحققًا محليًّا من رمز الدخول عبر
  // getClaims (يتم محليًّا بمفاتيح JWT اللامتماثلة بلا أي رحلة شبكة).
  // عند الفشل (رمز منتهٍ/غير صالح) نرجع لـgetUser الذي يتحقق ويُجدّد
  // الجلسة عبر الشبكة. هذا يلغي رحلة المصادقة من كل تنقّل تقريبًا.
  let authed = false;
  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    authed = !!claimsData?.claims?.sub;
  } catch {
    authed = false;
  }
  if (!authed) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = !!user;
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path === "/api/keep-warm" ||
    path === "/mushar-logo.png" ||
    path === "/mushar-logo-light.png";

  if (!authed && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
