"use client";

import { Dialog } from "@base-ui/react/dialog";

/**
 * مثال على استخدام مكتبة Base UI (من MUI) مع Tailwind ودعم الاتجاه RTL.
 * مكوّنات Base UI بدون تنسيق مسبق، لذلك نتحكم بالمظهر بالكامل عبر classNames.
 */
export default function BaseUiDialogExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5A2114] px-4 text-sm font-medium text-white transition hover:bg-[#6b2818]">
        فتح نافذة تجريبية
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 text-right shadow-xl outline-none transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:bg-zinc-900">
          <Dialog.Title className="text-lg font-bold text-zinc-900 dark:text-white">
            مرحباً بك في Base UI
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            هذه نافذة تجريبية مبنية بمكوّنات Base UI من MUI ومنسّقة بـ Tailwind
            مع دعم كامل للاتجاه من اليمين لليسار.
          </Dialog.Description>

          <div className="mt-6 flex justify-start gap-2">
            <Dialog.Close className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              إغلاق
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
