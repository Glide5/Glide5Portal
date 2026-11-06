-- Glide5 Portal: follow-up from the Supabase security and performance advisors.
--
-- 1. Postgres lets everyone (PUBLIC) run new functions by default, so the
--    earlier "revoke from anon" was not enough. Functions are now callable
--    only by the roles that need them.
-- 2. Access rules evaluate auth.uid() and the role checks once per query
--    instead of once per row.
-- 3. Indexes for foreign keys that had none.

-- 1. Function access -------------------------------------------------------

-- Future functions in public are not runnable by everyone by default.
-- Grant EXECUTE explicitly to the roles that need each new function.
alter default privileges in schema public revoke execute on functions from public;

-- Trigger functions run automatically; nobody needs to call them directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_email_change() from public, anon, authenticated;
revoke execute on function public.enforce_profile_rules() from public, anon, authenticated;
revoke execute on function public.enforce_leave_request_rules() from public, anon, authenticated;

-- Role checks are used by the access rules, which run as the signed-in user,
-- so signed-in users keep EXECUTE. They only reveal facts about the caller.
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.is_hr() from public, anon;
revoke execute on function public.is_manager_of(uuid) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_hr() to authenticated;
grant execute on function public.is_manager_of(uuid) to authenticated;

revoke execute on function public.business_days(date, date) from public, anon;
grant execute on function public.business_days(date, date) to authenticated;

revoke execute on function public.leave_balances(uuid, integer) from public, anon;
grant execute on function public.leave_balances(uuid, integer) to authenticated;

-- 2. Access rules evaluated once per query ---------------------------------

drop policy "Active employees can view the directory" on public.profiles;
create policy "Active employees can view the directory"
  on public.profiles for select to authenticated
  using ((select public.is_active_user()) or id = (select auth.uid()));

drop policy "Employees can edit their own profile; HR can edit any" on public.profiles;
create policy "Employees can edit their own profile; HR can edit any"
  on public.profiles for update to authenticated
  using ((select public.is_active_user()) and (id = (select auth.uid()) or (select public.is_hr())))
  with check (id = (select auth.uid()) or (select public.is_hr()));

drop policy "Employees and HR can view private details" on public.employee_details;
create policy "Employees and HR can view private details"
  on public.employee_details for select to authenticated
  using ((select public.is_active_user()) and (profile_id = (select auth.uid()) or (select public.is_hr())));

drop policy "Employees and HR can add private details" on public.employee_details;
create policy "Employees and HR can add private details"
  on public.employee_details for insert to authenticated
  with check ((select public.is_active_user()) and (profile_id = (select auth.uid()) or (select public.is_hr())));

drop policy "Employees and HR can edit private details" on public.employee_details;
create policy "Employees and HR can edit private details"
  on public.employee_details for update to authenticated
  using ((select public.is_active_user()) and (profile_id = (select auth.uid()) or (select public.is_hr())))
  with check (profile_id = (select auth.uid()) or (select public.is_hr()));

drop policy "Employees, their managers and HR can view leave requests" on public.leave_requests;
create policy "Employees, their managers and HR can view leave requests"
  on public.leave_requests for select to authenticated
  using (
    (select public.is_active_user())
    and (employee_id = (select auth.uid()) or (select public.is_hr()) or public.is_manager_of(employee_id))
  );

drop policy "Employees can request leave for themselves" on public.leave_requests;
create policy "Employees can request leave for themselves"
  on public.leave_requests for insert to authenticated
  with check ((select public.is_active_user()) and employee_id = (select auth.uid()));

drop policy "Employees, their managers and HR can update leave requests" on public.leave_requests;
create policy "Employees, their managers and HR can update leave requests"
  on public.leave_requests for update to authenticated
  using (
    (select public.is_active_user())
    and (employee_id = (select auth.uid()) or (select public.is_hr()) or public.is_manager_of(employee_id))
  )
  with check (employee_id = (select auth.uid()) or (select public.is_hr()) or public.is_manager_of(employee_id));

-- 3. Foreign key indexes ---------------------------------------------------
create index if not exists announcements_created_by_idx on public.announcements (created_by);
create index if not exists leave_requests_leave_type_id_idx on public.leave_requests (leave_type_id);
create index if not exists leave_requests_reviewed_by_idx on public.leave_requests (reviewed_by);
