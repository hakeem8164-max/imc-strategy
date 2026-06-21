-- منصة المساجد المتكاملة — صلاحيات الأدوار (مصفوفة قابلة للضبط)
create table if not exists public.role_permissions (
  role text not null,
  permission text not null,
  allowed boolean not null default false,
  primary key (role, permission)
);

alter table public.role_permissions enable row level security;
drop policy if exists role_perm_read on public.role_permissions;
create policy role_perm_read on public.role_permissions for select to authenticated using (true);
drop policy if exists role_perm_admin on public.role_permissions;
create policy role_perm_admin on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.role_permissions (role, permission, allowed) values
  ('admin','view_dashboard',true),('admin','view_kpis',true),('admin','enter_values',true),('admin','manage_kpis',true),('admin','manage_users',true),('admin','manage_org',true),('admin','manage_permissions',true),
  ('owner','view_dashboard',true),('owner','view_kpis',true),('owner','enter_values',true),('owner','manage_kpis',false),('owner','manage_users',false),('owner','manage_org',false),('owner','manage_permissions',false),
  ('viewer','view_dashboard',true),('viewer','view_kpis',true),('viewer','enter_values',false),('viewer','manage_kpis',false),('viewer','manage_users',false),('viewer','manage_org',false),('viewer','manage_permissions',false)
on conflict (role, permission) do nothing;
