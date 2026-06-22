"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { notify } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import {
  addBand,
  updateBand,
  deleteBand,
  updateDueSoonDays,
} from "@/app/(app)/performance/settings/actions";
import type { Band } from "@/lib/bands";

export default function PerformanceSettings({
  bands,
  dueSoonDays,
}: {
  bands: Band[];
  dueSoonDays: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  // إضافة شطر
  const [label, setLabel] = useState("");
  const [minPct, setMinPct] = useState<number>(0);
  const [color, setColor] = useState("#8C341F");

  // الخيارات
  const [days, setDays] = useState(dueSoonDays);
  const [daysSaved, setDaysSaved] = useState(false);

  const sorted = [...bands].sort((a, b) => b.min_pct - a.min_pct);

  function add() {
    if (!label.trim()) return;
    start(async () => {
      const r = await addBand(label, minPct, color);
      if (r.ok) {
        setLabel("");
        setMinPct(0);
        router.refresh();
      } else notify(r.error || "خطأ", "error");
    });
  }
  function save(id: string, patch: Partial<Band>) {
    start(async () => {
      const r = await updateBand(id, patch);
      if (r.ok) router.refresh();
      else notify(r.error || "خطأ", "error");
    });
  }
  async function remove(b: Band) {
    if (await confirmDialog(`حذف المستوى «${b.label}»؟`, { danger: true, confirmText: "حذف" }))
      start(async () => {
        const r = await deleteBand(b.id);
        if (r.ok) router.refresh();
        else notify(r.error || "خطأ", "error");
      });
  }
  function saveDays() {
    start(async () => {
      const r = await updateDueSoonDays(days);
      if (r.ok) {
        setDaysSaved(true);
        setTimeout(() => setDaysSaved(false), 1500);
        router.refresh();
      } else notify(r.error || "خطأ", "error");
    });
  }

  return (
    <div className="space-y-6">
      {/* شطور الأداء */}
      <div className="card p-5">
        <h3 className="mb-1 text-base font-bold text-mushar-dark">
          شطور الأداء (العتبات والألوان)
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          حدّد متى يُعدّ الأداء «ممتاز/جيد/…» حسب نسبة التحقّق من المستهدف، ولون
          كل مستوى. تنعكس على كل الرسوم والبطاقات في المنصة.
        </p>

        {/* معاينة شريطية */}
        <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
          {sorted.map((b) => (
            <div
              key={b.id}
              className="h-full flex-1"
              style={{ backgroundColor: b.color }}
              title={`${b.label} ≥ ${b.min_pct}%`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {sorted.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-2.5"
            >
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-1"
                defaultValue={b.color}
                onBlur={(e) =>
                  e.target.value !== b.color && save(b.id, { color: e.target.value })
                }
              />
              <input
                className="input min-w-[140px] flex-1 py-1.5"
                defaultValue={b.label}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== b.label &&
                  save(b.id, { label: e.target.value.trim() })
                }
              />
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <span>من</span>
                <input
                  type="number"
                  className="input w-20 py-1.5"
                  defaultValue={b.min_pct}
                  onBlur={(e) =>
                    Number(e.target.value) !== b.min_pct &&
                    save(b.id, { min_pct: Number(e.target.value) })
                  }
                />
                <span>% فأعلى</span>
              </div>
              <button
                onClick={() => remove(b)}
                className="mr-auto rounded-lg p-2 text-mushar-accent hover:bg-mushar-accent/10"
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* إضافة شطر */}
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <div>
            <label className="label">المستوى</label>
            <input
              className="input"
              placeholder="مثال: مقبول"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="label">من نسبة %</label>
            <input
              type="number"
              className="input w-24"
              value={minPct}
              onChange={(e) => setMinPct(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">اللون</label>
            <input
              type="color"
              className="h-[42px] w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <button onClick={add} className="btn-primary gap-1.5">
            <Plus size={16} /> إضافة مستوى
          </button>
        </div>
      </div>

      {/* خيارات عامة */}
      <div className="card p-5">
        <h3 className="mb-1 text-base font-bold text-mushar-dark">خيارات عامة</h3>
        <p className="mb-4 text-xs text-slate-400">
          إعدادات إضافية لسلوك المؤشرات.
        </p>
        <label className="label">
          مهلة التذكير قبل انتهاء فترة القياس (بالأيام)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            className="input w-28"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <button onClick={saveDays} className="btn-primary">
            {daysSaved ? "✓ تم" : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
