"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

type Opts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
type State = Opts & { open: boolean; message: string };

// مُطلِق عام لنافذة التأكيد (Promise) قابل للاستدعاء من أي مكان
let opener: ((message: string, o?: Opts) => Promise<boolean>) | null = null;

export function confirmDialog(message: string, o?: Opts): Promise<boolean> {
  if (opener) return opener(message, o);
  if (typeof window !== "undefined") return Promise.resolve(window.confirm(message));
  return Promise.resolve(false);
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ open: false, message: "" });
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const open = useCallback((message: string, o?: Opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ open: true, message, ...o });
    });
  }, []);

  useEffect(() => {
    opener = open;
    return () => {
      opener = null;
    };
  }, [open]);

  function settle(v: boolean) {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(v);
    resolver.current = null;
  }

  return (
    <>
      {children}
      <AlertDialog.Root
        open={state.open}
        onOpenChange={(o) => {
          if (!o) settle(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[90] bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="card fixed left-1/2 top-1/2 z-[91] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 p-5 outline-none transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <AlertDialog.Title className="text-base font-bold text-mushar-dark">
              {state.title ?? "تأكيد"}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-slate-600">
              {state.message}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => settle(false)} className="btn-ghost">
                {state.cancelText ?? "إلغاء"}
              </button>
              <button
                onClick={() => settle(true)}
                className={
                  state.danger
                    ? "rounded-lg bg-mushar-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    : "btn-primary"
                }
              >
                {state.confirmText ?? "تأكيد"}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
