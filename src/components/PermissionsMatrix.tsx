"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPermission } from "@/app/(app)/admin/permissions/actions";
import { notify } from "@/components/ui/toast";
import { PERMISSIONS, ROLE_LABELS, type Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "executive", "owner", "viewer"];

export default function PermissionsMatrix({
  initial,
}: {
  initial: { role: string; permission: string; allowed: boolean }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const p of initial) m[`${p.role}:${p.permission}`] = p.allowed;
    return m;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function toggle(role: Role, perm: string) {
    if (role === "admin") return; // المدير صلاحياته كاملة دائماً
    const key = `${role}:${perm}`;
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    setSavingKey(key);
    startTransition(async () => {
      const res = await setPermission(role, perm, next);
      setSavingKey(null);
      if (!res.ok) {
        setState((s) => ({ ...s, [key]: !next })); // تراجع
        notify(res.error || "خطأ", "error");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 text-right font-semibold">الصلاحية</th>
            {ROLES.map((r) => (
              <th key={r} className="px-4 py-3 text-center font-semibold">
                {ROLE_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSIONS.map((perm) => (
            <tr key={perm.key} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-mushar-dark">
                {perm.label}
              </td>
              {ROLES.map((role) => {
                const key = `${role}:${perm.key}`;
                const checked = role === "admin" ? true : !!state[key];
                const locked = role === "admin";
                return (
                  <td key={role} className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(role, perm.key)}
                      disabled={locked || savingKey === key}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        checked ? "bg-mushar-primary" : "bg-slate-300"
                      } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
                      title={locked ? "مدير النظام: صلاحية كاملة دائماً" : ""}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          checked ? "-translate-x-0.5" : "-translate-x-5"
                        }`}
                      />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
