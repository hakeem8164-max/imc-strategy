-- منصة المساجد المتكاملة — سياسات الأمان على مستوى الصف (RLS)
-- =================================================

-- دوال مساعدة
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- هل يستطيع المستخدم الحالي إدخال/تعديل قياسات هذا المؤشر؟
create or replace function public.can_edit_kpi(p_kpi_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.kpis k
      join public.profiles pr on pr.id = auth.uid()
      where k.id = p_kpi_id
        and pr.role = 'owner'
        and (
          k.owner_user_id = auth.uid()
          or (k.owner_title is not null and k.owner_title = pr.title)
        )
    );
$$;

-- تفعيل RLS
alter table public.dimensions enable row level security;
alter table public.profiles enable row level security;
alter table public.kpis enable row level security;
alter table public.kpi_entries enable row level security;

-- الأبعاد: قراءة لكل مستخدم مسجّل، تعديل للمدير
drop policy if exists dimensions_read on public.dimensions;
create policy dimensions_read on public.dimensions
  for select to authenticated using (true);
drop policy if exists dimensions_admin on public.dimensions;
create policy dimensions_admin on public.dimensions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- المؤشرات: قراءة لكل مستخدم مسجّل، تعديل للمدير
drop policy if exists kpis_read on public.kpis;
create policy kpis_read on public.kpis
  for select to authenticated using (true);
drop policy if exists kpis_admin on public.kpis;
create policy kpis_admin on public.kpis
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- القياسات: قراءة للجميع، إدخال/تعديل/حذف للمالك أو المدير
drop policy if exists entries_read on public.kpi_entries;
create policy entries_read on public.kpi_entries
  for select to authenticated using (true);
drop policy if exists entries_insert on public.kpi_entries;
create policy entries_insert on public.kpi_entries
  for insert to authenticated with check (public.can_edit_kpi(kpi_id));
drop policy if exists entries_update on public.kpi_entries;
create policy entries_update on public.kpi_entries
  for update to authenticated
  using (public.can_edit_kpi(kpi_id)) with check (public.can_edit_kpi(kpi_id));
drop policy if exists entries_delete on public.kpi_entries;
create policy entries_delete on public.kpi_entries
  for delete to authenticated using (public.can_edit_kpi(kpi_id));

-- الملفات الشخصية: المستخدم يرى ملفه، والمدير يرى الجميع
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
-- المدير يحدّث أي ملف، والمستخدم يحدّث اسمه فقط (لا يرفع دوره)
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
