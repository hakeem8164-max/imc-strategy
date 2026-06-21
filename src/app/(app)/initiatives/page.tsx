import { redirect } from "next/navigation";
import Header from "@/components/Header";
import InitiativesManager from "@/components/InitiativesManager";
import {
  getProfile,
  getAllObjectives,
  getAllInitiatives,
  getUsers,
  getOrgUnits,
} from "@/lib/data";

export default async function InitiativesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [objectives, initiatives, users, orgUnits] = await Promise.all([
    getAllObjectives(),
    getAllInitiatives(),
    getUsers(),
    getOrgUnits(),
  ]);

  const canManage =
    profile.role === "admin" || profile.role === "executive";

  return (
    <>
      <Header profile={profile} title="المبادرات" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            المبادرات هي المشاريع والإجراءات التنفيذية المرتبطة بكل{" "}
            <b>هدف استراتيجي</b>، لتحقيق مستهدفاته. أنشئ مبادرة، اربطها بهدفها،
            وحدّد مالكها وحالتها ونسبة إنجازها.
          </p>
        </div>
        <InitiativesManager
          objectives={objectives}
          users={users}
          orgUnits={orgUnits}
          initiatives={initiatives}
          canManage={canManage}
        />
      </div>
    </>
  );
}
