import { redirect } from "next/navigation";
import Header from "@/components/Header";
import MeetingsManager from "@/components/MeetingsManager";
import {
  getProfile,
  getMeetings,
  getRecommendationDomains,
  getOrgUnits,
  getUsers,
} from "@/lib/data";

export default async function MeetingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [meetings, domains, orgUnits, users] = await Promise.all([
    getMeetings(),
    getRecommendationDomains(),
    getOrgUnits(),
    getUsers(),
  ]);

  const canManage =
    profile.role === "admin" ||
    profile.role === "executive" ||
    profile.role === "secretary";
  const canReview = profile.role === "admin";

  return (
    <>
      <Header profile={profile} title="الاجتماعات" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            وثِّق محاضر الاجتماعات وسجِّل التوصيات وتابِع تنفيذها. تتحدّث حالة كل
            توصية تلقائيًا من تاريخ المحضر حتى الاستحقاق، ولا تُغلق إلا بإرفاق
            وثيقة واعتماد <b>مسؤول القياس</b>.
          </p>
        </div>
        <MeetingsManager
          meetings={meetings}
          domains={domains}
          orgUnits={orgUnits.map((u) => ({ id: u.id, name: u.name }))}
          users={users.map((u) => ({ id: u.id, full_name: u.full_name }))}
          profile={{ id: profile.id, role: profile.role }}
          canManage={canManage}
          canReview={canReview}
        />
      </div>
    </>
  );
}
