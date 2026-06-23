"use client";

import { Field } from "@base-ui/react/field";

/**
 * حقول نماذج مبنية على Base UI Field — تربط التسمية بالحقل تلقائيًّا،
 * وتعرض رسائل التحقق مع aria-describedby، وتدعم required/disabled و RTL.
 */

type Common = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** رسالة الخطأ عند ترك الحقل المطلوب فارغًا */
  requiredMessage?: string;
};

export function TextField({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  type = "text",
  requiredMessage = "هذا الحقل مطلوب",
}: Common & { type?: string }) {
  return (
    <Field.Root className="w-full">
      <Field.Label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Field.Label>
      <Field.Control
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="input"
      />
      <Field.Error className="mt-1 block text-xs text-red-600" match="valueMissing">
        {requiredMessage}
      </Field.Error>
    </Field.Root>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  minHeight = "min-h-[70px]",
  requiredMessage = "هذا الحقل مطلوب",
}: Common & { minHeight?: string }) {
  return (
    <Field.Root className="w-full">
      <Field.Label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Field.Label>
      <Field.Control
        render={<textarea />}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={`input ${minHeight}`}
      />
      <Field.Error className="mt-1 block text-xs text-red-600" match="valueMissing">
        {requiredMessage}
      </Field.Error>
    </Field.Root>
  );
}
