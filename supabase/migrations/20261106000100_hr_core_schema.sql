-- Glide5 Portal: core HR schema
-- Records: departments, employee profiles, private employee details,
-- leave types, leave requests and company announcements.
-- Access rules (row level security) live in the next migration.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('employee', 'manager', 'hr_admin');
create type public.employment_status as enum ('active', 'on_leave', 'terminated');
create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Number of working days (Monday to Friday) between two dates, inclusive.
-- Public holidays are not excluded yet (see README: open business rules).
create function public.business_days(p_start date, p_end date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select count(*)::integer
  from generate_series(p_start, p_end, interval '1 day') as d
  where extract(isodow from d) < 6;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

-- One row per signed-in user (created automatically when an auth user is added).
-- Visible to every active employee as the company directory.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '' check (char_length(full_name) <= 200),
  job_title text check (char_length(job_title) <= 200),
  department_id uuid references public.departments (id) on delete set null,
  manager_id uuid references public.profiles (id) on delete set null,
  role public.app_role not null default 'employee',
  status public.employment_status not null default 'active',
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_not_own_manager check (manager_id is null or manager_id <> id)
);
create index profiles_manager_id_idx on public.profiles (manager_id);
create index profiles_department_id_idx on public.profiles (department_id);

-- Personal data: visible only to the employee and HR admins.
create table public.employee_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (char_length(phone) <= 50),
  address text check (char_length(address) <= 500),
  date_of_birth date,
  emergency_contact_name text check (char_length(emergency_contact_name) <= 200),
  emergency_contact_phone text check (char_length(emergency_contact_phone) <= 50),
  updated_at timestamptz not null default now()
);

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 100),
  -- Working days allowed per calendar year. NULL means no limit (e.g. unpaid leave).
  annual_allowance_days integer check (annual_allowance_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id),
  start_date date not null,
  end_date date not null,
  days integer generated always as (public.business_days(start_date, end_date)) stored,
  reason text check (char_length(reason) <= 1000),
  status public.leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_dates_valid check (end_date >= start_date),
  constraint leave_requests_has_working_days check (days > 0)
);
create index leave_requests_employee_id_idx on public.leave_requests (employee_id);
create index leave_requests_status_idx on public.leave_requests (status);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(body) <= 10000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger employee_details_set_updated_at before update on public.employee_details
  for each row execute function public.set_updated_at();
create trigger leave_requests_set_updated_at before update on public.leave_requests
  for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers used by access rules. SECURITY DEFINER so they can read
-- profiles without recursing into the profiles access rules.
-- ---------------------------------------------------------------------------
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.status <> 'terminated';
$$;

-- True for any signed-in employee who has not been terminated.
create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status <> 'terminated'
  );
$$;

create function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'hr_admin', false);
$$;

-- True when the signed-in user is a manager (or HR admin) and is the
-- direct manager of the given employee.
create function public.is_manager_of(p_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('manager', 'hr_admin'), false)
     and exists (
       select 1 from public.profiles p
       where p.id = p_employee and p.manager_id = auth.uid()
     );
$$;

