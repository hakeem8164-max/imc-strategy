import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getProfile, getAuditLog, type AuditEntry } from "@/lib/data";

const ACTION_LABEL: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};
const ACTION_STYLE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-mushar-accent/10 text-mushar-accent",
};
const ENTITY_LABEL: Record<string, string> = {
  kpis: "مؤشر",
  dimensions: "منظور",
  objectives: "هدف",
  kpi_entries: "قياس",
  org_units: "وحدة تنظيمية",
  org_unit_types: "نوع وحدة",
  role_permissions: "صلاحية",
  profiles: "مستخدم",
  invitations: "دعوة",
};

function describe(e: AuditEntry): string {
  const d = e.details ?? {};
  return (
    (d["name"] as string) ||
    (d["full_name"] as string) ||
    (d["email"] as string) ||
    (d["title"] as string) ||
    (d["period_label"] as string) ||
    (d["permission"] as string) ||
    (e.entity_id ?? "—")
  );
}

export default async function AuditPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const log = await getAuditLog(150);

  return (
    <>
      <Header profile={profile} title="سجل التدقيق" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">
            سجلّ بكل العمليات في النظام: من قام بالإجراء، وعلى ماذا، ومتى — آخر
            150 عملية.
          </p>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-right text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">التاريخ والوقت</th>
                <th className="px-4 py-3 font-semibold">المستخدم</th>
                <th className="px-4 py-3 font-semibold">الإجراء</th>
                <th className="px-4 py-3 font-semibold">العنصر</th>
                <th className="px-4 py-3 font-semibold">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    لا توجد عمليات مسجّلة بعد.
                  </td>
                </tr>
              ) : (
                log.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(e.created_at).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="px-4 py-3 text-mushar-dark">
                      {e.user?.full_name || e.user?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          ACTION_STYLE[e.action] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ACTION_LABEL[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ENTITY_LABEL[e.entity] ?? e.entity}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{describe(e)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
