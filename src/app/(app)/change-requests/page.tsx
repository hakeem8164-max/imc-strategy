import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ChangeRequestsList from "@/components/ChangeRequestsList";
import { getProfile, getChangeRequests } from "@/lib/data";

export default async function ChangeRequestsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "viewer") redirect("/");

  const requests = await getChangeRequests();

  return (
    <>
      <Header profile={profile} title="طلبات التغيير" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            أي إضافة أو تعديل أو حذف لـ<b>الأهداف</b> و<b>المبادرات</b> و
            <b>المؤشرات</b> و<b>المستهدفات</b> يُرفع كطلب تغيير يمرّ بسلسلة
            الاعتماد: <b>مدير الإدارة ← مسؤول قياس الأداء ← الرئيس التنفيذي</b>{" "}
            (المعتمد النهائي)، ويُطبَّق تلقائيًا بعد الاعتماد.
          </p>
        </div>
        <ChangeRequestsList requests={requests} profile={profile} />
      </div>
    </>
  );
}
