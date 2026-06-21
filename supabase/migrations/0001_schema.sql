-- منصة المساجد المتكاملة لإدارة الأداء — مخطط قاعدة البيانات
-- =====================================================

-- الأدوار
do $$ begin
  create type user_role as enum ('admin', 'owner', 'viewer');
exception when duplicate_object then null; end $$;

-- جدول الأبعاد الاستراتيجية
create table if not exists public.dimensions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#8C341F',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ملفات المستخدمين (مرتبطة بـ auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  title text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- جدول المؤشرات
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  dimension_id uuid not null references public.dimensions(id) on delete restrict,
  name text not null,
  description text,
  owner_title text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  frequency text,
  measurement_method text,
  unit text not null default '',
  baseline numeric,
  target_q3 numeric,
  target_q4 numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kpis_dimension_idx on public.kpis(dimension_id);
create index if not exists kpis_owner_title_idx on public.kpis(owner_title);

-- جدول القياسات (القيم المُدخلة)
create table if not exists public.kpi_entries (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  period_label text not null,
  period_date date not null,
  value numeric not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpi_entries_kpi_idx on public.kpi_entries(kpi_id);
create index if not exists kpi_entries_date_idx on public.kpi_entries(period_date desc);

-- إنشاء ملف مستخدم تلقائيًا عند التسجيل
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
