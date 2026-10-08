import { z } from "zod";
import { candidateContext, errorJson, json, readJson, sessionErrorResponse } from "@/lib/api";
import { recordVisit } from "@/lib/sessions";

const Body = z.object({ itemId: z.number().int().min(1).max(9) });

export async function POST(req: Request) {
  const ctx = await candidateContext(req);
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("invalid", 400);
  try {
    await recordVisit(ctx.session.id, parsed.data.itemId);
    return json({ ok: true });
  } catch (err) {
    return sessionErrorResponse(err);
  }
}
