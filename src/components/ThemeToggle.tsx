"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("brand_theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "الوضع النهاري" : "الوضع الليلي"}
      title={dark ? "الوضع النهاري" : "الوضع الليلي"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/90 transition hover:bg-white/10"
    >
      {/* تفادي وميض الأيقونة قبل التحميل */}
      {mounted && (dark ? <Sun size={17} /> : <Moon size={17} />)}
    </button>
  );
}
