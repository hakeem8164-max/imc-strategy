"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import type { SearchItem } from "@/lib/data";
import type { Role } from "@/lib/types";

type PageItem = { type: string; label: string; href: string; roles?: Role[] };

const PAGES: PageItem[] = [
  { type: "صفحة", label: "لوحة الأداء التنفيذية", href: "/" },
  { type: "صفحة", label: "لوحة الأداء التفصيلية", href: "/kpis" },
  { type: "صفحة", label: "أهداف الوقفين", href: "/awqaf" },
  { type: "صفحة", label: "الاجتماعات", href: "/meetings", roles: ["admin", "executive", "owner", "employee", "secretary"] },
  { type: "صفحة", label: "مهامّي", href: "/my-tasks", roles: ["admin", "executive", "owner", "employee"] },
  { type: "صفحة", label: "الأهداف الاستراتيجية (المكتبة)", href: "/admin/library", roles: ["admin"] },
  { type: "صفحة", label: "المبادرات", href: "/initiatives", roles: ["admin", "executive", "owner"] },
  { type: "صفحة", label: "متابعة المبادرات", href: "/initiatives/follow-up", roles: ["admin", "executive", "owner"] },
  { type: "صفحة", label: "طلبات التغيير", href: "/change-requests", roles: ["admin", "executive", "owner", "employee"] },
  { type: "صفحة", label: "المراجعة والاعتماد", href: "/performance/review", roles: ["admin", "owner"] },
  { type: "صفحة", label: "متابعة القرارات", href: "/performance/decisions", roles: ["admin", "executive", "owner", "employee"] },
  { type: "صفحة", label: "التقرير التنفيذي", href: "/report", roles: ["admin", "executive", "owner"] },
  { type: "صفحة", label: "إعدادات المؤشرات", href: "/performance/settings", roles: ["admin"] },
  { type: "صفحة", label: "الهيكل التنظيمي", href: "/admin/settings", roles: ["admin"] },
  { type: "صفحة", label: "المستخدمون", href: "/admin/users", roles: ["admin"] },
  { type: "صفحة", label: "الصلاحيات", href: "/admin/permissions", roles: ["admin"] },
  { type: "صفحة", label: "سجل التدقيق", href: "/admin/audit", roles: ["admin"] },
];

// تطبيع عربي بسيط: إزالة التشكيل وتوحيد الألف/الهاء/الياء للبحث المرن
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

export default function CommandPalette({
  items,
  role,
  open,
  onOpenChange,
}: {
  items: SearchItem[];
  role: Role;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // اختصار لوحة المفاتيح ⌘K / Ctrl+K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onOpenChange]);

  const all = useMemo<SearchItem[]>(
    () => [
      ...PAGES.filter((p) => !p.roles || p.roles.includes(role)).map((p) => ({
        type: p.type,
        label: p.label,
        href: p.href,
      })),
      ...items,
    ],
    [items, role]
  );

  const results = useMemo(() => {
    const nq = norm(q);
    if (!nq) return all.slice(0, 30);
    return all
      .filter((it) =>
        norm(`${it.label} ${it.sub ?? ""} ${it.keywords ?? ""}`).includes(nq)
      )
      .slice(0, 40);
  }, [q, all]);

  useEffect(() => setActive(0), [q, open]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(it: SearchItem) {
    onOpenChange(false);
    setQ("");
    router.push(it.href);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="card fixed left-1/2 top-[12vh] z-[61] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden p-0 outline-none dark:bg-mushar-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-mushar-line">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="ابحث عن مؤشر، مبادرة، اجتماع، أو صفحة…"
              className="w-full bg-transparent py-3.5 text-sm text-mushar-dark outline-none dark:text-mushar-ink"
            />
            <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-mushar-line">
              ESC
            </kbd>
          </div>
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                لا توجد نتائج لـ «{q}»
              </p>
            ) : (
              results.map((it, i) => (
                <button
                  key={`${it.href}-${i}`}
                  data-i={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm transition ${
                    i === active
                      ? "bg-mushar-pale/50 dark:bg-mushar-hover"
                      : "hover:bg-slate-50 dark:hover:bg-mushar-hover/50"
                  }`}
                >
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-mushar-line dark:text-mushar-ink/70">
                    {it.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-mushar-dark dark:text-mushar-ink">
                    {it.label}
                  </span>
                  {it.sub && (
                    <span className="shrink-0 text-xs text-slate-400">{it.sub}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
