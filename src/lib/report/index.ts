import "server-only";
import { getDb, toBuffer } from "../db";
import { buildReportData, reportBaseName } from "./data";
import { renderDocx } from "./docx";
import { renderPdf } from "./pdf";

export { ReportError } from "./data";

export interface StoredReport {
  docxName: string;
  pdfName: string;
  docx: Buffer;
  pdf: Buffer;
  generatedAt: Date;
}

/**
 * Build the candidate response report from the FINAL stored database
 * responses (never browser state), render DOCX + PDF and store both.
 * Deterministic in content: regenerating yields the same report.
 * Callers must have verified the requester may access this session.
 */
export async function generateCandidateReport(sessionId: string): Promise<StoredReport> {
  const data = await buildReportData(sessionId); // throws unless submitted
  const [docx, pdf] = await Promise.all([renderDocx(data), renderPdf(data)]);
  const base = reportBaseName(data);
  const docxName = `${base}.docx`;
  const pdfName = `${base}.pdf`;
  const db = await getDb();
  const rows = await db.query<{ generated_at: Date }>(
    `insert into reports (session_id, docx_path, pdf_path, docx_data, pdf_data, generated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (session_id) do update
       set docx_path = excluded.docx_path, pdf_path = excluded.pdf_path,
           docx_data = excluded.docx_data, pdf_data = excluded.pdf_data,
           generated_at = now(), generation_count = reports.generation_count + 1
     returning generated_at`,
    [sessionId, `reports/${sessionId}/${docxName}`, `reports/${sessionId}/${pdfName}`, docx, pdf],
  );
  return { docxName, pdfName, docx, pdf, generatedAt: rows[0].generated_at };
}

/** Stored report, generating it first if missing. */
export async function getOrCreateReport(sessionId: string): Promise<StoredReport> {
  const db = await getDb();
  const rows = await db.query<{
    docx_path: string;
    pdf_path: string;
    docx_data: unknown;
    pdf_data: unknown;
    generated_at: Date;
  }>(`select docx_path, pdf_path, docx_data, pdf_data, generated_at from reports where session_id = $1`, [sessionId]);
  const r = rows[0];
  if (!r) return generateCandidateReport(sessionId);
  return {
    docxName: r.docx_path.split("/").pop()!,
    pdfName: r.pdf_path.split("/").pop()!,
    docx: toBuffer(r.docx_data),
    pdf: toBuffer(r.pdf_data),
    generatedAt: r.generated_at,
  };
}
