import { redirect } from "next/navigation";
import Header from "@/components/Header";
import UsersManager from "@/components/UsersManager";
import { getProfile, getUsers, getOrgUnits } from "@/lib/data";

export default async function UsersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [users, orgUnits] = await Promise.all([getUsers(), getOrgUnits()]);

  return (
    <>
      <Header profile={profile} title="المستخدمون" />
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-500">
            أضِف مستخدمًا عبر <b>إنشاء حساب مباشر</b> (بكلمة مرور مؤقتة يغيّرها
            أول دخول) أو <b>دعوة عبر البريد</b>. <b>مالك المؤشرات</b> يُدخل قياسات
            المؤشرات المرتبطة بمنصبه، و<b>المشاهد</b> يطّلع فقط، و<b>مدير النظام</b>{" "}
            يملك صلاحية كاملة.
          </p>
        </div>
        <UsersManager
          users={users}
          orgUnits={orgUnits}
          currentUserId={profile.id}
        />
      </div>
    </>
  );
}
