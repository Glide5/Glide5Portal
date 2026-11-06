import { Field } from "@/components/ui";
import type { EmployeeDetails } from "@/lib/types";

// Private details: only the employee and HR admins can see or change these.
export function EmployeeDetailsFields({ details }: { details: EmployeeDetails | null }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 text-sm font-semibold">
        Private details <span className="font-normal text-zinc-500">(visible to you and HR only)</span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone">
          <input className="input" id="phone" name="phone" type="tel" maxLength={50} defaultValue={details?.phone ?? ""} />
        </Field>
        <Field label="Date of birth" htmlFor="date_of_birth">
          <input className="input" id="date_of_birth" name="date_of_birth" type="date" defaultValue={details?.date_of_birth ?? ""} />
        </Field>
      </div>
      <Field label="Home address" htmlFor="address">
        <textarea className="input" id="address" name="address" rows={2} maxLength={500} defaultValue={details?.address ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name" htmlFor="emergency_contact_name">
          <input className="input" id="emergency_contact_name" name="emergency_contact_name" maxLength={200} defaultValue={details?.emergency_contact_name ?? ""} />
        </Field>
        <Field label="Emergency contact phone" htmlFor="emergency_contact_phone">
          <input className="input" id="emergency_contact_phone" name="emergency_contact_phone" type="tel" maxLength={50} defaultValue={details?.emergency_contact_phone ?? ""} />
        </Field>
      </div>
    </fieldset>
  );
}
