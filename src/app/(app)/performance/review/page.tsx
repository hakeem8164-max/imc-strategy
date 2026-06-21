import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ReviewClient from "@/components/ReviewClient";
import DueAlerts from "@/components/DueAlerts";
import {
  getProfile,
  getKpis,
  getLatestEntries,
  getPendingEntries,
  getManagerPending,
  getMySubmissions,
  getDueKpis,
  canEditKpi,
} from "@/lib/data";

export default async function ReviewPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "viewer" || profile.role === "executive") redirect("/");

  const [kpis, latest, mySubmissions, officerPending, managerPending, dueItems] =
    await Promise.all([
      getKpis(),
      getLatestEntries(),
      getMySubmissions(profile.id),
      profile.role === "admin" ? getPendingEntries() : Promise.resolve([]),
      profile.role === "owner" || profile.role === "admin"
        ? getManagerPending(profile)
        : Promise.resolve([]),
      getDueKpis(profile),
    ]);

  const editableKpis = kpis.filter((k) => canEditKpi(profile, k));
  const lastValues: Record<string, number> = {};
  for (const k of editableKpis) {
    if (latest[k.id]) lastValues[k.id] = latest[k.id].value;
  }

  const intro =
    profile.role === "admin"
      ? "اعتمد النتائج المرفوعة من المدراء أو ارفضها مع المبرر. ويمكنك إدخال نتائج المؤشرات التي تملكها."
      : profile.role === "owner"
      ? "اعتمد ما يرسله موظفو إدارتك (يُرفع لمسؤول الأداء)، أو أدخل النتائج بنفسك لترفع مباشرة للمسؤول."
      : "أدخل نتيجة المؤشر مرفقةً بالوثيقة وأرسلها لمدير إدارتك للاعتماد. ستصلك إشعارات بالنتيجة.";

  return (
    <>
      <Header profile={profile} title="المراجعة والاعتماد" />
      <div className="space-y-4">
        <DueAlerts items={dueItems} />
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">{intro}</p>
        </div>
        <ReviewClient
          role={profile.role}
          editableKpis={editableKpis}
          lastValues={lastValues}
          mySubmissions={mySubmissions}
          officerPending={officerPending}
          managerPending={managerPending}
        />
      </div>
    </>
  );
}
