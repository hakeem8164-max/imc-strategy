import { redirect } from "next/navigation";
import Header from "@/components/Header";
import DecisionsTracker from "@/components/DecisionsTracker";
import { getProfile, getAllDecisions, getUsers } from "@/lib/data";

export default async function DecisionsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "viewer") redirect("/");

  const [decisions, allUsers] = await Promise.all([
    getAllDecisions(),
    getUsers(),
  ]);
  const users = allUsers
    .filter((u) => u.status !== "inactive")
    .map((u) => ({ id: u.id, full_name: u.full_name }));
  const canManage = profile.role === "admin" || profile.role === "executive";

  return (
    <>
      <Header
        profile={profile}
        title="متابعة القرارات والملاحظات التنفيذية"
      />
      <DecisionsTracker
        decisions={decisions}
        users={users}
        myUserId={profile.id}
        canManage={canManage}
      />
    </>
  );
}
