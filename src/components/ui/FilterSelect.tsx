"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { popupClass, itemClass, triggerClass } from "@/components/ui/styles";

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
      <Select.Trigger aria-label={ariaLabel} className={`${triggerClass} ${className}`}>
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={15} className="text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start" className="z-[60]">
          <Select.Popup className={popupClass}>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className={itemClass}>
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={15} className="text-brand-primary" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
