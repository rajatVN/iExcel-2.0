import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "./config";
import { getDb } from "./db";

/**
 * Pilot authentication: signed, httpOnly cookies.
 *
 * Candidate and admin identities use separate cookies with a `role` claim, so a
 * candidate cookie can never satisfy an admin check. To move to real auth
 * later (e.g. Supabase Auth / SSO), replace the bodies of `getCandidate` and
 * `getAdmin` — every route goes through them.
 */

const CANDIDATE_COOKIE = "ib_candidate";
const ADMIN_COOKIE = "ib_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

type Role = "candidate" | "admin";

async function sign(role: Role, sub: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(sessionSecret());
}

async function verify(token: string | undefined, role: Role): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    return payload.role === role && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export async function setCandidateCookie(candidateId: string) {
  (await cookies()).set(CANDIDATE_COOKIE, await sign("candidate", candidateId), cookieOptions);
}

export async function setAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, await sign("admin", "admin"), cookieOptions);
}

export async function clearCandidateCookie() {
  (await cookies()).delete(CANDIDATE_COOKIE);
}

export async function clearAdminCookie() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export interface CandidateIdentity {
  id: string;
  candidate_code: string;
  name: string;
  role: string | null;
  /** Set once the candidate has typed their own name; null while `name` is the seeded placeholder. */
  name_confirmed_at: Date | null;
}

/** The logged-in candidate, verified against the database, or null. */
export async function getCandidate(): Promise<CandidateIdentity | null> {
  const id = await verify((await cookies()).get(CANDIDATE_COOKIE)?.value, "candidate");
  if (!id) return null;
  const db = await getDb();
  const rows = await db.query<CandidateIdentity & Record<string, unknown>>(
    `select id, candidate_code, name, role, name_confirmed_at from candidates where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function isAdmin(): Promise<boolean> {
  return (await verify((await cookies()).get(ADMIN_COOKIE)?.value, "admin")) === "admin";
}
