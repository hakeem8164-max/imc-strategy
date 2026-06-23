import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Hourglass,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  check: CheckCircle2,
  clock: Clock,
  alert: AlertTriangle,
  hourglass: Hourglass,
  list: ClipboardList,
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "#8C341F",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  icon?: string;
}) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        {Icon ? (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            <Icon size={18} strokeWidth={2.2} />
          </span>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-brand-dark sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
