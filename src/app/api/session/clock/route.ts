import { candidateContext, errorJson, json } from "@/lib/api";
import { sessionDto } from "@/lib/sessions";

/** Lightweight timing sync: authoritative expiry + server time. */
export async function GET() {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  return json({ session: sessionDto(ctx.session) });
}
