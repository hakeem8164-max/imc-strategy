"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "lucide-react";
import { markAllRead } from "@/app/(app)/notifications-actions";
import type { Notification } from "@/lib/types";

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markAllRead();
      setItems((s) => s.map((n) => ({ ...n, is_read: true })));
    }
  }

  function go(link: string | null) {
    setOpen(false);
    if (link) {
      router.push(link);
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
        title="الإشعارات"
      >
        <Bell size={19} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mushar-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-20 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-cardHover">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-mushar-dark">
            الإشعارات
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                لا توجد إشعارات
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.link)}
                  className="block w-full border-b border-slate-50 px-4 py-3 text-right transition last:border-0 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-mushar-dark">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-300">
                    {new Date(n.created_at).toLocaleString("ar-SA-u-nu-latn")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
