import "server-only";
import type { Queryable } from "./db";
import { hashAccessCode } from "./passwords";
import { ASSESSMENT_CODE } from "./config";

/**
 * Pilot seed data. Inserted only if missing — never overwrites.
 *
 * Pilot candidate logins (mock login, pilot only):
 *   Candidate IDs C01 … C25, each with its own access code "login-<ID>"
 *   (C01 → login-C01).
 */
export const pilotAccessCode = (candidateCode: string) => `login-${candidateCode}`;

const PILOT_CANDIDATES = Array.from({ length: 25 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { code: `C${n}`, name: `Pilot Candidate ${n}` };
});

export async function seedDatabase(db: Queryable): Promise<void> {
  await db.query(
    `insert into assessments (code, name, version, duration_minutes)
     values ($1, $2, $3, $4)
     on conflict (code) do nothing`,
    [ASSESSMENT_CODE, "iExcel 2.0 – In-Basket Exercise (Project Drishti)", "2.0 pilot – October 2026", 30],
  );
  const existing = await db.query<{ candidate_code: string }>(`select candidate_code from candidates`);
  const have = new Set(existing.map((r) => r.candidate_code));
  for (const c of PILOT_CANDIDATES) {
    if (have.has(c.code)) continue;
    await db.query(
      `insert into candidates (candidate_code, name, role, access_code_hash)
       values ($1, $2, $3, $4) on conflict (candidate_code) do nothing`,
      [c.code, c.name, "Pilot participant", hashAccessCode(pilotAccessCode(c.code))],
    );
  }
}
