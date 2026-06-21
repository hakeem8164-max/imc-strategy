-- ربط المبادرات بالأهداف (إضافةً للربط بالمؤشر) — تصبح المبادرة على مستوى الهدف الاستراتيجي
alter table public.kpi_initiatives alter column kpi_id drop not null;
alter table public.kpi_initiatives add column if not exists objective_id uuid references public.objectives(id) on delete cascade;
create index if not exists kpi_initiatives_objective_idx on public.kpi_initiatives (objective_id);
