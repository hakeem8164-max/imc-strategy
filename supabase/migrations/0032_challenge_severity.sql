-- تصنيف خطورة التحدّي: منخفض/متوسط/عالي/حرج (الحرِج يظهر بلوحة الأداء التنفيذية)
alter table public.kpi_initiative_updates
  add column if not exists severity text check (severity in ('low','medium','high','critical'));
create index if not exists kpi_iu_severity_idx on public.kpi_initiative_updates (severity) where severity = 'critical';
