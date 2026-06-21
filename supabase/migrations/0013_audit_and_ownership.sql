-- 1) توسعة ملكية المؤشر لتشمل الوحدة التنظيمية
create or replace function public.can_edit_kpi(p_kpi_id uuid)
returns boolean language sql security definer set search_path = public stable
as $fn$
  select public.is_admin() or exists (
    select 1 from public.kpis k
    join public.profiles pr on pr.id = auth.uid()
    where k.id = p_kpi_id and pr.role = 'owner'
      and (
        k.owner_user_id = auth.uid()
        or (k.owner_title is not null and k.owner_title = pr.title)
        or (k.owner_unit_id is not null and k.owner_unit_id = pr.org_unit_id)
      )
  );
$fn$;
revoke all on function public.can_edit_kpi(uuid) from anon, public;
grant execute on function public.can_edit_kpi(uuid) to authenticated;

-- 2) سجل التدقيق
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare rec jsonb;
begin
  rec := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  insert into public.audit_log (user_id, action, entity, entity_id, details)
  values (auth.uid(), TG_OP, TG_TABLE_NAME, coalesce(rec->>'id', null), rec);
  return null;
end;
$fn$;

do $$
declare t text;
begin
  foreach t in array array['kpis','dimensions','kpi_entries','org_units','org_unit_types','role_permissions','profiles','invitations']
  loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;
