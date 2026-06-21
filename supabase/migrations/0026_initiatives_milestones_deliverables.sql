-- المبادرة: سنة البداية + الإدارة المالكة (owner_user_id يصبح مدير المبادرة)
alter table public.kpi_initiatives add column if not exists start_year int;
alter table public.kpi_initiatives add column if not exists owner_unit_id uuid references public.org_units(id) on delete set null;

-- المعالم: وزن (مجموعها 100%) + تاريخ بداية (due_date = النهاية)
alter table public.kpi_initiative_milestones add column if not exists weight int not null default 0 check (weight between 0 and 100);
alter table public.kpi_initiative_milestones add column if not exists start_date date;

-- المخرجات: كل مخرج سطر مستقل قابل للتعليم كمنجز
create table if not exists public.kpi_initiative_deliverables (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.kpi_initiatives(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kpi_deliverables_initiative_idx on public.kpi_initiative_deliverables (initiative_id);
alter table public.kpi_initiative_deliverables enable row level security;

drop policy if exists del_select on public.kpi_initiative_deliverables;
create policy del_select on public.kpi_initiative_deliverables
  for select using (auth.uid() is not null);

drop policy if exists del_all on public.kpi_initiative_deliverables;
create policy del_all on public.kpi_initiative_deliverables
  for all using (
    exists (
      select 1 from public.kpi_initiatives i
      where i.id = initiative_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  ) with check (
    exists (
      select 1 from public.kpi_initiatives i
      where i.id = initiative_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  );
