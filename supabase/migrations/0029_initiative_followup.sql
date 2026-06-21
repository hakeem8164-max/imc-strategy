-- متابعة المبادرات: دروس مستفادة + إغلاق + سجل تحديات/تحديثات
alter table public.kpi_initiatives add column if not exists lessons_learned text;
alter table public.kpi_initiatives add column if not exists completed_at timestamptz;
alter table public.kpi_initiatives add column if not exists completion_doc_url text;
alter table public.kpi_initiatives add column if not exists completion_doc_name text;

create table if not exists public.kpi_initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.kpi_initiatives(id) on delete cascade,
  kind text not null default 'update' check (kind in ('update','challenge')),
  body text not null,
  progress int,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpi_init_updates_idx on public.kpi_initiative_updates (initiative_id);
alter table public.kpi_initiative_updates enable row level security;

drop policy if exists iu_select on public.kpi_initiative_updates;
create policy iu_select on public.kpi_initiative_updates
  for select using (auth.uid() is not null);
drop policy if exists iu_all on public.kpi_initiative_updates;
create policy iu_all on public.kpi_initiative_updates
  for all using (
    exists (select 1 from public.kpi_initiatives i where i.id = initiative_id
      and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id)))
  ) with check (
    exists (select 1 from public.kpi_initiatives i where i.id = initiative_id
      and (i.owner_user_id = auth.uid() or public.can_manage_kpi_initiative(i.kpi_id)))
  );

-- ملاحظة: حُدّثت دالة _apply_cr لدعم إغلاق المبادرة (mark_complete) — انظر 0029 في قاعدة البيانات
