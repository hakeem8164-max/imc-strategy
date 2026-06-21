"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError("تعذّر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-mushar-dark via-mushar-primary to-mushar-teal p-4">
      <div className="w-full max-w-md">
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center gap-4 border-b border-slate-100 bg-white px-8 pt-10 pb-6">
            <Image
              src="/mushar-logo.png"
              alt="المساجد المتكاملة"
              width={300}
              height={170}
              priority
              className="h-auto w-[180px]"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-mushar-dark">
                منصة إدارة مؤشرات الأداء
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                سجّل الدخول للوصول إلى مؤشراتك ولوحة المعلومات
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 px-8 py-8">
            <div>
              <label className="label" htmlFor="email">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="name@mushar.sa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-mushar-accent/10 px-3 py-2.5 text-sm text-mushar-accent">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-white/70">
          © {new Date().getFullYear()} شركة المساجد المتكاملة — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
