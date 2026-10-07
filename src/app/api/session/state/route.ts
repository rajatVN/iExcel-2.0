import { candidateContext, errorJson, json } from "@/lib/api";
import { getResponses, responsesDto, sessionDto } from "@/lib/sessions";

export async function GET() {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  const responses = await getResponses(ctx.session.id);
  return json({ session: sessionDto(ctx.session), responses: responsesDto(responses) });
}
