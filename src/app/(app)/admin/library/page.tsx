import { redirect } from "next/navigation";
import Header from "@/components/Header";
import KpiLibrary from "@/components/KpiLibrary";
import {
  getProfile,
  getDimensions,
  getObjectives,
  getAllKpis,
  getOrgUnits,
} from "@/lib/data";

export default async function LibraryPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [dimensions, objectives, kpis, orgUnits] = await Promise.all([
    getDimensions(),
    getObjectives(),
    getAllKpis(),
    getOrgUnits(),
  ]);

  return (
    <>
      <Header profile={profile} title="الأهداف الاستراتيجية" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            البنية: <b>منظور ← هدف ← مؤشر</b>. حدّد المالك من الهيكل التنظيمي، القطبية،
            آلية الاحتساب، ومستهدفات الأرباع (اختيارية) — ويُحسب{" "}
            <b>المستهدف الكلي</b> تلقائيًا. استخدم مفتاح <b>التفعيل</b> لإظهار
            المؤشر أو إيقافه عن المنصة.
          </p>
        </div>
        <KpiLibrary
          dimensions={dimensions}
          objectives={objectives}
          kpis={kpis}
          orgUnits={orgUnits}
        />
      </div>
    </>
  );
}
