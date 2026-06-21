-- جدولة تذكيرات استحقاق القرارات يوميًا (يتطلب pg_cron)
create extension if not exists pg_cron with schema pg_cron;

select cron.unschedule('decision-due-reminders')
where exists (select 1 from cron.job where jobname = 'decision-due-reminders');

-- يوميًا الساعة 06:00 UTC
select cron.schedule(
  'decision-due-reminders',
  '0 6 * * *',
  $$select public.remind_due_decisions();$$
);