-- ---------------------------------------------------------------------------
-- New auth users get a profile and an empty private-details row.
-- ---------------------------------------------------------------------------
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  insert into public.employee_details (profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep profiles.email in step when a user changes their sign-in email.
create function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- Business rules on profiles
-- ---------------------------------------------------------------------------
create function public.enforce_profile_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- Server-side jobs (service key, migrations, seed) have no signed-in user.
  if v_actor is not null and not public.is_hr() then
    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.manager_id is distinct from old.manager_id
      or new.department_id is distinct from old.department_id
      or new.job_title is distinct from old.job_title
      or new.hire_date is distinct from old.hire_date
      or new.email is distinct from old.email then
      raise exception 'Only HR admins can change role, status, manager, department, job title, hire date or email'
        using errcode = '42501';
    end if;
  end if;

  if new.id <> old.id then
    raise exception 'Profile id cannot change' using errcode = '42501';
  end if;

  -- Never leave the company without an active HR admin.
  if old.role = 'hr_admin' and old.status <> 'terminated'
     and (new.role <> 'hr_admin' or new.status = 'terminated')
     and not exists (
       select 1 from public.profiles p
       where p.id <> old.id and p.role = 'hr_admin' and p.status <> 'terminated'
     ) then
    raise exception 'At least one active HR admin is required' using errcode = '23514';
  end if;

  -- Managers must be active employees and reporting lines cannot loop.
  if new.manager_id is not null and new.manager_id is distinct from old.manager_id then
    if exists (
      with recursive chain as (
        select p.id, p.manager_id from public.profiles p where p.id = new.manager_id
        union
        select p.id, p.manager_id from public.profiles p join chain c on p.id = c.manager_id
      )
      select 1 from chain where id = new.id
    ) then
      raise exception 'Reporting line would create a loop' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_rules
  before update on public.profiles
  for each row execute function public.enforce_profile_rules();

-- ---------------------------------------------------------------------------
-- Business rules on leave requests
-- ---------------------------------------------------------------------------
create function public.enforce_leave_request_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_is_owner boolean;
  v_is_reviewer boolean;
  v_allowance integer;
  v_type_active boolean;
  v_used integer;
begin
  if tg_op = 'INSERT' then
    -- New requests always start as pending and unreviewed.
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
  else
    if new.employee_id <> old.employee_id then
      raise exception 'A leave request cannot be moved to another employee' using errcode = '42501';
    end if;

    if v_actor is not null then
      v_is_owner := (old.employee_id = v_actor);
      v_is_reviewer := (not v_is_owner) and (public.is_hr() or public.is_manager_of(old.employee_id));

      if old.status = 'pending' and v_is_owner then
        -- Employees may edit or cancel their own pending request, never approve it.
        if new.status not in ('pending', 'cancelled') then
          raise exception 'You cannot review your own leave request' using errcode = '42501';
        end if;
        new.reviewed_by := null;
        new.reviewed_at := null;
        new.review_note := null;
      elsif old.status = 'pending' and v_is_reviewer then
        -- Reviewers may only decide; they cannot rewrite the request.
        if new.leave_type_id <> old.leave_type_id
          or new.start_date <> old.start_date
          or new.end_date <> old.end_date
          or new.reason is distinct from old.reason then
          raise exception 'Reviewers cannot change the details of a request' using errcode = '42501';
        end if;
        if new.status not in ('approved', 'rejected') then
          raise exception 'Reviewers can only approve or reject a request' using errcode = '42501';
        end if;
        new.reviewed_by := v_actor;
        new.reviewed_at := now();
      elsif old.status = 'approved' and new.status = 'cancelled' and public.is_hr() and not v_is_owner then
        -- HR may cancel leave that was already approved.
        if new.leave_type_id <> old.leave_type_id
          or new.start_date <> old.start_date
          or new.end_date <> old.end_date then
          raise exception 'Cancelling cannot change the request details' using errcode = '42501';
        end if;
        new.reviewed_by := v_actor;
        new.reviewed_at := now();
      else
        raise exception 'This leave request can no longer be changed' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Validate type, overlap and allowance whenever the request is (still) active.
  if new.status in ('pending', 'approved')
     and (tg_op = 'INSERT'
          or new.start_date <> old.start_date
          or new.end_date <> old.end_date
          or new.leave_type_id <> old.leave_type_id) then
    -- Serialise checks per employee so two requests saved at once cannot
    -- both pass the overlap and allowance checks.
    perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text, 0));

    if new.end_date < new.start_date then
      raise exception 'The end date must be on or after the start date' using errcode = '23514';
    end if;
    if public.business_days(new.start_date, new.end_date) = 0 then
      raise exception 'The selected dates do not include any working days' using errcode = '23514';
    end if;

    select lt.annual_allowance_days, lt.is_active
      into v_allowance, v_type_active
      from public.leave_types lt where lt.id = new.leave_type_id;

    if not coalesce(v_type_active, false) then
      raise exception 'This leave type is not available' using errcode = '23514';
    end if;

    if exists (
      select 1 from public.leave_requests r
      where r.employee_id = new.employee_id
        and r.id <> new.id
        and r.status in ('pending', 'approved')
        and daterange(r.start_date, r.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
    ) then
      raise exception 'These dates overlap another pending or approved request' using errcode = '23P01';
    end if;

    if v_allowance is not null then
      select coalesce(sum(r.days), 0) into v_used
      from public.leave_requests r
      where r.employee_id = new.employee_id
        and r.id <> new.id
        and r.leave_type_id = new.leave_type_id
        and r.status in ('pending', 'approved')
        and extract(year from r.start_date) = extract(year from new.start_date);

      if v_used + public.business_days(new.start_date, new.end_date) > v_allowance then
        raise exception 'Not enough leave remaining: % of % days already booked this year', v_used, v_allowance
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger leave_requests_enforce_rules
  before insert or update on public.leave_requests
  for each row execute function public.enforce_leave_request_rules();

-- ---------------------------------------------------------------------------
-- Leave balance for one employee and year. SECURITY INVOKER, so the caller
-- only gets numbers for requests they are allowed to see.
-- ---------------------------------------------------------------------------
create function public.leave_balances(p_employee uuid, p_year integer default extract(year from current_date)::integer)
returns table (
  leave_type_id uuid,
  leave_type text,
  allowance integer,
  approved_days integer,
  pending_days integer,
  remaining integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    lt.id,
    lt.name,
    lt.annual_allowance_days,
    coalesce(sum(r.days) filter (where r.status = 'approved'), 0)::integer,
    coalesce(sum(r.days) filter (where r.status = 'pending'), 0)::integer,
    case when lt.annual_allowance_days is null then null
         else lt.annual_allowance_days - coalesce(sum(r.days) filter (where r.status in ('approved', 'pending')), 0)::integer
    end
  from public.leave_types lt
  left join public.leave_requests r
    on r.leave_type_id = lt.id
   and r.employee_id = p_employee
   and extract(year from r.start_date) = p_year
  where lt.is_active
  group by lt.id, lt.name, lt.annual_allowance_days
  order by lt.name;
$$;
