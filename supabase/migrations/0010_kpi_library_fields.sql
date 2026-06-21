-- منصة المساجد المتكاملة — حقول مكتبة المؤشرات
alter table public.kpis add column if not exists owner_unit_id uuid references public.org_units(id) on delete set null;
alter table public.kpis add column if not exists polarity text not null default 'positive';  -- positive | negative
alter table public.kpis add column if not exists aggregation text not null default 'sum';     -- cumulative | sum | last | average
alter table public.kpis add column if not exists target_q1 numeric;
alter table public.kpis add column if not exists target_q2 numeric;
alter table public.kpis add column if not exists target_total numeric;
alter table public.kpis add column if not exists is_active boolean not null default true;
