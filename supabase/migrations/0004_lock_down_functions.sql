-- منصة المساجد المتكاملة — تقييد تنفيذ الدوال الداخلية (معالجة تنبيهات Security Advisor)
-- يمنع استدعاءها عبر REST RPC من غير المصرّح لهم مع إبقائها متاحة لسياسات RLS
revoke all on function public.is_admin() from anon, public;
revoke all on function public.can_edit_kpi(uuid) from anon, public;
revoke all on function public.handle_new_user() from anon, authenticated, public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_edit_kpi(uuid) to authenticated;
