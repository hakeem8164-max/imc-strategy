"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { Dimension, OrgUnit } from "@/lib/types";

export default function DashboardFilters({
  dimensions,
  orgUnits,
  periods,
}: {
  dimensions: Dimension[];
  orgUnits: OrgUnit[];
  periods: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const period = sp.get("period") ?? "";
  const dim = sp.get("dim") ?? "";
  const unit = sp.get("unit") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const active = period || dim || unit;
  const selCls = "input py-2 text-sm";

  return (
    <div className="card flex flex-wrap items-center gap-2 p-3 print:hidden">
      <span className="px-1 text-xs font-semibold text-slate-400">تصفية:</span>
      <select
        className={`${selCls} w-auto`}
        value={period}
        onChange={(e) => setParam("period", e.target.value)}
      >
        <option value="">آخر فترة (مقارنة بالسابقة)</option>
        {periods.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        className={`${selCls} w-auto`}
        value={dim}
        onChange={(e) => setParam("dim", e.target.value)}
      >
        <option value="">كل المناظير</option>
        {dimensions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        className={`${selCls} w-auto`}
        value={unit}
        onChange={(e) => setParam("unit", e.target.value)}
      >
        <option value="">كل الإدارات</option>
        {orgUnits.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {active && (
        <button
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mushar-accent hover:underline"
        >
          <RotateCcw size={13} /> إعادة تعيين
        </button>
      )}
    </div>
  );
}
