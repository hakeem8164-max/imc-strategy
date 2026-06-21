"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { ROLE_LABELS, type Profile } from "@/lib/types";

export default function TopBar({
  profile,
  orgName,
  onMenu,
}: {
  profile: Profile;
  orgName: string;
  onMenu?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const name = profile.full_name || profile.email || "مستخدم";
  const initials = name.trim().charAt(0);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-l from-mushar-dark via-mushar-primary to-mushar-dark text-white shadow-sm print:hidden">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-3">
        {/* يمين: زر القائمة (جوال) + الشعار واسم المنصة */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenu}
            aria-label="القائمة"
            className="rounded-lg border border-white/20 p-2 text-white/90 transition hover:bg-white/10 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <Image
            src="/mushar-logo-light.png"
            alt="المساجد المتكاملة"
            width={300}
            height={170}
            priority
            className="h-auto w-[120px] sm:w-[150px]"
          />
          <div className="border-r border-white/15 pr-3">
            <h1 className="text-sm font-extrabold leading-tight sm:text-base">
              منصة المساجد المتكاملة لإدارة الأداء
            </h1>
            <p className="hidden text-[11px] text-mushar-pale/70 sm:block">
              {orgName}
            </p>
          </div>
        </div>

        {/* يسار: المستخدم والجرس والخروج */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
          >
            <LogOut size={14} />
            خروج
          </button>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-bold leading-tight">{name}</p>
            <p className="text-[11px] text-mushar-mint">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <ThemeToggle />
          <NotificationBell />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mushar-mint/20 text-sm font-bold text-mushar-mint">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
