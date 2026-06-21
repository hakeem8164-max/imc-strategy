-- إرفاق وثيقة لكل مخرج
alter table public.kpi_initiative_deliverables add column if not exists doc_url text;
alter table public.kpi_initiative_deliverables add column if not exists doc_name text;
