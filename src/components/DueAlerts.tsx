import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { DueItem } from "@/lib/data";

export default function DueAlerts({ items }: { items: DueItem[] }) {
  if (items.length === 0) return null;
  const overdue = items.filter((i) => i.state === "overdue");
  const due = items.filter((i) => i.state === "due");

  return (
    <div className="card border-r-4 border-amber-400 p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-brand-dark">
          مؤشرات تحتاج إدخال نتيجة ({items.length})
        </h3>
      </div>
      <div className="space-y-2">
        {overdue.map((i) => (
          <Row key={i.kpi.id} item={i} />
        ))}
        {due.map((i) => (
          <Row key={i.kpi.id} item={i} />
        ))}
      </div>
      <Link
        href="/performance/review"
        className="mt-3 inline-block text-xs font-semibold text-brand-primary hover:underline"
      >
        الانتقال لإدخال النتائج ←
      </Link>
    </div>
  );
}

function Row({ item }: { item: DueItem }) {
  const overdue = item.state === "overdue";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-brand-dark">
          {item.kpi.name}
        </p>
        <p className="text-[11px] text-slate-400">
          {item.kpi.dimension?.name} · {item.periodLabel}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
          overdue
            ? "bg-brand-accent/10 text-brand-accent"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        <Clock size={12} />
        {overdue
          ? `متأخّر ${Math.abs(item.daysLeft)} يوم`
          : item.daysLeft === 0
          ? "ينتهي اليوم"
          : `يتبقّى ${item.daysLeft} يوم`}
      </span>
    </div>
  );
}
