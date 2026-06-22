"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import { Bell, Check, ChevronDown } from "lucide-react";

const units = [
  { label: "إدارة المساجد", value: "mosques" },
  { label: "الأوقاف", value: "awqaf" },
  { label: "المبادرات", value: "initiatives" },
  { label: "التقارير", value: "reports" },
];

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 className="text-base font-bold text-mushar-dark">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">{desc}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function BaseUiDemoPage() {
  const [notify, setNotify] = useState(true);

  return (
    <div className="min-h-screen bg-mushar-cream p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-right">
          <h1 className="text-2xl font-extrabold text-mushar-dark">
            معاينة مكوّنات Base UI
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            مكوّنات MUI Base UI منسّقة بألوان هوية المنصة مع دعم RTL.
          </p>
        </header>

        {/* Dialog */}
        <Section
          title="نافذة حوار · Dialog"
          desc="نافذة منبثقة مع إدارة تركيز وإغلاق بـ Escape تلقائياً."
        >
          <Dialog.Root>
            <Dialog.Trigger className="inline-flex h-10 items-center justify-center rounded-lg bg-mushar-primary px-4 text-sm font-medium text-white transition hover:bg-mushar-dark">
              فتح نافذة
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
              <Dialog.Popup className="fixed left-1/2 top-1/2 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 text-right shadow-cardHover outline-none transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
                <Dialog.Title className="text-lg font-bold text-mushar-dark">
                  تأكيد العملية
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-slate-600">
                  هل تريد حفظ التغييرات على مؤشر الأداء؟
                </Dialog.Description>
                <div className="mt-6 flex justify-start gap-2">
                  <Dialog.Close className="inline-flex h-9 items-center rounded-lg bg-mushar-primary px-4 text-sm text-white hover:bg-mushar-dark">
                    حفظ
                  </Dialog.Close>
                  <Dialog.Close className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50">
                    إلغاء
                  </Dialog.Close>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </Section>

        {/* Popover */}
        <Section
          title="قائمة منبثقة · Popover"
          desc="مثل جرس الإشعارات — تموضع ذكي يتجنّب حواف الشاشة."
        >
          <Popover.Root>
            <Popover.Trigger className="relative flex h-10 w-10 items-center justify-center rounded-full bg-mushar-pale text-mushar-dark transition hover:bg-mushar-light">
              <Bell size={18} />
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mushar-accent px-1 text-[10px] font-bold text-white">
                3
              </span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="end">
                <Popover.Popup className="w-72 origin-[var(--transform-origin)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-cardHover outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-mushar-dark">
                    الإشعارات
                  </div>
                  <div className="px-4 py-3 text-right">
                    <p className="text-sm font-semibold text-mushar-dark">
                      مؤشر جديد بانتظار المراجعة
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      أُضيف مؤشر «نسبة الحضور» للوحدة.
                    </p>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </Section>

        {/* Select */}
        <Section
          title="قائمة اختيار · Select"
          desc="بديل منسّق بالكامل عن <select> الأصلي، يدعم RTL ولوحة المفاتيح."
        >
          <Select.Root defaultValue="mosques" items={units}>
            <Select.Trigger className="inline-flex h-10 min-w-48 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-mushar-dark outline-none hover:bg-slate-50 data-[popup-open]:border-mushar-primary">
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={16} className="text-slate-400" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={6} align="start">
                <Select.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-xl border border-slate-100 bg-white p-1 shadow-cardHover outline-none transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                  {units.map((u) => (
                    <Select.Item
                      key={u.value}
                      value={u.value}
                      className="flex cursor-default items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-mushar-dark outline-none data-[highlighted]:bg-mushar-pale"
                    >
                      <Select.ItemText>{u.label}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check size={15} className="text-mushar-primary" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </Section>

        {/* Switch */}
        <Section
          title="مفتاح تبديل · Switch"
          desc="مفتاح وصول كامل ARIA لتفعيل الإعدادات."
        >
          <label className="flex items-center gap-3 text-sm text-mushar-dark">
            <Switch.Root
              checked={notify}
              onCheckedChange={setNotify}
              className="relative h-6 w-11 rounded-full bg-slate-300 outline-none transition data-[checked]:bg-mushar-primary"
            >
              <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:-translate-x-[1.375rem]" />
            </Switch.Root>
            تفعيل إشعارات البريد {notify ? "(مفعّل)" : "(معطّل)"}
          </label>
        </Section>

        {/* Tabs */}
        <Section
          title="تبويبات · Tabs"
          desc="تنقّل بالأسهم بين التبويبات مع مؤشر متحرك."
        >
          <Tabs.Root defaultValue="daily" className="w-full">
            <Tabs.List className="relative flex gap-1 rounded-xl bg-mushar-pale p-1">
              {[
                { v: "daily", t: "يومي" },
                { v: "weekly", t: "أسبوعي" },
                { v: "monthly", t: "شهري" },
              ].map((tab) => (
                <Tabs.Tab
                  key={tab.v}
                  value={tab.v}
                  className="z-10 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-mushar-dark outline-none transition data-[selected]:bg-white data-[selected]:shadow-card"
                >
                  {tab.t}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Tabs.Panel value="daily" className="p-4 text-sm text-slate-600">
              عرض الأداء اليومي للوحدات.
            </Tabs.Panel>
            <Tabs.Panel value="weekly" className="p-4 text-sm text-slate-600">
              عرض الأداء الأسبوعي للوحدات.
            </Tabs.Panel>
            <Tabs.Panel value="monthly" className="p-4 text-sm text-slate-600">
              عرض الأداء الشهري للوحدات.
            </Tabs.Panel>
          </Tabs.Root>
        </Section>
      </div>
    </div>
  );
}
