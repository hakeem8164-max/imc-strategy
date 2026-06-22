"use client";

import { Toast } from "@base-ui/react/toast";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

// مدير عام يسمح بإطلاق التنبيهات من أي مكان (حتى خارج مكوّنات React)
export const toastManager = Toast.createToastManager();

type ToastType = "success" | "error" | "info";

export function notify(message: string, type: ToastType = "info") {
  toastManager.add({
    title: message,
    type,
    timeout: type === "error" ? 6000 : 4000,
  });
}
notify.success = (m: string) => notify(m, "success");
notify.error = (m: string) => notify(m, "error");
notify.info = (m: string) => notify(m, "info");

const STYLE: Record<string, { border: string; icon: React.ReactNode }> = {
  success: { border: "border-r-emerald-500", icon: <CheckCircle2 size={18} className="text-emerald-600" /> },
  error: { border: "border-r-mushar-accent", icon: <AlertTriangle size={18} className="text-mushar-accent" /> },
  info: { border: "border-r-mushar-primary", icon: <Info size={18} className="text-mushar-primary" /> },
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <>
      {toasts.map((t) => {
        const s = STYLE[t.type ?? "info"] ?? STYLE.info;
        return (
          <Toast.Root
            key={t.id}
            toast={t}
            className="card flex items-start gap-3 border-r-4 p-3.5 pe-9 transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            style={{}}
          >
            <span className={`shrink-0 ${s.border}`}>{s.icon}</span>
            <div className="flex-1">
              <Toast.Title className="text-sm font-semibold text-mushar-dark" />
              <Toast.Description className="mt-0.5 text-xs text-slate-500" />
            </div>
            <Toast.Close
              aria-label="إغلاق"
              className="absolute left-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </Toast.Close>
          </Toast.Root>
        );
      })}
    </>
  );
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed left-1/2 top-4 z-[100] flex w-[360px] max-w-[92vw] -translate-x-1/2 flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
