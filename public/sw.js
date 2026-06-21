// خدمة عامل (Service Worker) لمنصة مشار
// الغرض الأساسي: تمكين تثبيت التطبيق (PWA) على الأجهزة.
// لا نُخزّن الصفحات الديناميكية/المحمية في الكاش لتفادي عرض محتوى قديم.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// معالج جلب بسيط (تمرير مباشر للشبكة) — مطلوب لاعتبار التطبيق قابلًا للتثبيت
self.addEventListener("fetch", () => {
  // تمرير افتراضي للشبكة دون تدخل
});
