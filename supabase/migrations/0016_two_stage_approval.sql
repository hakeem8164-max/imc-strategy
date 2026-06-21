-- منصة المساجد المتكاملة — دور الموظف ومسار اعتماد من مرحلتين
-- ملاحظة: قِيَم enum 'executive' و 'employee' تُضاف عبر:
--   alter type user_role add value if not exists 'executive';
--   alter type user_role add value if not exists 'employee';

alter table public.kpi_entries add column if not exists manager_reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.kpi_entries add column if not exists manager_reviewed_at timestamptz;

create or replace function public.can_edit_kpi(p_kpi_id uuid)
returns boolean language sql security definer set search_path = public stable
as $fn$
  select public.is_admin() or exists (
    select 1 from public.kpis k
    join public.profiles pr on pr.id = auth.uid()
    where k.id = p_kpi_id and pr.role in ('owner','employee')
      and (
        k.owner_user_id = auth.uid()
        or (k.owner_title is not null and k.owner_title = pr.title)
        or (k.owner_unit_id is not null and k.owner_unit_id = pr.org_unit_id)
      )
  );
$fn$;
revoke all on function public.can_edit_kpi(uuid) from anon, public;
grant execute on function public.can_edit_kpi(uuid) to authenticated;

insert into public.role_permissions (role, permission, allowed) values
  ('executive','view_dashboard',true),('executive','view_kpis',true),('executive','enter_values',false),
  ('executive','manage_kpis',false),('executive','manage_users',false),('executive','manage_org',false),('executive','manage_permissions',false),
  ('employee','view_dashboard',true),('employee','view_kpis',true),('employee','enter_values',true),
  ('employee','manage_kpis',false),('employee','manage_users',false),('employee','manage_org',false),('employee','manage_permissions',false)
on conflict (role, permission) do nothing;

create or replace function public.notify_on_entry()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare kpi_name text; unit uuid; rec record;
begin
  select name, owner_unit_id into kpi_name, unit from public.kpis where id = NEW.kpi_id;
  if TG_OP = 'INSERT' then
    if NEW.status = 'pending_manager' then
      for rec in select id from public.profiles where role = 'owner' and org_unit_id = unit loop
        insert into public.notifications (user_id, title, body, link)
        values (rec.id, 'نتيجة بانتظار اعتمادك (مدير الإدارة)',
                'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,''), '/performance/review');
      end loop;
    elsif NEW.status = 'pending_officer' then
      for rec in select id from public.profiles where role = 'admin' loop
        insert into public.notifications (user_id, title, body, link)
        values (rec.id, 'نتيجة بانتظار الاعتماد النهائي',
                'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,''), '/performance/review');
      end loop;
    end if;
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    if NEW.status = 'pending_officer' then
      for rec in select id from public.profiles where role = 'admin' loop
        insert into public.notifications (user_id, title, body, link)
        values (rec.id, 'نتيجة بانتظار الاعتماد النهائي',
                'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,''), '/performance/review');
      end loop;
    elsif NEW.status in ('approved','rejected') and NEW.created_by is not null then
      insert into public.notifications (user_id, title, body, link)
      values (NEW.created_by,
              case when NEW.status='approved' then 'تم اعتماد نتيجتك نهائيًا' else 'أُعيدت/رُفضت نتيجتك' end,
              'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,'')
                || case when NEW.status='rejected' and NEW.review_note is not null then ' — السبب: ' || NEW.review_note else '' end,
              '/performance/review');
    end if;
  end if;
  return NEW;
end;
$fn$;
