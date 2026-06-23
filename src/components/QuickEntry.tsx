"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Zap, Check, X, Loader2 } from "lucide-react";
import { addEntry } from "@/app/(app)/kpis/[id]/actions";
import { notify } from "@/components/ui/toast";
import { popupMotion } from "@/components/ui/styles";

type QKpi = { id: string; name: string; unit: string; code?: string };

const unitHint = (u: string) =>
  u === "%" ? "%" : u === "$" ? "ر.س" : u === "#" ? "عدد" : "";

/** إدخال سريع لنتائج عدّة مؤشرات لفترة واحدة دون مغادرة الصفحة. */
export default function QuickEntry({ kpis }: { kpis: QKpi[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const savedCount = useMemo(
    () => Object.values(saved).filter(Boolean).length,
    [saved]
  );

  if (kpis.length === 0) return null;

  function saveRow(k: QKpi) {
    if (!period.trim()) return notify("حدّد الفترة أولًا (مثل: الربع الأول 2026)", "error");
    if (!date) return notify("حدّد تاريخ الفترة", "error");
    const v = vals[k.id];
    if (v === undefined || v === "") return notify("اكتب القيمة أولًا", "error");
    const fd = new FormData();
    fd.set("value", v);
    fd.set("period_label", period.trim());
    fd.set("period_date", date);
    setSavingId(k.id);
    startTransition(async () => {
      const res = await addEntry(k.id, fd);
      setSavingId(null);
      if (res.ok) {
        setSaved((s) => ({ ...s, [k.id]: true }));
        notify(`تم حفظ «${k.name}»`, "success");
        router.refresh();
      } else {
        notify(res.error || "تعذّر الحفظ", "error");
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-1.5">
        <Zap size={16} /> إدخال سريع للنتائج
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            className={`card fixed left-1/2 top-1/2 z-[51] flex max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden p-0 outline-none ${popupMotion} dark:bg-mushar-surface`}
          >
            {/* الترويسة + الفترة */}
            <div className="border-b border-slate-100 p-5 dark:border-mushar-line">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-mushar-dark dark:text-mushar-ink">
                  <Zap size={18} className="text-mushar-primary" /> إدخال سريع للنتائج
                </h3>
                <Dialog.Close
                  aria-label="إغلاق"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-mushar-hover"
                >
                  <X size={18} />
                </Dialog.Close>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">الفترة *</label>
                  <input
                    className="input"
                    placeholder="مثال: الربع الأول 2026"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">تاريخ الفترة *</label>
                  <input
                    type="date"
                    className="input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                تُحفظ القيم لاعتمادها لاحقًا من المراجعة. ({savedCount}/{kpis.length} محفوظة)
              </p>
            </div>

            {/* قائمة المؤشرات */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1.5">
                {kpis.map((k) => {
                  const done = saved[k.id];
                  const busy = savingId === k.id;
                  return (
                    <div
                      key={k.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-mushar-line"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-mushar-dark dark:text-mushar-ink">
                        {k.name}
                        {k.code && <span className="mr-1 text-[11px] text-slate-400"> #{k.code}</span>}
                      </span>
                      <div className="relative w-28 shrink-0">
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          className="input py-1.5 text-sm"
                          placeholder={unitHint(k.unit) || "القيمة"}
                          value={vals[k.id] ?? ""}
                          onChange={(e) =>
                            setVals((s) => ({ ...s, [k.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRow(k);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => saveRow(k)}
                        disabled={busy}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          done
                            ? "bg-green-100 text-green-700"
                            : "bg-mushar-primary text-white hover:bg-mushar-dark"
                        } disabled:opacity-50`}
                      >
                        {busy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : done ? (
                          <Check size={14} />
                        ) : (
                          "حفظ"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
