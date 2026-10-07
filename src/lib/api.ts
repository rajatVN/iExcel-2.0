import "server-only";
import { NextResponse } from "next/server";
import { getCandidate, type CandidateIdentity } from "./auth";
import { getCandidateSession, SessionError, type SessionRow } from "./sessions";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorJson(error: string, status: number, extra: Record<string, unknown> = {}) {
  return json({ error, ...extra }, status);
}

/** Parse a JSON body; returns null on malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * Resolve the logged-in candidate and THEIR session. The session is always
 * derived from the authenticated identity — never from a client-supplied id.
 */
export async function candidateContext(): Promise<
  | { ok: true; candidate: CandidateIdentity; session: SessionRow | null }
  | { ok: false; response: NextResponse }
> {
  const candidate = await getCandidate();
  if (!candidate) return { ok: false, response: errorJson("unauthorised", 401) };
  const session = await getCandidateSession(candidate.id);
  return { ok: true, candidate, session };
}

export function sessionErrorResponse(err: unknown) {
  if (err instanceof SessionError) {
    const status = { not_started: 404, locked: 409, invalid: 400, not_expired: 425 }[err.code];
    return errorJson(err.code, status, { message: err.message, ...err.extra });
  }
  console.error(err);
  return errorJson("server_error", 500);
}
