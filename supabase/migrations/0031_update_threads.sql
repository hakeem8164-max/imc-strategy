-- ردود/تحديثات متسلسلة على كل تحديث/تحدٍّ + إغلاقه كمكتمل
alter table public.kpi_initiative_updates add column if not exists resolved boolean not null default false;
alter table public.kpi_initiative_updates add column if not exists resolved_at timestamptz;

create table if not exists public.kpi_initiative_update_replies (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.kpi_initiative_updates(id) on delete cascade,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpi_iu_replies_idx on public.kpi_initiative_update_replies (update_id);
alter table public.kpi_initiative_update_replies enable row level security;

drop policy if exists iur_select on public.kpi_initiative_update_replies;
create policy iur_select on public.kpi_initiative_update_replies
  for select using (auth.uid() is not null);
drop policy if exists iur_all on public.kpi_initiative_update_replies;
create policy iur_all on public.kpi_initiative_update_replies
  for all using (
    exists (
      select 1 from public.kpi_initiative_updates u
      join public.kpi_initiatives i on i.id = u.initiative_id
      where u.id = update_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  ) with check (
    exists (
      select 1 from public.kpi_initiative_updates u
      join public.kpi_initiatives i on i.id = u.initiative_id
      where u.id = update_id
        and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id))
    )
  );
