"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEntry } from "@/app/(app)/kpis/[id]/actions";
import type { Unit } from "@/lib/types";

export default function EntryForm({
  kpiId,
  unit,
}: {
  kpiId: string;
  unit: Unit;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const unitHint =
    unit === "%" ? "نسبة %" : unit === "$" ? "بالريال" : unit === "#" ? "عدد" : "";

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await addEntry(kpiId, formData);
      if (res.ok) {
        setMsg({ ok: true, text: "تم حفظ القياس بنجاح" });
        router.refresh();
        (document.getElementById("entry-form") as HTMLFormElement)?.reset();
      } else {
        setMsg({ ok: false, text: res.error || "حدث خطأ" });
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form id="entry-form" action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">القيمة {unitHint && `(${unitHint})`}</label>
          <input
            name="value"
            type="number"
            step="any"
            required
            className="input"
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">الفترة (وصف)</label>
          <input
            name="period_label"
            type="text"
            required
            className="input"
            placeholder="مثال: يونيو 2026 / الربع 3"
          />
        </div>
        <div>
          <label className="label">تاريخ الفترة</label>
          <input
            name="period_date"
            type="date"
            required
            defaultValue={today}
            className="input"
          />
        </div>
        <div>
          <label className="label">ملاحظة (اختياري)</label>
          <input name="note" type="text" className="input" placeholder="ملاحظة" />
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg px-3 py-2.5 text-sm ${
            msg.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-brand-accent/10 text-brand-accent"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "حفظ القياس"}
      </button>
    </form>
  );
}
