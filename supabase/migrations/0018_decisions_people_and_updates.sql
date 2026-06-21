-- إسناد القرارات للأشخاص + تحديثات/متابعات + إشعارات وتذكيرات

-- 1) السماح لكل مستخدم مسجّل بقراءة الملفات الشخصية (للإسناد وعرض الأسماء)
drop policy if exists profiles_read_all_authed on public.profiles;
create policy profiles_read_all_authed on public.profiles
  for select using (auth.uid() is not null);

-- 2) تعديل جدول القرارات: إسناد لشخص + تتبّع التذكير
-- (يدعم اسمَي السياسة/المُحفّز من نسخة 0017 سواء dec_* أو kpi_decisions_*)
drop trigger if exists trg_notify_decision on public.kpi_decisions;
drop trigger if exists kpi_decisions_notify on public.kpi_decisions;
drop policy if exists dec_update on public.kpi_decisions;
drop policy if exists kpi_decisions_update on public.kpi_decisions;

alter table public.kpi_decisions drop column if exists assigned_unit_id;
alter table public.kpi_decisions
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null;
alter table public.kpi_decisions
  add column if not exists reminded_on date;

create index if not exists kpi_decisions_assignee_idx on public.kpi_decisions (assigned_user_id);

-- التحديث (إغلاق/إعادة فتح): المسؤول/الرئيس التنفيذي أو الشخص المُسنَد إليه
create policy dec_update on public.kpi_decisions
  for update using (
    assigned_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'executive')
    )
  );

-- 3) إشعار الشخص المُسنَد إليه عند إنشاء القرار
create or replace function public.notify_on_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kpi_name text;
begin
  if new.assigned_user_id is null then
    return new;
  end if;
  select name into kpi_name from public.kpis where id = new.kpi_id;
  insert into public.notifications (user_id, title, body, link)
  values (
    new.assigned_user_id,
    'قرار تنفيذي جديد بحاجة لمتابعة',
    coalesce('بشأن مؤشر: ' || kpi_name, 'قرار تنفيذي جديد'),
    '/kpis/' || new.kpi_id
  );
  return new;
end;
$$;

create trigger trg_notify_decision
  after insert on public.kpi_decisions
  for each row execute function public.notify_on_decision();

-- 4) جدول التحديثات/المتابعات على القرار
create table if not exists public.kpi_decision_updates (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.kpi_decisions(id) on delete cascade,
  body text not null,
  mention_user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpi_decision_updates_decision_idx on public.kpi_decision_updates (decision_id);

alter table public.kpi_decision_updates enable row level security;

drop policy if exists dec_upd_select on public.kpi_decision_updates;
create policy dec_upd_select on public.kpi_decision_updates
  for select using (auth.uid() is not null);

-- الإضافة: المسؤول/الرئيس التنفيذي أو الشخص المُسنَد إليه القرار
drop policy if exists dec_upd_insert on public.kpi_decision_updates;
create policy dec_upd_insert on public.kpi_decision_updates
  for insert with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'executive')
      )
      or exists (
        select 1 from public.kpi_decisions d
        where d.id = decision_id and d.assigned_user_id = auth.uid()
      )
    )
  );

-- الحذف: صاحب التحديث أو المسؤول/الرئيس التنفيذي
drop policy if exists dec_upd_delete on public.kpi_decision_updates;
create policy dec_upd_delete on public.kpi_decision_updates
  for delete using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'executive')
    )
  );

drop trigger if exists trg_audit_dec_upd on public.kpi_decision_updates;
create trigger trg_audit_dec_upd
  after insert or update or delete on public.kpi_decision_updates
  for each row execute function public.audit_trigger();

-- 5) إشعار المعنيين عند إضافة تحديث (المُسنَد إليه + كاتب القرار + المذكور) عدا الفاعل
create or replace function public.notify_on_decision_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  kpi_name text;
begin
  select * into d from public.kpi_decisions where id = new.decision_id;
  if d.id is null then return new; end if;
  select name into kpi_name from public.kpis where id = d.kpi_id;

  insert into public.notifications (user_id, title, body, link)
  select uid,
         case when uid = new.mention_user_id then 'تم ذِكرك في متابعة قرار'
              else 'تحديث جديد على قرار تنفيذي' end,
         coalesce('بشأن مؤشر: ' || kpi_name, 'متابعة قرار'),
         '/kpis/' || d.kpi_id
  from (
    select distinct uid from unnest(array[
      d.assigned_user_id, d.created_by, new.mention_user_id
    ]) as t(uid)
    where uid is not null and uid <> new.created_by
  ) targets;
  return new;
end;
$$;

drop trigger if exists trg_notify_dec_upd on public.kpi_decision_updates;
create trigger trg_notify_dec_upd
  after insert on public.kpi_decision_updates
  for each row execute function public.notify_on_decision_update();

-- 6) تذكير بقرب/تجاوز الاستحقاق (يُستدعى يوميًا؛ مانع للتكرار عبر reminded_on)
create or replace function public.remind_due_decisions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  kpi_name text;
  overdue boolean;
begin
  for r in
    select * from public.kpi_decisions
    where status = 'open'
      and assigned_user_id is not null
      and due_date is not null
      and due_date <= current_date + 3
      and (reminded_on is null or reminded_on < current_date)
  loop
    select name into kpi_name from public.kpis where id = r.kpi_id;
    overdue := r.due_date < current_date;
    insert into public.notifications (user_id, title, body, link)
    values (
      r.assigned_user_id,
      case when overdue then 'قرار تنفيذي تجاوز موعد الاستحقاق'
           else 'اقتراب موعد استحقاق قرار تنفيذي' end,
      coalesce('بشأن مؤشر: ' || kpi_name, 'متابعة قرار')
        || ' — الاستحقاق: ' || to_char(r.due_date, 'YYYY-MM-DD'),
      '/kpis/' || r.kpi_id
    );
    update public.kpi_decisions set reminded_on = current_date where id = r.id;
  end loop;
end;
$$;
