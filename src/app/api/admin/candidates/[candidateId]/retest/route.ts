import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { errorJson, json, readJson } from "@/lib/api";
import { AdminActionError, cancelRetest, releaseRetest, RETEST_PHRASE } from "@/lib/admin";

const Body = z.object({ confirm: z.string() });

async function guard(ctx: { params: Promise<{ candidateId: string }> }) {
  if (!(await isAdmin())) return { error: errorJson("forbidden", 403) };
  const { candidateId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(candidateId)) return { error: errorJson("not_found", 404) };
  return { candidateId };
}

function actionError(err: unknown) {
  if (err instanceof AdminActionError) return errorJson("conflict", 409, { message: err.message });
  console.error(err);
  return errorJson("server_error", 500);
}

/** Release a retest. Requires the typed confirmation "RETEST". */
export async function POST(req: Request, ctx: { params: Promise<{ candidateId: string }> }) {
  const g = await guard(ctx);
  if (g.error) return g.error;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success || parsed.data.confirm !== RETEST_PHRASE) {
    return errorJson("confirmation_required", 400, { message: `Type ${RETEST_PHRASE} to confirm` });
  }
  try {
    const r = await releaseRetest(g.candidateId);
    return json({ ok: true, attemptNumber: r.attemptNumber });
  } catch (err) {
    return actionError(err);
  }
}

/** Withdraw a released retest the candidate has not started. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ candidateId: string }> }) {
  const g = await guard(ctx);
  if (g.error) return g.error;
  try {
    await cancelRetest(g.candidateId);
    return json({ ok: true });
  } catch (err) {
    return actionError(err);
  }
}
