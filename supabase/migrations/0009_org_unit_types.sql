-- منصة المساجد المتكاملة — أنواع الوحدات التنظيمية القابلة للتخصيص
create table if not exists public.org_unit_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#056073',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.org_unit_types enable row level security;
drop policy if exists org_unit_types_read on public.org_unit_types;
create policy org_unit_types_read on public.org_unit_types for select to authenticated using (true);
drop policy if exists org_unit_types_admin on public.org_unit_types;
create policy org_unit_types_admin on public.org_unit_types for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.org_unit_types (name, color, sort_order) values
  ('قطاع', '#056073', 1),
  ('إدارة', '#1A6B7B', 2),
  ('قسم', '#67C5B9', 3),
  ('وحدة', '#2E8B9E', 4)
on conflict (name) do nothing;
