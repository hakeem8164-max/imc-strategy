-- نسبة إنجاز لكل معلم (0–100%)؛ 100% = مكتمل
alter table public.kpi_initiative_milestones add column if not exists progress int not null default 0 check (progress between 0 and 100);
update public.kpi_initiative_milestones set progress = 100 where done = true and progress = 0;
