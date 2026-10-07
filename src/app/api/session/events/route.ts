import { z } from "zod";
import { candidateContext, errorJson, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { recordEvent } from "@/lib/sessions";

/** Non-scoring telemetry from the candidate client. Only known event types are accepted. */
const Body = z.object({
  type: z.enum([
    "assessment_opened",
    "visibility_hidden",
    "visibility_visible",
    "connection_lost",
    "connection_restored",
    "panel_opened",
    "local_recovery_applied",
  ]),
  itemId: z.number().int().min(1).max(9).nullable().optional(),
  detail: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  if (ctx.session.status !== "in_progress") return json({ ok: true, ignored: true });
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("invalid", 400);
  const db = await getDb();
  await recordEvent(
    db,
    ctx.session.id,
    parsed.data.type,
    parsed.data.itemId ?? null,
    parsed.data.detail ? { detail: parsed.data.detail } : null,
  );
  return json({ ok: true });
}
