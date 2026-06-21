"use client";

import { Printer, Maximize2 } from "lucide-react";

export default function PrintButton() {
  function present() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }
  return (
    <div className="flex items-center gap-2 print:hidden">
      <button onClick={present} className="btn-ghost gap-2 text-sm" title="وضع العرض التقديمي">
        <Maximize2 size={16} />
        عرض تقديمي
      </button>
      <button onClick={() => window.print()} className="btn-ghost gap-2 text-sm">
        <Printer size={16} />
        تصدير / طباعة PDF
      </button>
    </div>
  );
}
