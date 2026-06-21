-- منصة المساجد المتكاملة — تدفّق المراجعة والاعتماد + الوثائق + الإشعارات

alter table public.kpi_entries add column if not exists status text not null default 'submitted';
alter table public.kpi_entries add column if not exists document_url text;
alter table public.kpi_entries add column if not exists document_name text;
alter table public.kpi_entries add column if not exists review_note text;
alter table public.kpi_entries add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.kpi_entries add column if not exists reviewed_at timestamptz;
alter table public.kpi_entries add column if not exists submitted_at timestamptz default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_on_entry()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare kpi_name text; rec record;
begin
  select name into kpi_name from public.kpis where id = NEW.kpi_id;
  if (TG_OP = 'INSERT' and NEW.status = 'submitted')
     or (TG_OP = 'UPDATE' and NEW.status = 'submitted' and OLD.status is distinct from 'submitted') then
    for rec in select id from public.profiles where role = 'admin' loop
      insert into public.notifications (user_id, title, body, link)
      values (rec.id, 'نتيجة بانتظار الاعتماد',
              'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,''),
              '/performance/review');
    end loop;
  end if;
  if TG_OP = 'UPDATE' and NEW.status in ('approved','rejected') and OLD.status is distinct from NEW.status and NEW.created_by is not null then
    insert into public.notifications (user_id, title, body, link)
    values (NEW.created_by,
            case when NEW.status = 'approved' then 'تم اعتماد نتيجتك' else 'تم رفض نتيجتك' end,
            'المؤشر: ' || coalesce(kpi_name,'') || ' — الفترة: ' || coalesce(NEW.period_label,'')
              || case when NEW.status='rejected' and NEW.review_note is not null then ' — السبب: ' || NEW.review_note else '' end,
            '/performance/review');
  end if;
  return NEW;
end;
$fn$;

drop trigger if exists trg_notify_on_entry on public.kpi_entries;
create trigger trg_notify_on_entry
  after insert or update on public.kpi_entries
  for each row execute function public.notify_on_entry();

insert into storage.buckets (id, name, public) values ('kpi-docs','kpi-docs', false)
on conflict (id) do nothing;

drop policy if exists kpi_docs_read on storage.objects;
create policy kpi_docs_read on storage.objects for select to authenticated using (bucket_id = 'kpi-docs');
drop policy if exists kpi_docs_insert on storage.objects;
create policy kpi_docs_insert on storage.objects for insert to authenticated with check (bucket_id = 'kpi-docs');
drop policy if exists kpi_docs_update on storage.objects;
create policy kpi_docs_update on storage.objects for update to authenticated using (bucket_id = 'kpi-docs');
