import { candidateContext, errorJson, json } from "@/lib/api";
import { sessionDto } from "@/lib/sessions";

/** Lightweight timing sync: authoritative expiry + server time. */
export async function GET(req: Request) {
  const ctx = await candidateContext(req);
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  return json({ session: sessionDto(ctx.session) });
}
