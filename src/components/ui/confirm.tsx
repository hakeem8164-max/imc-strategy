"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { popupMotion } from "@/components/ui/styles";

type ConfirmOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
type PromptOpts = ConfirmOpts & {
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
};
type State = ConfirmOpts &
  PromptOpts & { open: boolean; message: string; mode: "confirm" | "prompt"; input: string };

let confirmOpener: ((message: string, o?: ConfirmOpts) => Promise<boolean>) | null = null;
let promptOpener: ((message: string, o?: PromptOpts) => Promise<string | null>) | null = null;

export function confirmDialog(message: string, o?: ConfirmOpts): Promise<boolean> {
  if (confirmOpener) return confirmOpener(message, o);
  if (typeof window !== "undefined") return Promise.resolve(window.confirm(message));
  return Promise.resolve(false);
}

export function promptDialog(message: string, o?: PromptOpts): Promise<string | null> {
  if (promptOpener) return promptOpener(message, o);
  if (typeof window !== "undefined")
    return Promise.resolve(window.prompt(message, o?.defaultValue ?? ""));
  return Promise.resolve(null);
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    open: false,
    message: "",
    mode: "confirm",
    input: "",
  });
  const resolver = useRef<((v: boolean | string | null) => void) | null>(null);

  const openConfirm = useCallback((message: string, o?: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve as (v: boolean | string | null) => void;
      setState({ open: true, mode: "confirm", message, input: "", ...o });
    });
  }, []);

  const openPrompt = useCallback((message: string, o?: PromptOpts) => {
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve as (v: boolean | string | null) => void;
      setState({ open: true, mode: "prompt", message, input: o?.defaultValue ?? "", ...o });
    });
  }, []);

  useEffect(() => {
    confirmOpener = openConfirm;
    promptOpener = openPrompt;
    return () => {
      confirmOpener = null;
      promptOpener = null;
    };
  }, [openConfirm, openPrompt]);

  function close(value: boolean | string | null) {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(value);
    resolver.current = null;
  }

  const isPrompt = state.mode === "prompt";

  return (
    <>
      {children}
      <AlertDialog.Root
        open={state.open}
        onOpenChange={(o) => {
          if (!o) close(isPrompt ? null : false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[90] bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className={`card fixed left-1/2 top-1/2 z-[91] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 p-5 outline-none ${popupMotion}`}>
            <AlertDialog.Title className="text-base font-bold text-brand-dark">
              {state.title ?? (isPrompt ? "إدخال" : "تأكيد")}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-slate-600">
              {state.message}
            </AlertDialog.Description>

            {isPrompt &&
              (state.multiline ? (
                <textarea
                  autoFocus
                  className="input mt-3 min-h-[80px]"
                  placeholder={state.placeholder}
                  value={state.input}
                  onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                />
              ) : (
                <input
                  autoFocus
                  className="input mt-3"
                  placeholder={state.placeholder}
                  value={state.input}
                  onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") close(state.input);
                  }}
                />
              ))}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(isPrompt ? null : false)} className="btn-ghost">
                {state.cancelText ?? "إلغاء"}
              </button>
              <button
                onClick={() => close(isPrompt ? state.input : true)}
                className={
                  state.danger
                    ? "rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    : "btn-primary"
                }
              >
                {state.confirmText ?? (isPrompt ? "حفظ" : "تأكيد")}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
