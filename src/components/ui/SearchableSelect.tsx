"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";
import { popupClass, itemClass, fieldClass } from "@/components/ui/styles";

export type SearchOption = { value: string; label: string };

/**
 * قائمة اختيار قابلة للبحث (Combobox من Base UI) بواجهة مطابقة لـ FilterSelect.
 * مناسبة للقوائم الطويلة (المالك، الهدف، العنصر…) مع زر مسح وحالة فارغة.
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
        <Combobox.Input placeholder={placeholder} className={`${fieldClass} pe-14`} />
        <div className="absolute inset-y-0 left-2 flex items-center gap-0.5">
          {selected && (
            <Combobox.Clear
              aria-label="مسح"
              className="rounded p-1 text-slate-400 transition hover:text-mushar-accent"
            >
              <X size={14} />
            </Combobox.Clear>
          )}
          <Combobox.Trigger aria-label="فتح القائمة" className="text-slate-400">
            <ChevronDown size={15} />
          </Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="z-[60]">
          <Combobox.Popup className={popupClass}>
            <Combobox.Empty className="px-3 py-3 text-center text-xs text-slate-400">
              لا نتائج مطابقة
            </Combobox.Empty>
            <Combobox.List>
              {(o: SearchOption) => (
                <Combobox.Item key={o.value} value={o} className={itemClass}>
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
