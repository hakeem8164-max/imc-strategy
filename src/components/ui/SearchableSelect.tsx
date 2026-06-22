"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";

export type SearchOption = { value: string; label: string };

/**
 * قائمة اختيار قابلة للبحث (Combobox من Base UI) بواجهة مطابقة لـ FilterSelect.
 * مناسبة للقوائم الطويلة (المالك، الهدف، العنصر…).
 */
export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "— اختر —",
  className = "",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(item: SearchOption | null) =>
        onValueChange(item?.value ?? "")
      }
      itemToStringLabel={(o: SearchOption) => o.label}
    >
      <div className={`relative ${className}`}>
        <Combobox.Input
          placeholder={placeholder}
          className="input w-full pe-9"
        />
        <Combobox.Trigger
          aria-label="فتح القائمة"
          className="absolute inset-y-0 left-2 flex items-center text-slate-400"
        >
          <ChevronDown size={15} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="z-[60]">
          <Combobox.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-cardHover outline-none dark:border-[#24343b] dark:bg-[#13232a]">
            <Combobox.Empty className="px-3 py-3 text-center text-xs text-slate-400">
              لا نتائج مطابقة
            </Combobox.Empty>
            <Combobox.List>
              {(o: SearchOption) => (
                <Combobox.Item
                  key={o.value}
                  value={o}
                  className="flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-mushar-dark outline-none data-[highlighted]:bg-mushar-pale dark:text-[#e6eef0] dark:data-[highlighted]:bg-[#1b2d34]"
                >
                  <span>{o.label}</span>
                  <Combobox.ItemIndicator>
                    <Check size={15} className="text-mushar-primary" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
