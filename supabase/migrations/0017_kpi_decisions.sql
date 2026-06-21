-- القرارات والملاحظات التنفيذية على المؤشرات
-- يكتبها القائد (الرئيس التنفيذي / المسؤول) على المؤشرات المتعثّرة،
-- ويمكن إسنادها كإجراء متابعة لوحدة تنظيمية مع تاريخ استحقاق وحالة متابعة.

create table if not exists public.kpi_decisions (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  body text not null,
  action text,
  assigned_unit_id uuid references public.org_units(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists kpi_decisions_kpi_id_idx on public.kpi_decisions (kpi_id);
create index if not exists kpi_decisions_status_idx on public.kpi_decisions (status);

alter table public.kpi_decisions enable row level security;

-- القراءة متاحة لجميع المستخدمين المسجّلين
drop policy if exists kpi_decisions_select on public.kpi_decisions;
create policy kpi_decisions_select on public.kpi_decisions
  for select using (auth.uid() is not null);

-- الإضافة للمسؤول والرئيس التنفيذي فقط
drop policy if exists kpi_decisions_insert on public.kpi_decisions;
create policy kpi_decisions_insert on public.kpi_decisions
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'executive')
    )
  );

-- التحديث (إغلاق/إعادة فتح المتابعة): المسؤول/الرئيس التنفيذي أو مالك الوحدة المُسنَدة
drop policy if exists kpi_decisions_update on public.kpi_decisions;
create policy kpi_decisions_update on public.kpi_decisions
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('admin', 'executive')
          or (p.role = 'owner' and p.org_unit_id = kpi_decisions.assigned_unit_id)
        )
    )
  );

-- الحذف للمسؤول والرئيس التنفيذي فقط
drop policy if exists kpi_decisions_delete on public.kpi_decisions;
create policy kpi_decisions_delete on public.kpi_decisions
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'executive')
    )
  );

-- سجل التدقيق
drop trigger if exists kpi_decisions_audit on public.kpi_decisions;
create trigger kpi_decisions_audit
  after insert or update or delete on public.kpi_decisions
  for each row execute function public.audit_trigger();

-- إشعار مالكي الوحدة المُسنَد إليها القرار
create or replace function public.notify_on_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kpi_name text;
begin
  if new.assigned_unit_id is null then
    return new;
  end if;
  select name into kpi_name from public.kpis where id = new.kpi_id;
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         'قرار تنفيذي جديد بحاجة لمتابعة',
         coalesce('بشأن مؤشر: ' || kpi_name, 'قرار تنفيذي جديد'),
         '/kpis/' || new.kpi_id
  from public.profiles p
  where p.org_unit_id = new.assigned_unit_id;
  return new;
end;
$$;

drop trigger if exists kpi_decisions_notify on public.kpi_decisions;
create trigger kpi_decisions_notify
  after insert on public.kpi_decisions
  for each row execute function public.notify_on_decision();
