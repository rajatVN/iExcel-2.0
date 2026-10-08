import { z } from "zod";
import { candidateContext, errorJson, json, readJson, sessionErrorResponse } from "@/lib/api";
import { saveResponse, sessionDto, SessionError } from "@/lib/sessions";

const Field = z.string().max(20_000).nullable();
const Body = z.object({
  itemId: z.number().int().min(1).max(9),
  fields: z
    .object({
      priority: Field.optional(),
      action_text: Field.optional(),
      say_now_text: Field.optional(),
      hold_text: Field.optional(),
      say_hold_text: Field.optional(), // legacy drafts from before the split
      recommendation_text: Field.optional(),
    })
    .strict(),
});
const Batch = z.object({ changes: z.array(Body).min(1).max(9) });

/**
 * Save changed response fields. Accepts either one change or a batch
 * `{ changes: [...] }` (used by the flush-on-exit beacon).
 */
async function handle(req: Request) {
  const ctx = await candidateContext();
  if (!ctx.ok) return ctx.response;
  if (!ctx.session) return errorJson("not_started", 404);
  if (ctx.session.status !== "in_progress") {
    return errorJson("locked", 409, { session: sessionDto(ctx.session) });
  }
  const raw = await readJson(req);
  const single = Body.safeParse(raw);
  const batch = single.success ? null : Batch.safeParse(raw);
  if (!single.success && !batch?.success) return errorJson("invalid", 400);
  const changes = single.success ? [single.data] : batch!.data!.changes;
  try {
    const saved = [];
    for (const c of changes) {
      const r = await saveResponse(ctx.session.id, c.itemId, c.fields);
      saved.push({ itemId: c.itemId, updatedAt: r.updatedAt.toISOString(), afterExpiry: r.afterExpiry });
    }
    return json({ ok: true, saved });
  } catch (err) {
    if (err instanceof SessionError && err.code === "locked") {
      return errorJson("locked", 409, { message: err.message });
    }
    return sessionErrorResponse(err);
  }
}

export const PUT = handle;
export const POST = handle; // navigator.sendBeacon only sends POST
