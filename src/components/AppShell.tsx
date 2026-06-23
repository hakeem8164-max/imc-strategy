"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import type { Profile, Role } from "@/lib/types";
import type { SearchItem } from "@/lib/data";

export default function AppShell({
  profile,
  orgName,
  role,
  searchItems = [],
  children,
}: {
  profile: Profile;
  orgName: string;
  role: Role;
  searchItems?: SearchItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const pathname = usePathname();

  // إغلاق القائمة الجانبية عند تغيّر الصفحة (على الجوال)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f1f4f4] dark:bg-[#0b1416]">
      <TopBar
        profile={profile}
        orgName={orgName}
        onMenu={() => setOpen(true)}
        onSearch={() => setCmdOpen(true)}
      />
      <div className="mx-auto flex max-w-[1500px] gap-5 px-4 py-5 lg:px-5">
        <Sidebar role={role} mobileOpen={open} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <CommandPalette
        items={searchItems}
        role={role}
        open={cmdOpen}
        onOpenChange={setCmdOpen}
      />
    </div>
  );
}
