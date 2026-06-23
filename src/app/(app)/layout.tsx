import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getProfile, getOrgProfile, getAuthUser, getSearchIndex } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.must_change_password) redirect("/account/password");

  const [profile, org, searchItems] = await Promise.all([
    getProfile(),
    getOrgProfile(),
    getSearchIndex(),
  ]);
  if (!profile) redirect("/login");

  return (
    <AppShell
      profile={profile}
      orgName={org?.name ?? "شركة المساجد المتكاملة"}
      role={profile.role}
      searchItems={searchItems}
    >
      {children}
    </AppShell>
  );
}
