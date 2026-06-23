"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { LogOut, Menu, KeyRound, ChevronDown, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import Tip from "@/components/ui/Tip";
import { popupMotion } from "@/components/ui/styles";
import { ROLE_LABELS, type Profile } from "@/lib/types";

export default function TopBar({
  profile,
  orgName,
  onMenu,
  onSearch,
}: {
  profile: Profile;
  orgName: string;
  onMenu?: () => void;
  onSearch?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const name = profile.full_name || profile.email || "مستخدم";
  const initials = name.trim().charAt(0);
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);

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

        {/* يسار: البحث والجرس والثيم وقائمة المستخدم */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onSearch}
            aria-label="بحث"
            className="flex items-center gap-2 rounded-lg border border-white/20 px-2 py-2 text-white/90 transition hover:bg-white/10 sm:px-3"
          >
            <Search size={18} />
            <span className="hidden text-xs text-white/70 lg:inline">
              بحث… <kbd className="rounded bg-white/15 px-1">{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </span>
          </button>
          <Tip content="تبديل المظهر">
            <ThemeToggle />
          </Tip>
          <Tip content="الإشعارات">
            <NotificationBell />
          </Tip>
          <MenuPrimitive.Root>
            <MenuPrimitive.Trigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none transition hover:bg-white/10 data-[popup-open]:bg-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mushar-mint/20 text-sm font-bold text-mushar-mint">
                {initials}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-tight">{name}</p>
                <p className="text-[11px] text-mushar-mint">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
              <ChevronDown size={15} className="text-white/70" />
            </MenuPrimitive.Trigger>
            <MenuPrimitive.Portal>
              <MenuPrimitive.Positioner sideOffset={8} align="end" className="z-[70]">
                <MenuPrimitive.Popup className={`min-w-[200px] rounded-xl border border-slate-100 bg-white p-1 text-mushar-dark shadow-cardHover outline-none dark:border-mushar-line dark:bg-mushar-surface dark:text-mushar-ink ${popupMotion}`}>
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-mushar-line">
                    <p className="text-sm font-bold">{name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                  <MenuPrimitive.Item
                    onClick={() => router.push("/account/password")}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-mushar-pale dark:data-[highlighted]:bg-mushar-hover"
                  >
                    <KeyRound size={15} className="text-slate-400" />
                    تغيير كلمة المرور
                  </MenuPrimitive.Item>
                  <MenuPrimitive.Item
                    onClick={signOut}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-mushar-accent outline-none data-[highlighted]:bg-mushar-accent/10"
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
