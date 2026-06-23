// أنماط موحّدة لمكوّنات Base UI (قوائم/نوافذ/تلميحات) — مصدر واحد للاتساق

// حركة دخول/خروج موحّدة مع احترام تقليل الحركة
export const popupMotion =
  "transition-[transform,opacity] duration-150 ease-out origin-[var(--transform-origin)] " +
  "data-[starting-style]:opacity-0 data-[starting-style]:scale-95 " +
  "data-[ending-style]:opacity-0 data-[ending-style]:scale-95 " +
  "motion-reduce:transition-none motion-reduce:data-[starting-style]:scale-100";

// حاوية القائمة المنبثقة (Select/Combobox/Menu)
export const popupClass =
  "max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-slate-100 " +
  "bg-white p-1 shadow-cardHover outline-none dark:border-brand-line dark:bg-brand-surface " +
  popupMotion;

// عنصر داخل القائمة
export const itemClass =
  "flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm " +
  "text-brand-dark outline-none data-[highlighted]:bg-brand-pale " +
  "dark:text-brand-ink dark:data-[highlighted]:bg-brand-hover";

// زر/مشغّل القائمة
export const triggerClass =
  "inline-flex h-[42px] items-center justify-between gap-2 rounded-lg border border-slate-200 " +
  "bg-white px-3.5 text-sm text-brand-dark outline-none transition hover:border-slate-300 " +
  "focus:border-brand-primary focus:ring-2 focus:ring-brand-pale data-[popup-open]:border-brand-primary " +
  "disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-line dark:bg-brand-field dark:text-brand-ink";

// حقل إدخال (Combobox.Input)
export const fieldClass =
  "input w-full dark:border-brand-line dark:bg-brand-field dark:text-brand-ink";
