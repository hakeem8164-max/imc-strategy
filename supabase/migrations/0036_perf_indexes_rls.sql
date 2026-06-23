-- تحسينات الأداء:
-- (1) فهارس مغطّية للمفاتيح الأجنبية غير المفهرسة (تُسرّع الحذف/الربط)
-- (2) إعادة كتابة سياسات RLS لتقييم auth.uid() مرّة واحدة بدل كل صف

-- ========== (1) فهارس المفاتيح الأجنبية ==========
create index if not exists change_requests_reviewed_by_idx
  on public.change_requests (reviewed_by);
create index if not exists kpi_initiative_update_replies_created_by_idx
  on public.kpi_initiative_update_replies (created_by);
create index if not exists kpi_initiative_updates_created_by_idx
  on public.kpi_initiative_updates (created_by);
create index if not exists kpi_initiatives_owner_unit_id_idx
  on public.kpi_initiatives (owner_unit_id);
create index if not exists meeting_recommendations_created_by_idx
  on public.meeting_recommendations (created_by);
create index if not exists meeting_recommendations_domain_id_idx
  on public.meeting_recommendations (domain_id);
create index if not exists meeting_recommendations_owner_unit_id_idx
  on public.meeting_recommendations (owner_unit_id);
create index if not exists meetings_created_by_idx
  on public.meetings (created_by);
create index if not exists recommendation_participants_org_unit_id_idx
  on public.recommendation_participants (org_unit_id);
create index if not exists recommendation_update_replies_created_by_idx
  on public.recommendation_update_replies (created_by);
create index if not exists recommendation_updates_created_by_idx
  on public.recommendation_updates (created_by);

-- ========== (2) إعادة كتابة سياسات RLS ==========
alter policy cr_select on public.change_requests
  using ((select auth.uid()) is not null);

alter policy dec_upd_delete on public.kpi_decision_updates
  using ((created_by = (select auth.uid())) or (exists (
    select 1 from profiles p
    where ((p.id = (select auth.uid())) and (p.role = any (array['admin'::user_role, 'executive'::user_role]))))));

alter policy dec_upd_select on public.kpi_decision_updates
  using ((select auth.uid()) is not null);

alter policy dec_update on public.kpi_decisions
  using ((assigned_user_id = (select auth.uid())) or (exists (
    select 1 from profiles p
    where ((p.id = (select auth.uid())) and (p.role = any (array['admin'::user_role, 'executive'::user_role]))))));

alter policy kpi_decisions_delete on public.kpi_decisions
  using (exists (
    select 1 from profiles p
    where ((p.id = (select auth.uid())) and (p.role = any (array['admin'::user_role, 'executive'::user_role])))));

alter policy kpi_decisions_select on public.kpi_decisions
  using ((select auth.uid()) is not null);

alter policy del_all on public.kpi_initiative_deliverables
  using (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_deliverables.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))))
  with check (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_deliverables.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))));

alter policy del_select on public.kpi_initiative_deliverables
  using ((select auth.uid()) is not null);

alter policy ms_all on public.kpi_initiative_milestones
  using (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_milestones.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))))
  with check (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_milestones.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))));

alter policy ms_select on public.kpi_initiative_milestones
  using ((select auth.uid()) is not null);

alter policy iur_all on public.kpi_initiative_update_replies
  using (exists (
    select 1 from (kpi_initiative_updates u join kpi_initiatives i on ((i.id = u.initiative_id)))
    where ((u.id = kpi_initiative_update_replies.update_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))))
  with check (exists (
    select 1 from (kpi_initiative_updates u join kpi_initiatives i on ((i.id = u.initiative_id)))
    where ((u.id = kpi_initiative_update_replies.update_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))));

alter policy iur_select on public.kpi_initiative_update_replies
  using ((select auth.uid()) is not null);

alter policy iu_all on public.kpi_initiative_updates
  using (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_updates.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))))
  with check (exists (
    select 1 from kpi_initiatives i
    where ((i.id = kpi_initiative_updates.initiative_id) and ((i.owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(i.kpi_id)))));

alter policy iu_select on public.kpi_initiative_updates
  using ((select auth.uid()) is not null);

alter policy init_select on public.kpi_initiatives
  using ((select auth.uid()) is not null);

alter policy init_update on public.kpi_initiatives
  using ((owner_user_id = (select auth.uid())) or can_manage_kpi_initiative(kpi_id));

alter policy rec_read on public.meeting_recommendations
  using ((select auth.uid()) is not null);

alter policy rec_update on public.meeting_recommendations
  using (can_manage_meetings() or (owner_user_id = (select auth.uid())));

alter policy mt_read on public.meetings
  using ((select auth.uid()) is not null);

alter policy notif_read on public.notifications
  using (user_id = (select auth.uid()));

alter policy notif_update on public.notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy profiles_read_all_authed on public.profiles
  using ((select auth.uid()) is not null);

alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()))
  with check ((id = (select auth.uid())) and (role = (
    select profiles_1.role from profiles profiles_1 where (profiles_1.id = (select auth.uid())))));

alter policy rd_read on public.recommendation_domains
  using ((select auth.uid()) is not null);

alter policy rp_read on public.recommendation_participants
  using ((select auth.uid()) is not null);

alter policy rr_all on public.recommendation_update_replies
  using (exists (
    select 1 from (recommendation_updates u join meeting_recommendations r on ((r.id = u.recommendation_id)))
    where ((u.id = recommendation_update_replies.update_id) and ((r.owner_user_id = (select auth.uid())) or can_manage_meetings()))))
  with check (exists (
    select 1 from (recommendation_updates u join meeting_recommendations r on ((r.id = u.recommendation_id)))
    where ((u.id = recommendation_update_replies.update_id) and ((r.owner_user_id = (select auth.uid())) or can_manage_meetings()))));

alter policy rr_read on public.recommendation_update_replies
  using ((select auth.uid()) is not null);

alter policy ru_all on public.recommendation_updates
  using (can_manage_meetings() or (exists (
    select 1 from meeting_recommendations r
    where ((r.id = recommendation_updates.recommendation_id) and (r.owner_user_id = (select auth.uid()))))))
  with check (can_manage_meetings() or (exists (
    select 1 from meeting_recommendations r
    where ((r.id = recommendation_updates.recommendation_id) and (r.owner_user_id = (select auth.uid()))))));

alter policy ru_read on public.recommendation_updates
  using ((select auth.uid()) is not null);
