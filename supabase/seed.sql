-- Glide5 Portal: DEVELOPMENT SAMPLE DATA ONLY
-- Loaded by `supabase db reset` (local) and applied by hand to the dev project.
-- Never run against production: it creates users with a shared, known password.
--
-- Every test user signs in with password:  GlidersDev!2026
--
--   hira.hr@glide5.test      HR admin   People & Culture
--   omar.manager@glide5.test Manager    Engineering  (manages Ali)
--   zara.manager@glide5.test Manager    Sales        (manages Sara)
--   ali.dev@glide5.test      Employee   Engineering
--   sara.sales@glide5.test   Employee   Sales

-- Departments
insert into public.departments (id, name) values
  ('d0000000-0000-4000-8000-000000000001', 'People & Culture'),
  ('d0000000-0000-4000-8000-000000000002', 'Engineering'),
  ('d0000000-0000-4000-8000-000000000003', 'Sales')
on conflict (id) do nothing;

-- Leave types
insert into public.leave_types (id, name, annual_allowance_days) values
  ('a0000000-0000-4000-8000-000000000001', 'Annual leave', 20),
  ('a0000000-0000-4000-8000-000000000002', 'Sick leave', 10),
  ('a0000000-0000-4000-8000-000000000003', 'Unpaid leave', null)
on conflict (id) do nothing;

-- Auth users (the on_auth_user_created trigger creates their profiles)
with seed_users (id, email, full_name) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'hira.hr@glide5.test', 'Hira Khan'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'omar.manager@glide5.test', 'Omar Siddiqui'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'zara.manager@glide5.test', 'Zara Ahmed'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'ali.dev@glide5.test', 'Ali Raza'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'sara.sales@glide5.test', 'Sara Malik')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('GlidersDev!2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', ''
from seed_users
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@glide5.test'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

-- Roles, departments and reporting lines
update public.profiles set role = 'hr_admin', job_title = 'HR Lead',
  department_id = 'd0000000-0000-4000-8000-000000000001', hire_date = '2022-03-01'
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles set role = 'manager', job_title = 'Engineering Manager',
  department_id = 'd0000000-0000-4000-8000-000000000002', hire_date = '2023-01-09'
where id = '22222222-2222-4222-8222-222222222222';

update public.profiles set role = 'manager', job_title = 'Sales Manager',
  department_id = 'd0000000-0000-4000-8000-000000000003', hire_date = '2023-05-15'
where id = '33333333-3333-4333-8333-333333333333';

update public.profiles set job_title = 'Software Engineer',
  department_id = 'd0000000-0000-4000-8000-000000000002',
  manager_id = '22222222-2222-4222-8222-222222222222', hire_date = '2024-02-01'
where id = '44444444-4444-4444-8444-444444444444';

update public.profiles set job_title = 'Account Executive',
  department_id = 'd0000000-0000-4000-8000-000000000003',
  manager_id = '33333333-3333-4333-8333-333333333333', hire_date = '2024-08-19'
where id = '55555555-5555-4555-8555-555555555555';

update public.employee_details set phone = '+92 300 0000004',
  emergency_contact_name = 'Ayesha Raza', emergency_contact_phone = '+92 300 1000004'
where profile_id = '44444444-4444-4444-8444-444444444444';

update public.employee_details set phone = '+92 300 0000005',
  emergency_contact_name = 'Bilal Malik', emergency_contact_phone = '+92 300 1000005'
where profile_id = '55555555-5555-4555-8555-555555555555';

-- Leave requests (dates relative to today so the data stays current)
insert into public.leave_requests (id, employee_id, leave_type_id, start_date, end_date, reason)
values
  ('b0000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444',
   'a0000000-0000-4000-8000-000000000001', current_date + 14, current_date + 18, 'Family wedding'),
  ('b0000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444',
   'a0000000-0000-4000-8000-000000000002', current_date - 31, current_date - 29, 'Flu'),
  ('b0000000-0000-4000-8000-000000000003', '55555555-5555-4555-8555-555555555555',
   'a0000000-0000-4000-8000-000000000001', current_date + 7, current_date + 9, 'Short break')
on conflict (id) do nothing;

-- Mark Ali's sick leave as approved by Omar (seed runs without a signed-in user).
update public.leave_requests
set status = 'approved', reviewed_by = '22222222-2222-4222-8222-222222222222',
    reviewed_at = now(), review_note = 'Get well soon'
where id = 'b0000000-0000-4000-8000-000000000002' and status = 'pending';

-- Announcements
insert into public.announcements (id, title, body, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'Welcome to Glide5 Portal',
   'This is where you will find HR news, request leave and keep your details up to date.',
   '11111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000002', 'Office closed on Friday',
   'The office will be closed this Friday for maintenance. Please work from home.',
   '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;
