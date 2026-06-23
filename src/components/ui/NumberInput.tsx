"use client";

import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";

/** حقل رقمي (Base UI) بأزرار زيادة/نقصان وحدود، RTL ووضع ليلي. */
export default function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  placeholder,
  className = "",
}: {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <NumberField.Root
      id={id}
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      className={className}
    >
      <NumberField.Group className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-pale dark:border-[#2b3d44] dark:bg-[#0f1d22]">
        <NumberField.Decrement className="flex w-8 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-brand-primary dark:hover:bg-[#15262d]">
          <Minus size={13} />
        </NumberField.Decrement>
        <NumberField.Input
          placeholder={placeholder}
          className="w-full min-w-0 border-x border-slate-200 bg-transparent px-1 py-2 text-center text-sm text-brand-dark outline-none dark:border-[#2b3d44] dark:text-[#e6eef0]"
        />
        <NumberField.Increment className="flex w-8 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-brand-primary dark:hover:bg-[#15262d]">
          <Plus size={13} />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
