import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { errorJson, json, readJson } from "@/lib/api";
import { AdminActionError, RESET_PHRASE, resetAttempt } from "@/lib/admin";

const Body = z.object({ confirm: z.string() });

/** Permanently delete one attempt. Requires the typed confirmation "RESET". */
export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) return errorJson("forbidden", 403);
  const { sessionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return errorJson("not_found", 404);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success || parsed.data.confirm !== RESET_PHRASE) {
    return errorJson("confirmation_required", 400, { message: `Type ${RESET_PHRASE} to confirm` });
  }
  try {
    const r = await resetAttempt(sessionId);
    return json({ ok: true, remainingSessionId: r.remainingSessionId });
  } catch (err) {
    if (err instanceof AdminActionError) return errorJson("conflict", 409, { message: err.message });
    console.error(err);
    return errorJson("server_error", 500);
  }
}
