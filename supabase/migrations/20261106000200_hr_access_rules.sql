-- Glide5 Portal: access rules (row level security)
--
-- Roles (profiles.role):
--   employee  - sees the directory, departments, leave types and announcements;
--               manages their own private details and leave requests.
--   manager   - everything an employee can do, plus reads and reviews leave
--               requests of their direct reports.
--   hr_admin  - full access to all HR records; cannot approve their own leave.
-- Terminated employees lose all access. Signed-out visitors (anon) get nothing.

-- Signed-out visitors get no table access at all.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.employee_details enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.announcements enable row level security;

-- Departments -------------------------------------------------------------
create policy "Active employees can view departments"
  on public.departments for select to authenticated
  using (public.is_active_user());

create policy "HR can add departments"
  on public.departments for insert to authenticated
  with check (public.is_hr());

create policy "HR can edit departments"
  on public.departments for update to authenticated
  using (public.is_hr()) with check (public.is_hr());

create policy "HR can delete departments"
  on public.departments for delete to authenticated
  using (public.is_hr());

-- Profiles (company directory) ---------------------------------------------
-- Profiles are created by the auth trigger and removed with the auth user,
-- so there are no insert or delete policies.
create policy "Active employees can view the directory"
  on public.profiles for select to authenticated
  using (public.is_active_user() or id = auth.uid());

create policy "Employees can edit their own profile; HR can edit any"
  on public.profiles for update to authenticated
  using (public.is_active_user() and (id = auth.uid() or public.is_hr()))
  with check (id = auth.uid() or public.is_hr());

-- Private employee details -------------------------------------------------
create policy "Employees and HR can view private details"
  on public.employee_details for select to authenticated
  using (public.is_active_user() and (profile_id = auth.uid() or public.is_hr()));

create policy "Employees and HR can add private details"
  on public.employee_details for insert to authenticated
  with check (public.is_active_user() and (profile_id = auth.uid() or public.is_hr()));

create policy "Employees and HR can edit private details"
  on public.employee_details for update to authenticated
  using (public.is_active_user() and (profile_id = auth.uid() or public.is_hr()))
  with check (profile_id = auth.uid() or public.is_hr());

-- Leave types --------------------------------------------------------------
create policy "Active employees can view leave types"
  on public.leave_types for select to authenticated
  using (public.is_active_user());

create policy "HR can add leave types"
  on public.leave_types for insert to authenticated
  with check (public.is_hr());

create policy "HR can edit leave types"
  on public.leave_types for update to authenticated
  using (public.is_hr()) with check (public.is_hr());

-- Leave types are retired with is_active = false rather than deleted,
-- so past requests keep their type. No delete policy.

-- Leave requests -----------------------------------------------------------
create policy "Employees, their managers and HR can view leave requests"
  on public.leave_requests for select to authenticated
  using (
    public.is_active_user()
    and (employee_id = auth.uid() or public.is_manager_of(employee_id) or public.is_hr())
  );

create policy "Employees can request leave for themselves"
  on public.leave_requests for insert to authenticated
  with check (public.is_active_user() and employee_id = auth.uid());

-- Which changes are allowed (edit, cancel, approve, reject) is enforced by
-- the enforce_leave_request_rules trigger.
create policy "Employees, their managers and HR can update leave requests"
  on public.leave_requests for update to authenticated
  using (
    public.is_active_user()
    and (employee_id = auth.uid() or public.is_manager_of(employee_id) or public.is_hr())
  )
  with check (employee_id = auth.uid() or public.is_manager_of(employee_id) or public.is_hr());

-- Requests are cancelled, not deleted, to keep an audit trail. No delete policy.

-- Announcements ------------------------------------------------------------
create policy "Active employees can read announcements"
  on public.announcements for select to authenticated
  using (public.is_active_user() and (published_at <= now() or public.is_hr()));

create policy "HR can post announcements"
  on public.announcements for insert to authenticated
  with check (public.is_hr());

create policy "HR can edit announcements"
  on public.announcements for update to authenticated
  using (public.is_hr()) with check (public.is_hr());

create policy "HR can delete announcements"
  on public.announcements for delete to authenticated
  using (public.is_hr());
