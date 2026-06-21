-- منصة المساجد المتكاملة — فترة القياس كمدى تاريخي (بداية - نهاية)
alter table public.kpi_entries add column if not exists period_start date;
alter table public.kpi_entries add column if not exists period_end date;
update public.kpi_entries set period_end = period_date where period_end is null and period_date is not null;
