"use client";

import { Switch } from "@base-ui/react/switch";

/** مفتاح تبديل (Base UI) — RTL ووصولية كاملة. */
export default function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  title,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      title={title}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 outline-none transition focus-visible:ring-2 focus-visible:ring-mushar-pale data-[checked]:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Switch.Thumb className="block h-5 w-5 translate-x-[-2px] rounded-full bg-white shadow transition-transform data-[checked]:translate-x-[-22px]" />
    </Switch.Root>
  );
}
