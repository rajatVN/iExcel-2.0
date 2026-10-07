import "server-only";

/** Single source of truth for server-side configuration. */

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max} (got "${raw}")`);
  }
  return n;
}

export const ASSESSMENT_CODE = "drishti-pilot";

/** Duration given to sessions when they START. Default 30. */
export function assessmentDurationMinutes(): number {
  return intFromEnv("ASSESSMENT_DURATION_MINUTES", 30, 1, 240);
}

/** Seconds after expiry during which locally-held edits may still sync. */
export function submissionGraceSeconds(): number {
  return intFromEnv("SUBMISSION_GRACE_SECONDS", 60, 0, 600);
}

export function sessionSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short (min 32 chars). See .env.example.");
  }
  return new TextEncoder().encode(s);
}

export function adminAccessCode(): string | null {
  const c = process.env.ADMIN_ACCESS_CODE;
  return c && c.length >= 6 ? c : null;
}

/** Time zone used to print times in reports and admin views. */
export function reportTimeZone(): string {
  return process.env.REPORT_TIMEZONE || "Asia/Kolkata";
}
