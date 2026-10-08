import "server-only";
import { getDb } from "../db";
import { reportTimeZone } from "../config";
import {
  ASSESSMENT_TITLE,
  ASSESSMENT_SUBTITLE,
  ROLE_NAME,
  ROLE_TITLE,
  items as contentItems,
  countWords,
} from "@/content/drishti";

/** Everything the DOCX and PDF renderers need. Built only from stored data. */
export interface ReportData {
  title: string;
  subtitle: string;
  reportName: string;
  candidate: { name: string; code: string };
  role: { name: string; title: string };
  assessment: { name: string; version: string };
  /** 1 for the first attempt, 2+ for retests. */
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  submittedAtDate: Date;
  duration: string;
  allotted: string;
  submission: "Manual" | "Time expired";
  status: "SUBMITTED";
  timeZone: string;
  respondedCount: number;
  blankItems: number[];
  items: ReportItem[];
}

export interface ReportItem {
  id: number;
  shortTitle: string;
  formatLabel: string;
  from: string;
  subject: string;
  type: "standard" | "recommendation";
  priority: string | null;
  action: string | null;
  sayNow: string | null;
  hold: string | null;
  /** Legacy combined "Say now / Hold" answer, from before the field was split. */
  sayHoldLegacy: string | null;
  recommendation: string | null;
  wordCount: number;
  blank: boolean;
}

export class ReportError extends Error {}

function fmtDateTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  })
    .format(d)
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export async function buildReportData(sessionId: string): Promise<ReportData> {
  const db = await getDb();
  const rows = await db.query<{
    attempt_number: number;
    started_at: Date;
    expires_at: Date;
    submitted_at: Date | null;
    status: string;
    submission_reason: string | null;
    duration_minutes: number;
    candidate_name: string;
    candidate_code: string;
    assessment_name: string;
    assessment_version: string;
  }>(
    `select s.attempt_number, s.started_at, s.expires_at, s.submitted_at, s.status, s.submission_reason, s.duration_minutes,
            c.name as candidate_name, c.candidate_code,
            a.name as assessment_name, a.version as assessment_version
       from assessment_sessions s
       join candidates c on c.id = s.candidate_id
       join assessments a on a.id = s.assessment_id
      where s.id = $1`,
    [sessionId],
  );
  const s = rows[0];
  if (!s) throw new ReportError("Session not found");
  if (s.status !== "submitted" || !s.submitted_at) {
    throw new ReportError("Report is only available once the assessment has been submitted");
  }

  const responses = await db.query<{
    item_id: number;
    priority: string | null;
    action_text: string | null;
    say_now_text: string | null;
    hold_text: string | null;
    say_hold_text: string | null;
    recommendation_text: string | null;
  }>(
    `select item_id, priority, action_text, say_now_text, hold_text, say_hold_text, recommendation_text
       from assessment_responses where session_id = $1`,
    [sessionId],
  );
  const byItem = new Map(responses.map((r) => [r.item_id, r]));

  const reportItems: ReportItem[] = contentItems.map((it) => {
    const r = byItem.get(it.id);
    const priority = r?.priority ?? null;
    const action = r?.action_text ?? null;
    const sayNow = r?.say_now_text ?? null;
    const hold = r?.hold_text ?? null;
    const sayHoldLegacy = nonEmpty(r?.say_hold_text) ? r.say_hold_text : null;
    const recommendation = r?.recommendation_text ?? null;
    const blank =
      it.responseType === "recommendation"
        ? !nonEmpty(recommendation)
        : ![priority, action, sayNow, hold, sayHoldLegacy].some(nonEmpty);
    return {
      id: it.id,
      shortTitle: it.shortTitle,
      formatLabel: it.formatLabel,
      from: it.headers.find((h) => h.label === "From" || h.label === "Source")?.value ?? it.sender,
      subject: it.subject,
      type: it.responseType,
      priority,
      action,
      sayNow,
      hold,
      sayHoldLegacy,
      recommendation,
      wordCount: countWords(recommendation),
      blank,
    };
  });

  const tz = reportTimeZone();
  // Time actually used: until submission, capped at the allotted time.
  const end = Math.min(s.submitted_at.getTime(), s.expires_at.getTime());
  return {
    title: "iExcel 2.0 – In-Basket Assessment",
    subtitle: ASSESSMENT_SUBTITLE,
    reportName: "Candidate Response Report",
    candidate: { name: s.candidate_name, code: s.candidate_code },
    role: { name: ROLE_NAME, title: ROLE_TITLE },
    assessment: { name: ASSESSMENT_TITLE, version: s.assessment_version },
    attemptNumber: s.attempt_number,
    startedAt: fmtDateTime(s.started_at, tz),
    submittedAt: fmtDateTime(s.submitted_at, tz),
    submittedAtDate: s.submitted_at,
    duration: fmtDuration(end - s.started_at.getTime()),
    allotted: `${s.duration_minutes} minutes`,
    submission: s.submission_reason === "timeout" ? "Time expired" : "Manual",
    status: "SUBMITTED",
    timeZone: tz,
    respondedCount: reportItems.filter((i) => !i.blank).length,
    blankItems: reportItems.filter((i) => i.blank).map((i) => i.id),
    items: reportItems,
  };
}

/** Label for the report's info table, e.g. "1" or "2 (retest)". */
export function attemptLabel(d: ReportData): string {
  return d.attemptNumber > 1 ? `${d.attemptNumber} (retest)` : "1";
}

/** File-name-safe base name, e.g. "C05_Drishti_InBasket_Responses" (retests add "_Attempt2"). */
export function reportBaseName(d: ReportData): string {
  const attempt = d.attemptNumber > 1 ? `_Attempt${d.attemptNumber}` : "";
  return `${d.candidate.code.replace(/[^A-Za-z0-9_-]/g, "")}_Drishti_InBasket_Responses${attempt}`;
}
