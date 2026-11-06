import { redirect } from "next/navigation";

// Small helpers for server actions. The database re-checks everything,
// so these only tidy input and turn database errors into readable messages.

export function text(form: FormData, key: string, max = 1000): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function requiredText(form: FormData, key: string, label: string, max = 1000): string {
  const value = text(form, key, max);
  if (!value) throw new FormError(`${label} is required.`);
  return value;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function date(form: FormData, key: string, label: string, required = false): string | null {
  const value = text(form, key, 10);
  if (!value) {
    if (required) throw new FormError(`${label} is required.`);
    return null;
  }
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) throw new FormError(`${label} is not a valid date.`);
  return value;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value);

export function uuid(form: FormData, key: string, label: string, required = false): string | null {
  const value = text(form, key, 36);
  if (!value) {
    if (required) throw new FormError(`${label} is required.`);
    return null;
  }
  if (!UUID_RE.test(value)) throw new FormError(`${label} is not valid.`);
  return value;
}

export function oneOf<T extends string>(form: FormData, key: string, allowed: readonly T[], label: string): T {
  const value = text(form, key, 50);
  if (!value || !allowed.includes(value as T)) throw new FormError(`${label} is not valid.`);
  return value as T;
}

export class FormError extends Error {}

interface DbError {
  code?: string;
  message: string;
}

// Messages raised by our database rules are written for people; pass them on.
// Anything else becomes a generic message (and is logged on the server).
export function friendlyError(error: DbError): string {
  if (error.code === "42501" && error.message.includes("row-level security")) {
    return "You do not have permission to do that.";
  }
  if (["42501", "23514", "23P01"].includes(error.code ?? "")) return error.message;
  if (error.code === "23505") return "That already exists.";
  console.error("Database error", error);
  return "Something went wrong while saving. Please try again.";
}

export function backWithError(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

export function backWithNotice(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}notice=${encodeURIComponent(message)}`);
}

// Runs a form handler; validation problems go back to the form as a message.
export async function handleForm(path: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof FormError) backWithError(path, e.message);
    throw e;
  }
}
