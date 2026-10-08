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
 *
 * The assessment page also sends the id of the attempt it was opened for as
 * `?sid=`. That is only ever used to REJECT a request (409 stale_session) when
 * it no longer matches the current attempt — e.g. a tab left open on an
 * attempt the admin has since reset — so it can't write into a newer attempt.
 */
export async function candidateContext(req?: Request): Promise<
  | { ok: true; candidate: CandidateIdentity; session: SessionRow | null }
  | { ok: false; response: NextResponse }
> {
  const candidate = await getCandidate();
  if (!candidate) return { ok: false, response: errorJson("unauthorised", 401) };
  const session = await getCandidateSession(candidate.id);
  const sid = req ? new URL(req.url).searchParams.get("sid") : null;
  if (sid && session && sid !== session.id) return { ok: false, response: errorJson("stale_session", 409) };
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
