"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mushar_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ يظهر كـ Mac مع لمس
  const iPadDesktop =
    /macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  return iDevice || iPadDesktop;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // تسجيل عامل الخدمة (لتمكين التثبيت)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return; // مثبَّت مسبقًا
    if (localStorage.getItem(DISMISS_KEY)) return; // تم تجاهله

    // أندرويد / كروم
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS: لا يدعم beforeinstallprompt — نعرض إرشادًا
    if (isIOS()) {
      setIosHint(true);
      setShow(true);
    }

    const onInstalled = () => {
      setShow(false);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferred(null);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] print:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-mushar-pale bg-white p-3 shadow-2xl">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mushar-dark">
          <Image src="/icon-192.png" alt="المساجد المتكاملة" width={48} height={48} />
        </div>

        {iosHint ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-mushar-dark">
              ثبّت تطبيق المساجد المتكاملة على جهازك
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              اضغط
              <Share size={13} className="inline text-mushar-primary" />
              «مشاركة» ثم
              <PlusSquare size={13} className="inline text-mushar-primary" />
              «إضافة إلى الشاشة الرئيسية»
            </p>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-mushar-dark">
              ثبّت تطبيق المساجد المتكاملة على جهازك
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              وصول أسرع كأيقونة تطبيق على شاشتك الرئيسية
            </p>
          </div>
        )}

        {!iosHint && (
          <button
            onClick={install}
            className="btn-primary shrink-0 gap-1.5 px-3 py-2 text-sm"
          >
            <Download size={16} />
            تثبيت
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="إغلاق"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
