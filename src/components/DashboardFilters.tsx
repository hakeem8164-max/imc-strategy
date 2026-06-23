"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
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

  return (
    <div className="card flex flex-wrap items-center gap-2 p-3 print:hidden">
      <span className="px-1 text-xs font-semibold text-slate-400">تصفية:</span>
      <FilterSelect
        ariaLabel="الفترة"
        value={period}
        onValueChange={(v) => setParam("period", v)}
        options={[
          { value: "", label: "آخر فترة (مقارنة بالسابقة)" },
          ...periods.map((p) => ({ value: p, label: p })),
        ]}
      />
      <FilterSelect
        ariaLabel="المنظور"
        value={dim}
        onValueChange={(v) => setParam("dim", v)}
        options={[
          { value: "", label: "كل المناظير" },
          ...dimensions.map((d) => ({ value: d.id, label: d.name })),
        ]}
      />
      <FilterSelect
        ariaLabel="الإدارة"
        value={unit}
        onValueChange={(v) => setParam("unit", v)}
        options={[
          { value: "", label: "كل الإدارات" },
          ...orgUnits.map((u) => ({ value: u.id, label: u.name })),
        ]}
      />
      {active && (
        <button
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
        >
          <RotateCcw size={13} /> إعادة تعيين
        </button>
      )}
    </div>
  );
}
