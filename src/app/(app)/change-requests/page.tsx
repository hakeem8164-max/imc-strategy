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
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            أي إضافة أو تعديل أو حذف لـ<b>الأهداف</b> و<b>المؤشرات</b> و
            <b>المبادرات</b> و<b>المستهدفات</b> يُرفع كطلب تغيير يمرّ بسلسلة
            الاعتماد: <b>مدير الإدارة ← مسؤول قياس الأداء ← الرئيس التنفيذي</b>{" "}
            (المعتمد النهائي)، ويُطبَّق تلقائيًا بعد الاعتماد.
          </p>
        </div>
        <NewChangeRequest
          dimensions={dimensions}
          objectives={objectives}
          kpis={kpis}
          initiatives={initiatives.map((i) => ({
            id: i.id,
            title: i.title,
            description: i.description,
            owner_unit_id: i.owner_unit_id,
            owner_user_id: i.owner_user_id,
            start_year: i.start_year,
            start_date: i.start_date,
            due_date: i.due_date,
          }))}
          orgUnits={orgUnits}
          users={users}
        />
        <ChangeRequestsList requests={requests} profile={profile} />
      </div>
    </>
  );
}
