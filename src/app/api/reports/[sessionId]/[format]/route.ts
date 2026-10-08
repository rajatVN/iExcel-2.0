import { isAdmin } from "@/lib/auth";
import { errorJson } from "@/lib/api";
import { getSessionById } from "@/lib/sessions";
import { getOrCreateReport, ReportError } from "@/lib/report";

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
} as const;

/**
 * Download a candidate response report.
 * Admin only — candidates cannot download reports.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string; format: string }> }) {
  const { sessionId, format } = await ctx.params;
  if (format !== "docx" && format !== "pdf") return errorJson("not_found", 404);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return errorJson("not_found", 404);

  if (!(await isAdmin())) return errorJson("unauthorised", 401);

  const session = await getSessionById(sessionId);
  if (!session) return errorJson("not_found", 404);
  if (session.status !== "submitted") return errorJson("not_submitted", 409);

  try {
    const report = await getOrCreateReport(sessionId);
    const body = format === "docx" ? report.docx : report.pdf;
    const name = format === "docx" ? report.docxName : report.pdfName;
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": MIME[format],
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(body.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof ReportError) return errorJson("not_submitted", 409);
    console.error(err);
    return errorJson("server_error", 500);
  }
}
