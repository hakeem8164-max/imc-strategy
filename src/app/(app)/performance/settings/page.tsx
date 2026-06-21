import { redirect } from "next/navigation";
import Header from "@/components/Header";
import PerformanceSettings from "@/components/PerformanceSettings";
import { getProfile, getBands, getAppSettings } from "@/lib/data";

export default async function PerformanceSettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [bands, settings] = await Promise.all([getBands(), getAppSettings()]);

  return (
    <>
      <Header profile={profile} title="إعدادات المؤشرات" />
      <PerformanceSettings bands={bands} dueSoonDays={settings.due_soon_days} />
    </>
  );
}
