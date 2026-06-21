-- شطور/عتبات الأداء (قابلة للتخصيص)
create table if not exists public.performance_bands (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  min_pct numeric not null default 0,
  color text not null default '#16a34a',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.performance_bands enable row level security;
drop policy if exists bands_read on public.performance_bands;
create policy bands_read on public.performance_bands for select to authenticated using (true);
drop policy if exists bands_admin on public.performance_bands;
create policy bands_admin on public.performance_bands for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.performance_bands (label, min_pct, color, sort_order) values
  ('ممتاز', 100, '#16a34a', 1),
  ('جيد جدًا', 85, '#67C5B9', 2),
  ('جيد', 70, '#f59e0b', 3),
  ('يحتاج تحسينًا', 0, '#A11249', 4)
on conflict do nothing;

-- إعدادات عامة (صف واحد)
create table if not exists public.app_settings (
  id int primary key default 1,
  due_soon_days int not null default 7,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
