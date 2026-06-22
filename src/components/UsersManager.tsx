"use client";

import { useState, useTransition } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateUser } from "@/app/(app)/admin/users/actions";
import {
  OWNER_TITLES,
  ROLE_LABELS,
  type OrgUnit,
  type Profile,
  type Role,
} from "@/lib/types";

function genPassword() {
  // كلمة مرور مؤقتة قوية
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++)
    p += chars[Math.floor(Math.random() * chars.length)];
  return "Mushar@" + p;
}

export default function UsersManager({
  users,
  orgUnits,
  currentUserId,
}: {
  users: Profile[];
  orgUnits: OrgUnit[];
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const unitName = (id: string | null) =>
    id ? orgUnits.find((u) => u.id === id)?.name ?? "—" : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          إجمالي المستخدمين: <b>{users.length}</b>
        </p>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + إضافة مستخدم
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-right text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">الاسم / البريد</th>
              <th className="px-4 py-3 font-semibold">الدور</th>
              <th className="px-4 py-3 font-semibold">المنصب (للمالك)</th>
              <th className="px-4 py-3 font-semibold">الإدارة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  لا يوجد مستخدمون بعد.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  orgUnits={orgUnits}
                  unitName={unitName}
                  isSelf={u.id === currentUserId}
                  supabase={supabase}
                  router={router}
                  pending={pending}
                  startTransition={startTransition}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddUserModal
          orgUnits={orgUnits}
          onClose={() => setShowAdd(false)}
          supabase={supabase}
          onDone={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  orgUnits,
  unitName,
  isSelf,
  supabase,
  router,
  pending,
  startTransition,
}: any) {
  const [role, setRole] = useState<Role>(user.role);
  const [title, setTitle] = useState(user.title ?? "");
  const [name, setName] = useState(user.full_name ?? "");
  const [unit, setUnit] = useState(user.org_unit_id ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function save() {
    startTransition(async () => {
      const res = await updateUser(user.id, {
        role,
        title: role === "owner" ? title || null : null,
        full_name: name || null,
        org_unit_id: unit || null,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 1500);
      } else alert(res.error);
    });
  }

  async function del() {
    if (!confirm(`حذف المستخدم «${name || user.email}» نهائياً؟`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: user.id },
    });
    setBusy(false);
    if (error || data?.error) alert(data?.error || "تعذّر الحذف");
    else router.refresh();
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <input
          className="input py-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم"
        />
        <p className="mt-1 text-xs text-slate-400">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <FilterSelect
          className="w-full"
          value={role ?? ""}
          onValueChange={(v) => setRole(v as Role)}
          options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
            value: r,
            label: ROLE_LABELS[r],
          }))}
        />
      </td>
      <td className="px-4 py-3">
        <FilterSelect
          className="w-full"
          value={title ?? ""}
          onValueChange={(v) => setTitle(v)}
          disabled={role !== "owner"}
          options={[
            { value: "", label: "— بدون —" },
            ...OWNER_TITLES.map((t) => ({ value: t, label: t })),
          ]}
        />
      </td>
      <td className="px-4 py-3">
        <FilterSelect
          className="w-full"
          value={unit ?? ""}
          onValueChange={(v) => setUnit(v)}
          options={[
            { value: "", label: "— بدون —" },
            ...orgUnits.map((o: OrgUnit) => ({ value: o.id, label: o.name })),
          ]}
        />
      </td>
      <td className="px-4 py-3 text-left">
        <div className="flex justify-end gap-1">
          <button
            onClick={save}
            disabled={pending}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {saved ? "✓" : "حفظ"}
          </button>
          {!isSelf && (
            <button
              onClick={del}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-mushar-accent hover:bg-mushar-accent/10"
            >
              حذف
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddUserModal({ orgUnits, onClose, onDone, supabase }: any) {
  const [mode, setMode] = useState<"create" | "invite">("create");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function submit() {
    setBusy(true);
    setResult(null);
    const common = {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role,
      title: role === "owner" ? title || null : null,
      org_unit_id: unit || null,
    };
    if (mode === "create") {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { ...common, password },
      });
      setBusy(false);
      if (error || data?.error) {
        setResult({ ok: false, text: data?.error || "تعذّر الإنشاء" });
      } else {
        setResult({
          ok: true,
          text: `تم إنشاء الحساب ✓ — البريد: ${common.email} | كلمة المرور المؤقتة: ${password} (سيُطلب تغييرها أول دخول). انسخها وسلّمها للمستخدم.`,
        });
      }
    } else {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { ...common, redirect_to: `${window.location.origin}/login` },
      });
      setBusy(false);
      if (error || data?.error) {
        setResult({ ok: false, text: data?.error || "تعذّر الإرسال" });
      } else {
        setResult({
          ok: true,
          text: data?.warning || "تم إرسال بريد الدعوة ✓",
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-mushar-dark">إضافة مستخدم</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === "create"
                ? "bg-white text-mushar-primary shadow-sm"
                : "text-slate-500"
            }`}
          >
            إنشاء حساب مباشر
          </button>
          <button
            onClick={() => setMode("invite")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === "invite"
                ? "bg-white text-mushar-primary shadow-sm"
                : "text-slate-500"
            }`}
          >
            دعوة عبر البريد
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@mushar.sa"
            />
          </div>
          <div>
            <label className="label">الاسم الكامل</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">الدور</label>
              <FilterSelect
                className="w-full"
                value={role ?? ""}
                onValueChange={(v) => setRole(v as Role)}
                options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r],
                }))}
              />
            </div>
            <div>
              <label className="label">الإدارة</label>
              <FilterSelect
                className="w-full"
                value={unit ?? ""}
                onValueChange={(v) => setUnit(v)}
                options={[
                  { value: "", label: "— بدون —" },
                  ...orgUnits.map((o: OrgUnit) => ({ value: o.id, label: o.name })),
                ]}
              />
            </div>
          </div>
          {role === "owner" && (
            <div>
              <label className="label">المنصب (لربط المؤشرات)</label>
              <FilterSelect
                className="w-full"
                value={title ?? ""}
                onValueChange={(v) => setTitle(v)}
                options={[
                  { value: "", label: "— اختر منصبًا —" },
                  ...OWNER_TITLES.map((t) => ({ value: t, label: t })),
                ]}
              />
            </div>
          )}
          {mode === "create" && (
            <div>
              <label className="label">كلمة المرور المؤقتة</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  onClick={() => setPassword(genPassword())}
                  className="btn-ghost whitespace-nowrap"
                  type="button"
                >
                  توليد
                </button>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div
            className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${
              result.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-mushar-accent/10 text-mushar-accent"
            }`}
          >
            {result.text}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            {result?.ok ? "إغلاق" : "إلغاء"}
          </button>
          {!result?.ok && (
            <button onClick={submit} disabled={busy} className="btn-primary">
              {busy
                ? "جارٍ…"
                : mode === "create"
                ? "إنشاء الحساب"
                : "إرسال الدعوة"}
            </button>
          )}
          {result?.ok && (
            <button onClick={onDone} className="btn-primary">
              تم
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
