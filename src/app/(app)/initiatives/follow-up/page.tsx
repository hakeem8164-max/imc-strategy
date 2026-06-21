import { redirect } from "next/navigation";
import Header from "@/components/Header";
import InitiativeFollowUp from "@/components/InitiativeFollowUp";
import MasterGantt from "@/components/MasterGantt";
import { getProfile, getAllInitiatives } from "@/lib/data";

export default async function InitiativeFollowUpPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const initiatives = await getAllInitiatives();
  const canManage =
    profile.role === "admin" ||
    profile.role === "executive" ||
    profile.role === "owner";

  return (
    <>
      <Header profile={profile} title="متابعة المبادرات" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            تابِع تنفيذ المبادرات: حدِّث إنجاز المعالم (نسبة موزونة تلقائية)،
            سجِّل <b>التحديات</b>، اطّلع على <b>مخطط جانت</b>، وعند الانتهاء ارفع{" "}
            <b>طلب اكتمال المبادرة</b> (يلزم وثيقة الإغلاق والدروس المستفادة)
            ليُعتمد عبر السلسلة.
          </p>
        </div>
        {initiatives.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-mushar-dark">
              مخطط جانت الرئيسي — كل المبادرات
            </h2>
            <MasterGantt initiatives={initiatives} />
          </div>
        )}
        <InitiativeFollowUp initiatives={initiatives} canManage={canManage} />
      </div>
    </>
  );
}
