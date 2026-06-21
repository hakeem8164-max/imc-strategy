import { redirect } from "next/navigation";
import Header from "@/components/Header";
import KpiLibrary from "@/components/KpiLibrary";
import { getProfile, getDimensions, getAllKpis, getOrgUnits } from "@/lib/data";

export default async function LibraryPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [dimensions, kpis, orgUnits] = await Promise.all([
    getDimensions(),
    getAllKpis(),
    getOrgUnits(),
  ]);

  return (
    <>
      <Header profile={profile} title="مكتبة المؤشرات" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            عرّف المؤشرات وأبعادها هنا. حدّد المالك من الهيكل التنظيمي، القطبية،
            آلية الاحتساب، ومستهدفات الأرباع (اختيارية) — ويُحسب{" "}
            <b>المستهدف الكلي</b> تلقائيًا. استخدم مفتاح <b>التفعيل</b> لإظهار
            المؤشر أو إيقافه عن المنصة.
          </p>
        </div>
        <KpiLibrary dimensions={dimensions} kpis={kpis} orgUnits={orgUnits} />
      </div>
    </>
  );
}
