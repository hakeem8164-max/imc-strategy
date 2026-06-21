import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getProfile, getOrgProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.must_change_password) redirect("/account/password");

  const profile = await getProfile();
  if (!profile) redirect("/login");
  const org = await getOrgProfile();

  return (
    <AppShell
      profile={profile}
      orgName={org?.name ?? "شركة المساجد المتكاملة"}
      role={profile.role}
    >
      {children}
    </AppShell>
  );
}
