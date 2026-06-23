"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { LogOut, Menu, KeyRound, ChevronDown } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import Tip from "@/components/ui/Tip";
import { popupMotion } from "@/components/ui/styles";
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
    <header className="sticky top-0 z-30 bg-gradient-to-l from-brand-dark via-brand-primary to-brand-dark text-white shadow-sm print:hidden">
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
          <div>
            <h1 className="text-sm font-extrabold leading-tight sm:text-base">
              نظام إدارة الأداء
            </h1>
            <p className="hidden text-[11px] text-brand-pale/70 sm:block">
              {orgName}
            </p>
          </div>
        </div>

        {/* يسار: الجرس والثيم وقائمة المستخدم */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Tip content="تبديل المظهر">
            <ThemeToggle />
          </Tip>
          <Tip content="الإشعارات">
            <NotificationBell />
          </Tip>
          <MenuPrimitive.Root>
            <MenuPrimitive.Trigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none transition hover:bg-white/10 data-[popup-open]:bg-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-mint/20 text-sm font-bold text-brand-mint">
                {initials}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-tight">{name}</p>
                <p className="text-[11px] text-brand-mint">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
              <ChevronDown size={15} className="text-white/70" />
            </MenuPrimitive.Trigger>
            <MenuPrimitive.Portal>
              <MenuPrimitive.Positioner sideOffset={8} align="end" className="z-[70]">
                <MenuPrimitive.Popup className={`min-w-[200px] rounded-xl border border-slate-100 bg-white p-1 text-brand-dark shadow-cardHover outline-none dark:border-brand-line dark:bg-brand-surface dark:text-brand-ink ${popupMotion}`}>
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-brand-line">
                    <p className="text-sm font-bold">{name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                  <MenuPrimitive.Item
                    onClick={() => router.push("/account/password")}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-brand-pale dark:data-[highlighted]:bg-brand-hover"
                  >
                    <KeyRound size={15} className="text-slate-400" />
                    تغيير كلمة المرور
                  </MenuPrimitive.Item>
                  <MenuPrimitive.Item
                    onClick={signOut}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-accent outline-none data-[highlighted]:bg-brand-accent/10"
                  >
                    <LogOut size={15} />
                    تسجيل الخروج
                  </MenuPrimitive.Item>
                </MenuPrimitive.Popup>
              </MenuPrimitive.Positioner>
            </MenuPrimitive.Portal>
          </MenuPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
