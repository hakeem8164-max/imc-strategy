/**
 * شاشة تحميل فورية تظهر لحظة الانتقال بين الصفحات (داخل منطقة المحتوى،
 * مع بقاء الشريط العلوي والقائمة الجانبية)، فيشعر المستخدم باستجابة
 * فورية للنقرة بدل انتظار اكتمال تصيير الصفحة.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-9 w-56 rounded-lg bg-slate-200/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 p-4">
            <div className="h-8 w-8 rounded-xl bg-slate-200/70" />
            <div className="mt-3 h-4 w-2/3 rounded bg-slate-200/70" />
          </div>
        ))}
      </div>
      <div className="card space-y-3 p-5">
        <div className="h-5 w-40 rounded bg-slate-200/70" />
        <div className="h-3 w-full rounded bg-slate-200/60" />
        <div className="h-3 w-5/6 rounded bg-slate-200/60" />
        <div className="h-3 w-4/6 rounded bg-slate-200/60" />
      </div>
    </div>
  );
}
