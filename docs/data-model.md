# Glide5 Portal: HR data model and access rules

## Records and relationships

| Table | What it holds | Relationships |
|---|---|---|
| `departments` | Company departments | One department has many employees |
| `profiles` | One row per employee: name, email, job title, role, status, start date | Same id as the Supabase Auth user. `department_id` → departments. `manager_id` → another profile (reporting line) |
| `employee_details` | Private personal data: phone, address, date of birth, emergency contact | One-to-one with `profiles` |
| `leave_types` | Annual, sick, unpaid… with a yearly allowance in working days (blank = no limit) | Used by leave requests |
| `leave_requests` | Dates, working days (calculated), reason, status, who reviewed it and when | `employee_id` → profiles, `leave_type_id` → leave types, `reviewed_by` → profiles |
| `announcements` | HR news posts | `created_by` → profiles |

Profiles and private details are created automatically when a Supabase Auth user is added (invited by HR or seeded).

## Roles

| Capability | Employee | Manager | HR admin |
|---|:-:|:-:|:-:|
| See directory, departments, leave types, announcements | ✓ | ✓ | ✓ |
| Edit own name and private details | ✓ | ✓ | ✓ |
| Request, edit and cancel own pending leave | ✓ | ✓ | ✓ |
| See and approve/reject direct reports' leave | | ✓ | ✓ (everyone's) |
| Approve own leave | | | ✗ (needs their manager or another HR admin) |
| Cancel already-approved leave | | | ✓ |
| See anyone's private details | | | ✓ |
| Edit job title, department, manager, role, status, start date | | | ✓ |
| Invite employees, block terminated employees | | | ✓ |
| Manage departments, leave types, announcements | | | ✓ |

Signed-out visitors cannot read any table. Terminated employees lose all access and are blocked from signing in.

## Rules enforced by the database

These hold no matter how the data is reached (portal, API, or a bug in the app):

- New leave requests always start as **pending**; employees cannot approve their own.
- Reviewers can only approve or reject; they cannot change dates, type or reason.
- Only pending requests can be edited. Rejected and cancelled requests are final. Approved requests can only be cancelled by HR.
- Leave requests cannot be deleted (cancelled instead) so there is an audit trail.
- Working days = Monday–Friday between the first and last day, inclusive.
- A request cannot overlap another pending or approved request of the same employee.
- Pending + approved days per leave type per calendar year cannot exceed the allowance. A request counts towards the year it starts in.
- Only HR can change role, status, manager, department, job title, start date or email.
- There must always be at least one active HR admin. Reporting lines cannot loop.

## Business rules to confirm

These were decided with sensible defaults; each is a small change if the answer differs.

1. **Public holidays.** Working days exclude weekends only. Should company holidays (e.g. Pakistan public holidays) also be excluded? This needs a `holidays` table.
2. **Working week.** Monday–Friday assumed. Is Saturday a working day for any team?
3. **Half days.** Not supported. Do you need half-day leave?
4. **Allowances.** One allowance per leave type for everyone. Do allowances vary by person, seniority or start date (pro-rata for new joiners)? Does unused leave carry over to next year?
5. **Who approves.** Only the direct manager (or any HR admin). Should managers also see their reports' reports? Who approves when an employee has no manager: HR only (current behaviour)?
6. **Manager visibility.** Managers cannot see their reports' private details. Should they see emergency contacts?
7. **Directory.** Every employee sees name, job title, department, manager and email of all colleagues. Is that acceptable, or should some fields be hidden?
8. **Sign-up.** Invite-only (HR invites by email; nobody can sign themselves up). Should people with a company email domain be able to self-register?
9. **Terminated employees.** Records are kept and sign-in is blocked. Is there a retention period after which personal data must be deleted?
10. **Other HR records.** Not built yet: documents/contracts, payroll or salary, performance reviews, onboarding checklists, attendance. Which of these do you need?
