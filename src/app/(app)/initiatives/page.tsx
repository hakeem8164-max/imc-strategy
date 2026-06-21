import { redirect } from "next/navigation";
import Header from "@/components/Header";
import InitiativesManager from "@/components/InitiativesManager";
import {
  getProfile,
  getAllObjectives,
  getAllInitiatives,
  getUsers,
} from "@/lib/data";

export default async function InitiativesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const [objectives, initiatives, users] = await Promise.all([
    getAllObjectives(),
    getAllInitiatives(),
    getUsers(),
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
          initiatives={initiatives}
          canManage={canManage}
        />
      </div>
    </>
  );
}
