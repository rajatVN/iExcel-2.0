import { candidateContext, json, sessionErrorResponse } from "@/lib/api";
import { sessionDto, startSession } from "@/lib/sessions";

/** Start the assessment. Idempotent: never restarts or extends an existing timer. */
export async function POST() {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  try {
    const session = ctx.session ?? (await startSession(ctx.candidate.id));
    return json({ session: sessionDto(session) });
  } catch (err) {
    return sessionErrorResponse(err);
  }
}
