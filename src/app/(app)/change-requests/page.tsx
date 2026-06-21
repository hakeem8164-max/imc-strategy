import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ChangeRequestsList from "@/components/ChangeRequestsList";
import NewChangeRequest from "@/components/NewChangeRequest";
import {
  getProfile,
  getChangeRequests,
  getAllDimensions,
  getAllObjectives,
  getAllKpis,
  getAllInitiatives,
  getOrgUnits,
  getUsers,
} from "@/lib/data";

export default async function ChangeRequestsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "viewer") redirect("/");

  const [requests, dimensions, objectives, kpis, initiatives, orgUnits, users] =
    await Promise.all([
      getChangeRequests(),
      getAllDimensions(),
      getAllObjectives(),
      getAllKpis(),
      getAllInitiatives(),
      getOrgUnits(),
      getUsers(),
    ]);

  return (
    <>
      <Header profile={profile} title="طلبات التغيير" />
      <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="flex-1 text-sm leading-relaxed text-slate-500">
            أي إضافة أو تعديل أو حذف لـ<b>الأهداف</b> و<b>المؤشرات</b> و
            <b>المبادرات</b> و<b>المستهدفات</b> يُرفع كطلب تغيير يمرّ بسلسلة
            الاعتماد: <b>مدير الإدارة ← مسؤول قياس الأداء ← الرئيس التنفيذي</b>{" "}
            (المعتمد النهائي)، ويُطبَّق تلقائيًا بعد الاعتماد.
          </p>
          <NewChangeRequest
            dimensions={dimensions}
            objectives={objectives}
            kpis={kpis}
            initiatives={initiatives.map((i) => ({ id: i.id, title: i.title }))}
            orgUnits={orgUnits}
            users={users}
          />
        </div>
        <ChangeRequestsList requests={requests} profile={profile} />
      </div>
    </>
  );
}
