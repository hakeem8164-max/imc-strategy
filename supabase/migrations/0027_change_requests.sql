-- نظام «طلبات التغيير»: سلسلة اعتماد متعددة المراحل تطبّق التغيير تلقائيًا عند الاعتماد النهائي
-- المراحل: موظف→مدير الإدارة→مسؤول القياس→الرئيس التنفيذي (المعتمد النهائي)
-- التطبيق عبر دوال SECURITY DEFINER لتجاوز RLS بأمان مع تحقّق الأدوار داخليًا.
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('objective','initiative','kpi','target')),
  action text not null check (action in ('create','update','delete')),
  entity_id uuid,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_manager'
    check (status in ('pending_manager','pending_officer','pending_executive','approved','rejected')),
  requested_by uuid references public.profiles(id) on delete set null,
  requester_unit_id uuid,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists change_requests_status_idx on public.change_requests(status);
create index if not exists change_requests_requester_idx on public.change_requests(requested_by);

alter table public.change_requests enable row level security;
drop policy if exists cr_select on public.change_requests;
create policy cr_select on public.change_requests for select using (auth.uid() is not null);
-- لا سياسات إدراج/تعديل مباشرة: كل العمليات عبر الدوال الآمنة (submit/review)
-- راجع دوال _apply_cr/_notify_cr_stage/_notify_cr_result/submit_change_request/review_change_request
