"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { popupMotion } from "@/components/ui/styles";

/** نافذة حوارية موحّدة (Base UI Dialog) — تركيز/Esc/خلفية وحركة متّسقة. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          className={`card fixed left-1/2 top-1/2 z-[51] max-h-[90vh] w-[92vw] ${maxWidth} -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-4 outline-none sm:p-6 ${popupMotion} dark:bg-brand-surface`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-bold text-brand-dark dark:text-brand-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="إغلاق"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-brand-hover"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
