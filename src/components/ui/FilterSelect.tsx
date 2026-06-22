"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

/**
 * قائمة اختيار مبنية بـ Base UI كبديل عن <select> الأصلي.
 * تدعم RTL، لوحة المفاتيح، والوضع الليلي، ومنسّقة بهوية المنصة.
 */
export default function FilterSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onValueChange((v as string) ?? "")}
      items={options}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={`inline-flex h-[42px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-mushar-dark outline-none transition hover:border-slate-300 focus:border-mushar-primary focus:ring-2 focus:ring-mushar-pale data-[popup-open]:border-mushar-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2b3d44] dark:bg-[#0f1d22] dark:text-[#e6eef0] ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={15} className="text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start" className="z-[60]">
          <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-cardHover outline-none transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:border-[#24343b] dark:bg-[#13232a]">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-mushar-dark outline-none data-[highlighted]:bg-mushar-pale dark:text-[#e6eef0] dark:data-[highlighted]:bg-[#1b2d34]"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={15} className="text-mushar-primary" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
