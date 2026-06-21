-- منصة المساجد المتكاملة — الهيكل التنظيمي وإدارة المستخدمين والدعوات

-- 1) ملف المنشأة (صف واحد)
create table if not exists public.org_profile (
  id int primary key default 1,
  name text not null default 'شركة المساجد المتكاملة',
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint org_profile_singleton check (id = 1)
);
insert into public.org_profile (id, name) values (1, 'شركة المساجد المتكاملة')
  on conflict (id) do nothing;

-- 2) الوحدات التنظيمية (هرمية: قطاع → إدارة → قسم/وحدة)
create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_type text not null default 'department',
  parent_id uuid references public.org_units(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists org_units_parent_idx on public.org_units(parent_id);

-- 3) توسعة جدول المستخدمين
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists org_unit_id uuid references public.org_units(id) on delete set null;
alter table public.profiles add column if not exists status text not null default 'active';
update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

-- 4) الدعوات
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'viewer',
  org_unit_id uuid references public.org_units(id) on delete set null,
  title text,
  created_at timestamptz not null default now()
);

-- 5) دالة إنشاء الملف عند التسجيل: تقرأ الدعوة وتضبط البريد/الدور/الإدارة/المنصب
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  inv record; v_role user_role := 'viewer'; v_unit uuid := null; v_title text := null;
begin
  select * into inv from public.invitations where email = new.email;
  if found then
    begin v_role := inv.role::user_role; exception when others then v_role := 'viewer'; end;
    v_unit := inv.org_unit_id; v_title := inv.title;
  end if;
  insert into public.profiles (id, full_name, email, role, org_unit_id, title, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, v_role, v_unit, v_title, 'active')
  on conflict (id) do update set email = excluded.email;
  delete from public.invitations where email = new.email;
  return new;
end;
$fn$;

-- 6) RLS
alter table public.org_profile enable row level security;
alter table public.org_units enable row level security;
alter table public.invitations enable row level security;

drop policy if exists org_profile_read on public.org_profile;
create policy org_profile_read on public.org_profile for select to authenticated using (true);
drop policy if exists org_profile_admin on public.org_profile;
create policy org_profile_admin on public.org_profile for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists org_units_read on public.org_units;
create policy org_units_read on public.org_units for select to authenticated using (true);
drop policy if exists org_units_admin on public.org_units;
create policy org_units_admin on public.org_units for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists invitations_admin on public.invitations;
create policy invitations_admin on public.invitations for all to authenticated using (public.is_admin()) with check (public.is_admin());
