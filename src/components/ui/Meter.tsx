import { Meter as BaseMeter } from "@base-ui/react/meter";

/**
 * شريط تقدّم/قياس نسبة الإنجاز — مبني على Base UI Meter.
 * يضيف دلالة وصول (role=meter + aria-valuenow) لقارئات الشاشة بدل div بعرض %.
 */
export default function Meter({
  value,
  color = "#0D9488",
  height = "h-1.5",
  trackClassName = "bg-slate-100",
  label,
}: {
  value: number; // 0..100
  color?: string;
  height?: string;
  trackClassName?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <BaseMeter.Root value={v} aria-label={label ?? "نسبة الإنجاز"}>
      <BaseMeter.Track
        className={`block ${height} w-full overflow-hidden rounded-full ${trackClassName}`}
      >
        <BaseMeter.Indicator
          className="block h-full rounded-full transition-all"
          style={{ backgroundColor: color }}
        />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}
