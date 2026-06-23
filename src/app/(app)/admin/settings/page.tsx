import { redirect } from "next/navigation";
import Header from "@/components/Header";
import OrgStructureManager from "@/components/OrgStructureManager";
import {
  getProfile,
  getOrgProfile,
  getOrgUnits,
  getOrgUnitTypes,
} from "@/lib/data";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [org, units, unitTypes] = await Promise.all([
    getOrgProfile(),
    getOrgUnits(),
    getOrgUnitTypes(),
  ]);

  return (
    <>
      <Header profile={profile} title="الهيكل التنظيمي" />
      <div>
        <OrgStructureManager
          orgName={org?.name ?? "نظام إدارة الأداء"}
          units={units}
          unitTypes={unitTypes}
        />
      </div>
    </>
  );
}
