-- منصة المساجد المتكاملة — إضافة طبقة «الأهداف» بين المنظور والمؤشر
-- المنظور (dimensions) ← الهدف (objectives) ← المؤشر (kpis)

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  dimension_id uuid not null references public.dimensions(id) on delete cascade,
  code text,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (dimension_id, name)
);
create index if not exists objectives_dimension_idx on public.objectives(dimension_id);

-- ربط المؤشر بالهدف (إضافي؛ يبقى dimension_id كمنظور للتوافق مع التجميع الحالي)
alter table public.kpis add column if not exists objective_id uuid references public.objectives(id) on delete set null;
create index if not exists kpis_objective_idx on public.kpis(objective_id);

-- RLS: قراءة لكل مسجّل، تعديل للمدير
alter table public.objectives enable row level security;
drop policy if exists objectives_read on public.objectives;
create policy objectives_read on public.objectives for select to authenticated using (true);
drop policy if exists objectives_admin on public.objectives;
create policy objectives_admin on public.objectives for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- تدقيق
drop trigger if exists trg_audit_objectives on public.objectives;
create trigger trg_audit_objectives
  after insert or update or delete on public.objectives
  for each row execute function public.audit_trigger();
