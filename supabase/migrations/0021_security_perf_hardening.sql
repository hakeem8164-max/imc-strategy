-- تحصين أمني: منع استدعاء دوال المُحفِّزات/التذكير عبر REST RPC
-- (آمن: المُحفِّزات تعمل عبر آلية الـ trigger ولا تحتاج صلاحية المستخدم)
revoke execute on function public.audit_trigger() from anon, authenticated, public;
revoke execute on function public.notify_on_decision() from anon, authenticated, public;
revoke execute on function public.notify_on_decision_update() from anon, authenticated, public;
revoke execute on function public.notify_on_entry() from anon, authenticated, public;
revoke execute on function public.notify_on_initiative() from anon, authenticated, public;
revoke execute on function public.remind_due_decisions() from anon, authenticated, public;

-- أداء: إزالة سياسة قراءة مكرّرة على profiles (مغطّاة بـ profiles_read_all_authed)
drop policy if exists profiles_read_self on public.profiles;

-- أداء: فهارس تغطية للمفاتيح الأجنبية
create index if not exists audit_log_user_id_idx on public.audit_log (user_id);
create index if not exists invitations_org_unit_id_idx on public.invitations (org_unit_id);
create index if not exists kpi_decision_updates_created_by_idx on public.kpi_decision_updates (created_by);
create index if not exists kpi_decision_updates_mention_idx on public.kpi_decision_updates (mention_user_id);
create index if not exists kpi_decisions_created_by_idx on public.kpi_decisions (created_by);
create index if not exists kpi_entries_created_by_idx on public.kpi_entries (created_by);
create index if not exists kpi_entries_manager_reviewed_by_idx on public.kpi_entries (manager_reviewed_by);
create index if not exists kpi_entries_reviewed_by_idx on public.kpi_entries (reviewed_by);
create index if not exists kpi_initiatives_created_by_idx on public.kpi_initiatives (created_by);
create index if not exists kpis_owner_unit_id_idx on public.kpis (owner_unit_id);
create index if not exists kpis_owner_user_id_idx on public.kpis (owner_user_id);
create index if not exists profiles_org_unit_id_idx on public.profiles (org_unit_id);
