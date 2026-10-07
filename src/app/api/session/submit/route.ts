import { z } from "zod";
import { candidateContext, errorJson, json, readJson, sessionErrorResponse } from "@/lib/api";
import { sessionDto, submitSession } from "@/lib/sessions";

const Body = z.object({ intent: z.enum(["manual", "timeout"]) });

export async function POST(req: Request) {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("invalid", 400);
  try {
    const session = await submitSession(ctx.session.id, parsed.data.intent);
    return json({ session: sessionDto(session) });
  } catch (err) {
    return sessionErrorResponse(err);
  }
}
