import Link from "next/link";
import { Field } from "@/components/ui";
import type { LeaveRequest, LeaveType } from "@/lib/types";

export function LeaveForm({
  action,
  leaveTypes,
  request,
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  leaveTypes: LeaveType[];
  request?: LeaveRequest;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card max-w-xl space-y-4">
      <Field label="Leave type" htmlFor="leave_type_id">
        <select className="input" id="leave_type_id" name="leave_type_id" defaultValue={request?.leave_type_id} required>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.annual_allowance_days !== null ? ` (${t.annual_allowance_days} days a year)` : ""}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First day" htmlFor="start_date">
          <input className="input" type="date" id="start_date" name="start_date" defaultValue={request?.start_date} required />
        </Field>
        <Field label="Last day" htmlFor="end_date">
          <input className="input" type="date" id="end_date" name="end_date" defaultValue={request?.end_date} required />
        </Field>
      </div>
      <p className="text-xs text-zinc-500">Only working days (Monday to Friday) count towards your allowance.</p>
      <Field label="Reason (optional)" htmlFor="reason">
        <textarea className="input" id="reason" name="reason" rows={3} maxLength={1000} defaultValue={request?.reason ?? ""} />
      </Field>
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
        <Link className="btn" href="/leave">Back</Link>
      </div>
    </form>
  );
}
