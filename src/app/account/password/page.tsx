"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (error) {
      setError("تعذّر تحديث كلمة المرور: " + error.message);
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-brand-dark via-brand-primary to-brand-teal p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="الشعار"
            width={130}
            height={78}
            priority
            className="h-auto w-[130px]"
          />
          <h1 className="text-xl font-bold text-brand-dark">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-sm text-slate-500">
            هذا أول دخول لك — يُرجى تعيين كلمة مرور خاصة بك للمتابعة.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">تأكيد كلمة المرور</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-brand-accent/10 px-3 py-2.5 text-sm text-brand-accent">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارٍ الحفظ…" : "حفظ ومتابعة"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );
}
