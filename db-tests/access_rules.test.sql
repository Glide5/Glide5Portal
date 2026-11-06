-- Glide5 Portal: save / load / edit / permission tests.
-- Runs inside one transaction that is rolled back, so it never leaves data behind.
-- Needs the dev seed data (supabase/seed.sql). Run with: npm run test:db
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

begin;

-- ---------------------------------------------------------------------------
-- Test helpers (created inside the transaction, rolled back at the end)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

create table tests.results (n serial, ok boolean, description text);
grant all on tests.results to anon, authenticated;
grant all on sequence tests.results_n_seq to anon, authenticated;

-- Sign in as a seeded user (by email), the same way Supabase passes the JWT.
create function tests.login(p_email text) returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'No seeded user %', p_email; end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated', 'email', p_email)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.logout_to_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

create function tests.uid(p_email text) returns uuid language sql security definer as $$
  select id from auth.users where email = p_email
$$;

create function tests.ok(p_ok boolean, p_desc text) returns void language plpgsql as $$
begin
  insert into tests.results (ok, description) values (coalesce(p_ok, false), p_desc);
  if coalesce(p_ok, false) then
    raise notice 'ok     - %', p_desc;
  else
    raise notice 'FAILED - %', p_desc;
  end if;
end $$;

create function tests.count(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into v;
  return v;
end $$;

-- Rows changed by a statement (0 when access rules hide the row).
create function tests.affected(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute p_sql;
  get diagnostics v = row_count;
  return v;
end $$;

-- True when the statement is refused with an error.
create function tests.refused(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  raise notice '         refused with: %', sqlerrm;
  return true;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signed-out visitors
-- ---------------------------------------------------------------------------
select tests.logout_to_anon();
select tests.ok(tests.refused('select * from public.profiles'), 'Signed-out visitor cannot read profiles');
select tests.ok(tests.refused('select * from public.leave_requests'), 'Signed-out visitor cannot read leave requests');
select tests.ok(tests.refused('select * from public.employee_details'), 'Signed-out visitor cannot read private details');
select tests.ok(tests.refused('select public.is_hr()'), 'Signed-out visitor cannot call role-check functions');
select tests.ok(tests.refused($$select * from public.leave_balances('44444444-4444-4444-8444-444444444444')$$), 'Signed-out visitor cannot call leave balance function');
reset role;

-- ---------------------------------------------------------------------------
-- Employee: Ali (Engineering, reports to Omar)
-- ---------------------------------------------------------------------------
select tests.login('ali.dev@glide5.test');
select tests.ok(tests.count('select * from public.profiles') = 5, 'Employee sees the full directory (5 people)');
select tests.ok(tests.count('select * from public.employee_details') = 1, 'Employee sees only their own private details');
select tests.ok(tests.count('select * from public.leave_requests') = 2, 'Employee sees only their own 2 leave requests');
select tests.ok(tests.count($$select * from public.leave_requests where employee_id = tests.uid('sara.sales@glide5.test')$$) = 0,
  'Employee cannot see a colleague''s leave requests');
select tests.ok(tests.count('select * from public.announcements') = 2, 'Employee reads announcements');
select tests.ok(tests.count('select * from public.leave_types') = 3, 'Employee sees leave types');
select tests.ok(tests.count($$select * from public.leave_balances(auth.uid()) where leave_type = 'Sick leave' and approved_days > 0$$) = 1,
  'Leave balance shows approved sick leave');

-- Saving
select tests.ok(tests.affected($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', current_date + 40, current_date + 42, 'Trip', 'approved')$$) = 1,
  'Employee saves a new leave request');
select tests.ok((select status from public.leave_requests where reason = 'Trip') = 'pending',
  'A new request is always saved as pending, even if "approved" was sent');
select tests.ok(tests.refused($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date)
  values (tests.uid('sara.sales@glide5.test'), 'a0000000-0000-4000-8000-000000000001', current_date + 60, current_date + 61)$$),
  'Employee cannot request leave on behalf of someone else');
select tests.ok(tests.refused($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', current_date + 41, current_date + 45)$$),
  'Overlapping leave requests are refused');
select tests.ok(tests.refused($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', make_date(extract(year from current_date)::int, 1, 1), make_date(extract(year from current_date)::int, 2, 28))$$),
  'Requests beyond the yearly allowance are refused');
select tests.ok(tests.refused($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', current_date + 90, current_date + 80)$$),
  'End date before start date is refused');

-- Editing
select tests.ok(tests.affected($$update public.leave_requests set end_date = current_date + 41 where reason = 'Trip'$$) = 1,
  'Employee edits their own pending request');
select tests.ok(tests.refused($$update public.leave_requests set status = 'approved' where reason = 'Trip'$$),
  'Employee cannot approve their own request');
select tests.ok(tests.refused($$update public.leave_requests set reason = 'Edited' where id = 'b0000000-0000-4000-8000-000000000002'$$),
  'Employee cannot edit a request that was already approved');
select tests.ok(tests.affected($$update public.leave_requests set reason = 'Hacked' where employee_id = tests.uid('sara.sales@glide5.test')$$) = 0,
  'Employee cannot edit a colleague''s request');
select tests.ok(tests.affected($$delete from public.leave_requests where reason = 'Trip'$$) = 0,
  'Leave requests cannot be deleted (cancel instead)');
select tests.ok(tests.affected($$update public.profiles set full_name = 'Ali R.' where id = auth.uid()$$) = 1,
  'Employee edits their own name');
select tests.ok(tests.refused($$update public.profiles set role = 'hr_admin' where id = auth.uid()$$),
  'Employee cannot make themselves an HR admin');
select tests.ok(tests.refused($$update public.profiles set manager_id = null where id = auth.uid()$$),
  'Employee cannot change their own manager');
select tests.ok(tests.affected($$update public.profiles set full_name = 'X' where id = tests.uid('sara.sales@glide5.test')$$) = 0,
  'Employee cannot edit a colleague''s profile');
select tests.ok(tests.affected($$update public.employee_details set phone = '+92 300 1234567' where profile_id = auth.uid()$$) = 1,
  'Employee edits their own private details');
select tests.ok(tests.affected($$update public.employee_details set phone = '0' where profile_id = tests.uid('sara.sales@glide5.test')$$) = 0,
  'Employee cannot edit a colleague''s private details');
select tests.ok(tests.refused($$insert into public.announcements (title, body) values ('Hi', 'Not allowed')$$),
  'Employee cannot post announcements');
select tests.ok(tests.refused($$insert into public.departments (name) values ('Shadow IT')$$),
  'Employee cannot add departments');
select tests.ok(tests.refused('select public.handle_new_auth_user()'), 'Employee cannot call internal trigger functions');
reset role;

-- ---------------------------------------------------------------------------
-- Manager: Omar (manages Ali) and Zara (manages Sara)
-- ---------------------------------------------------------------------------
select tests.login('omar.manager@glide5.test');
select tests.ok(tests.count('select * from public.leave_requests') = 3, 'Manager sees their direct report''s requests (3 for Ali)');
select tests.ok(tests.count($$select * from public.leave_requests where employee_id = tests.uid('sara.sales@glide5.test')$$) = 0,
  'Manager cannot see requests from another team');
select tests.ok(tests.count('select * from public.employee_details') = 1, 'Manager cannot see their reports'' private details');
select tests.ok(tests.refused($$update public.leave_requests set end_date = current_date + 50 where reason = 'Trip'$$),
  'Manager cannot change the dates of a report''s request');
select tests.ok(tests.affected($$update public.leave_requests set status = 'approved', review_note = 'Enjoy' where id = 'b0000000-0000-4000-8000-000000000001'$$) = 1,
  'Manager approves their report''s request');
select tests.ok((select reviewed_by = auth.uid() and reviewed_at is not null from public.leave_requests where id = 'b0000000-0000-4000-8000-000000000001'),
  'Approval records who reviewed it and when');
select tests.ok(tests.affected($$update public.leave_requests set status = 'rejected', review_note = 'Busy sprint' where reason = 'Trip'$$) = 1,
  'Manager rejects a request');
select tests.ok(tests.refused($$update public.leave_requests set status = 'pending' where reason = 'Trip'$$),
  'A rejected request cannot be reopened');
select tests.ok(tests.affected($$update public.profiles set job_title = 'CTO' where id = tests.uid('ali.dev@glide5.test')$$) = 0,
  'Manager cannot edit employee records (HR only)');
reset role;

select tests.login('zara.manager@glide5.test');
select tests.ok(tests.count('select * from public.leave_requests') = 1, 'Other manager sees only their own team''s request');
select tests.ok(tests.affected($$update public.leave_requests set status = 'approved' where employee_id = tests.uid('ali.dev@glide5.test')$$) = 0,
  'Manager cannot approve requests from another team');
reset role;

-- ---------------------------------------------------------------------------
-- HR admin: Hira
-- ---------------------------------------------------------------------------
select tests.login('hira.hr@glide5.test');
select tests.ok(tests.count('select * from public.leave_requests') = 4, 'HR sees every leave request');
select tests.ok(tests.count('select * from public.employee_details') = 5, 'HR sees everyone''s private details');
select tests.ok(tests.affected($$update public.profiles set job_title = 'Senior Software Engineer' where id = tests.uid('ali.dev@glide5.test')$$) = 1,
  'HR edits an employee record');
select tests.ok(tests.refused($$update public.profiles set manager_id = tests.uid('ali.dev@glide5.test') where id = tests.uid('omar.manager@glide5.test')$$),
  'Reporting lines cannot loop (Omar cannot report to Ali)');
select tests.ok(tests.refused($$update public.profiles set role = 'employee' where id = auth.uid()$$),
  'The last HR admin cannot remove their own HR role');
select tests.ok(tests.affected($$update public.leave_requests set status = 'cancelled' where id = 'b0000000-0000-4000-8000-000000000002'$$) = 1,
  'HR cancels leave that was already approved');
select tests.ok(tests.affected($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date, reason)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', current_date + 100, current_date + 102, 'HR holiday')$$) = 1,
  'HR admin requests their own leave');
select tests.ok(tests.refused($$update public.leave_requests set status = 'approved' where reason = 'HR holiday'$$),
  'HR admin cannot approve their own leave');
select tests.ok(tests.affected($$insert into public.announcements (title, body) values ('Payroll date', 'Salaries are paid on the 1st.')$$) = 1,
  'HR posts an announcement');
select tests.ok(tests.affected($$update public.leave_types set annual_allowance_days = 22 where name = 'Annual leave'$$) = 1,
  'HR edits leave types');
select tests.ok(tests.affected($$update public.profiles set status = 'terminated' where id = tests.uid('sara.sales@glide5.test')$$) = 1,
  'HR marks an employee as terminated');
reset role;

-- ---------------------------------------------------------------------------
-- Terminated employee: Sara
-- ---------------------------------------------------------------------------
select tests.login('sara.sales@glide5.test');
select tests.ok(tests.count('select * from public.announcements') = 0, 'Terminated employee loses access to announcements');
select tests.ok(tests.count('select * from public.leave_requests') = 0, 'Terminated employee loses access to leave requests');
select tests.ok(tests.count('select * from public.profiles') = 1, 'Terminated employee only sees their own profile');
select tests.ok(tests.refused($$insert into public.leave_requests (employee_id, leave_type_id, start_date, end_date)
  values (auth.uid(), 'a0000000-0000-4000-8000-000000000001', current_date + 120, current_date + 121)$$),
  'Terminated employee cannot request leave');
reset role;

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
do $$
declare v_total int; v_failed int;
begin
  select count(*), count(*) filter (where not ok) into v_total, v_failed from tests.results;
  if v_failed > 0 then
    raise exception '% of % tests FAILED', v_failed, v_total;
  end if;
  raise notice '----';
  raise notice 'All % tests passed', v_total;
end $$;

rollback;
