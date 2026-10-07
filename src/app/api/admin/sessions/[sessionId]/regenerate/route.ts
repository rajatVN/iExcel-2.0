import { isAdmin } from "@/lib/auth";
import { errorJson, json } from "@/lib/api";
import { getSessionById } from "@/lib/sessions";
import { generateCandidateReport, ReportError } from "@/lib/report";

export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) return errorJson("forbidden", 403);
  const { sessionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return errorJson("not_found", 404);
  const session = await getSessionById(sessionId);
  if (!session) return errorJson("not_found", 404);
  try {
    const r = await generateCandidateReport(sessionId);
    return json({ ok: true, generatedAt: r.generatedAt.toISOString() });
  } catch (err) {
    if (err instanceof ReportError) return errorJson("not_submitted", 409, { message: err.message });
    console.error(err);
    return errorJson("server_error", 500);
  }
}
