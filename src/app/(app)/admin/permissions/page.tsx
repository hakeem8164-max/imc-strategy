import { redirect } from "next/navigation";
import Header from "@/components/Header";
import PermissionsMatrix from "@/components/PermissionsMatrix";
import { getProfile, getRolePermissions } from "@/lib/data";

export default async function PermissionsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const perms = await getRolePermissions();

  return (
    <>
      <Header profile={profile} title="الصلاحيات" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            تحكّم في صلاحيات كل دور. <b>مدير النظام</b> يملك صلاحية كاملة دائمًا.
            فعّل أو عطّل كل صلاحية للأدوار الأخرى بالضغط على المفتاح.
          </p>
        </div>
        <PermissionsMatrix initial={perms} />
      </div>
    </>
  );
}
