import { candidateContext, json, sessionErrorResponse } from "@/lib/api";
import { sessionDto, startSession } from "@/lib/sessions";

/**
 * Start the assessment (or a retest the admin has released). Idempotent: never
 * restarts or extends an existing timer.
 */
export async function POST() {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  try {
    const session =
      ctx.session?.status === "in_progress" ? ctx.session : await startSession(ctx.candidate.id);
    return json({ session: sessionDto(session) });
  } catch (err) {
    return sessionErrorResponse(err);
  }
}
