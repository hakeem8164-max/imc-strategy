import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getProfile, getOrgProfile, getAuthUser } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.must_change_password) redirect("/account/password");

  const [profile, org] = await Promise.all([getProfile(), getOrgProfile()]);
  if (!profile) redirect("/login");

  return (
    <AppShell
      profile={profile}
      orgName={org?.name ?? "نظام إدارة الأداء"}
      role={profile.role}
    >
      {children}
    </AppShell>
  );
}
