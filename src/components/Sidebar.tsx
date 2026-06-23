"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  ClipboardList,
  Target,
  BookOpen,
  ClipboardCheck,
  Gavel,
  FileText,
  SlidersHorizontal,
  Settings,
  Building2,
  Users,
  KeyRound,
  ScrollText,
  Landmark,
  CalendarCheck,
  Rocket,
  GanttChartSquare,
  GitPullRequestArrow,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

type Item = { href: string; label: string; icon: LucideIcon; roles?: Role[] };

const NAV: Item[] = [
  { href: "/", label: "لوحة الأداء التنفيذية", icon: LayoutDashboard },
  { href: "/kpis", label: "لوحة الأداء التفصيلية", icon: ClipboardList },
  { href: "/awqaf", label: "أهداف الوقفين", icon: Landmark },
  {
    href: "/meetings",
    label: "الاجتماعات",
    icon: CalendarCheck,
    roles: ["admin", "executive", "owner", "employee", "secretary"],
  },
  {
    href: "/my-tasks",
    label: "مهامّي",
    icon: ListTodo,
    roles: ["admin", "executive", "owner", "employee"],
  },
];

const PERFORMANCE_NAV: Item[] = [
  { href: "/admin/library", label: "الأهداف الاستراتيجية", icon: BookOpen, roles: ["admin"] },
  {
    href: "/initiatives",
    label: "المبادرات",
    icon: Rocket,
    roles: ["admin", "executive", "owner"],
  },
  {
    href: "/initiatives/follow-up",
    label: "متابعة المبادرات",
    icon: GanttChartSquare,
    roles: ["admin", "executive", "owner"],
  },
  {
    href: "/change-requests",
    label: "طلبات التغيير",
    icon: GitPullRequestArrow,
    roles: ["admin", "executive", "owner", "employee"],
  },
  {
    href: "/performance/review",
    label: "المراجعة والاعتماد",
    icon: ClipboardCheck,
    roles: ["admin", "owner"],
  },
  {
    href: "/performance/decisions",
    label: "متابعة القرارات",
    icon: Gavel,
    roles: ["admin", "executive", "owner", "employee"],
  },
  {
    href: "/report",
    label: "التقرير التنفيذي",
    icon: FileText,
    roles: ["admin", "executive", "owner"],
  },
  {
    href: "/performance/settings",
    label: "إعدادات المؤشرات",
    icon: SlidersHorizontal,
    roles: ["admin"],
  },
];

const SETTINGS_NAV: Item[] = [
  { href: "/admin/settings", label: "الهيكل التنظيمي", icon: Building2 },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/permissions", label: "الصلاحيات", icon: KeyRound },
  { href: "/admin/audit", label: "سجل التدقيق", icon: ScrollText },
];

function NavLinks({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  const perfItems = PERFORMANCE_NAV.filter(
    (i) => !i.roles || i.roles.includes(role)
  );
  const showSettings = role === "admin";

  const itemCls = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-mushar-primary text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  const navItems = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <>
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            prefetch={false}
            className={itemCls(active)}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}

      {perfItems.length > 0 && (
        <CollapsibleGroup
          label="التوجهات الاستراتيجية"
          icon={Target}
          items={perfItems}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      )}

      {showSettings && (
        <CollapsibleGroup
          label="الإعدادات"
          icon={Settings}
          items={SETTINGS_NAV}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

export default function Sidebar({
  role,
  mobileOpen = false,
  onClose,
}: {
  role: Role;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* سطح المكتب */}
      <aside className="hidden w-64 shrink-0 lg:block print:hidden">
        <nav className="card sticky top-[84px] space-y-1 p-2.5">
          <NavLinks role={role} pathname={pathname} />
        </nav>
      </aside>

      {/* الجوال: قائمة منزلقة */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[82%] flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Image
                src="/mushar-logo.png"
                alt="المساجد المتكاملة"
                width={84}
                height={50}
                className="h-auto w-[70px]"
              />
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1 p-2.5">
              <NavLinks role={role} pathname={pathname} onNavigate={onClose} />
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

function CollapsibleGroup({
  label,
  icon: GroupIcon,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: LucideIcon;
  items: Item[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = items.some((i) => pathname.startsWith(i.href));
  const [open, setOpen] = useState(groupActive);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
          groupActive ? "text-mushar-primary" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <GroupIcon size={18} strokeWidth={2} />
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={`mr-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-r-2 border-mushar-pale pr-2">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                prefetch={false}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2 text-[13px] transition ${
                  active
                    ? "bg-mushar-primary text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
