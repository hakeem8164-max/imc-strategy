-- الخطط التصحيحية / المبادرات المرتبطة بالمؤشرات (خصوصًا المتعثّرة)

create table if not exists public.kpi_initiatives (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  title text not null,
  description text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','in_progress','done','cancelled')),
  progress int not null default 0 check (progress between 0 and 100),
  start_date date,
  due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpi_initiatives_kpi_idx on public.kpi_initiatives (kpi_id);
create index if not exists kpi_initiatives_owner_idx on public.kpi_initiatives (owner_user_id);

create table if not exists public.kpi_initiative_milestones (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.kpi_initiatives(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kpi_milestones_initiative_idx on public.kpi_initiative_milestones (initiative_id);

alter table public.kpi_initiatives enable row level security;
alter table public.kpi_initiative_milestones enable row level security;

-- من يملك صلاحية إدارة مبادرات مؤشر معيّن (القيادة أو مالك المؤشر/وحدته)
create or replace function public.can_manage_kpi_initiative(p_kpi_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    left join public.kpis k on k.id = p_kpi_id
    where p.id = auth.uid()
      and (
        p.role in ('admin','executive')
        or (
          p.role in ('owner','employee')
          and (
            k.owner_user_id = p.id
            or (k.owner_title is not null and k.owner_title = p.title)
            or (k.owner_unit_id is not null and k.owner_unit_id = p.org_unit_id)
          )
        )
      )
  );
$$;

-- مبادرات: قراءة للجميع المسجّلين
drop policy if exists init_select on public.kpi_initiatives;
create policy init_select on public.kpi_initiatives
  for select using (auth.uid() is not null);

drop policy if exists init_insert on public.kpi_initiatives;
create policy init_insert on public.kpi_initiatives
  for insert with check (public.can_manage_kpi_initiative(kpi_id));

drop policy if exists init_update on public.kpi_initiatives;
create policy init_update on public.kpi_initiatives
  for update using (
    owner_user_id = auth.uid() or public.can_manage_kpi_initiative(kpi_id)
  );

drop policy if exists init_delete on public.kpi_initiatives;
create policy init_delete on public.kpi_initiatives
  for delete using (public.can_manage_kpi_initiative(kpi_id));

-- معالم: تتبع صلاحية المبادرة الأم
drop policy if exists ms_select on public.kpi_initiative_milestones;
create policy ms_select on public.kpi_initiative_milestones
  for select using (auth.uid() is not null);

drop policy if exists ms_all on public.kpi_initiative_milestones;
create policy ms_all on public.kpi_initiative_milestones
  for all using (
    exists (
      select 1 from public.kpi_initiatives i
      where i.id = initiative_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_initiatives i
      where i.id = initiative_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  );

-- تدقيق
drop trigger if exists trg_audit_init on public.kpi_initiatives;
create trigger trg_audit_init
  after insert or update or delete on public.kpi_initiatives
  for each row execute function public.audit_trigger();

-- إشعار المسؤول عند إسناد مبادرة
create or replace function public.notify_on_initiative()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kpi_name text;
begin
  if new.owner_user_id is null or new.owner_user_id = new.created_by then
    return new;
  end if;
  select name into kpi_name from public.kpis where id = new.kpi_id;
  insert into public.notifications (user_id, title, body, link)
  values (
    new.owner_user_id,
    'تم إسناد خطة/مبادرة تصحيحية لك',
    coalesce('بشأن مؤشر: ' || kpi_name, 'مبادرة جديدة') || ' — ' || new.title,
    '/kpis/' || new.kpi_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_init on public.kpi_initiatives;
create trigger trg_notify_init
  after insert on public.kpi_initiatives
  for each row execute function public.notify_on_initiative();
