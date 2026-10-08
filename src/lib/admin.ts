import "server-only";
import { getDb } from "./db";
import { reportTimeZone, submissionGraceSeconds } from "./config";
import { getAssessmentId, getSessionById } from "./sessions";
import { items } from "@/content/drishti";

export function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: reportTimeZone(),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function mmss(ms: number): string {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;

export interface AdminRow {
  candidateId: string;
  code: string;
  name: string;
  sessionId: string | null;
  /** Latest attempt's number (1 = first attempt), or null if never started. */
  attemptNumber: number | null;
  /** The admin has released a retest the candidate hasn't started yet. */
  retestPending: boolean;
  status: "not_started" | "in_progress" | "submitted";
  reason: string | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  timeUsed: string | null;
  remaining: string | null;
  responded: number;
  blank: number;
  item9Attempted: boolean;
  reportAt: Date | null;
}

export async function listCandidates(): Promise<AdminRow[]> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);

  // Finalise any sessions whose time (plus grace) has elapsed, so the list is current.
  const overdue = await db.query<{ id: string }>(
    `select id from assessment_sessions
      where status = 'in_progress' and now() > expires_at + make_interval(secs => $1::int)`,
    [submissionGraceSeconds()],
  );
  for (const o of overdue) await getSessionById(o.id);

  const rows = await db.query<{
    candidate_id: string;
    candidate_code: string;
    name: string;
    session_id: string | null;
    attempt_number: number | null;
    max_attempts: number;
    status: string | null;
    submission_reason: string | null;
    started_at: Date | null;
    expires_at: Date | null;
    submitted_at: Date | null;
    db_now: Date;
    report_at: Date | null;
  }>(
    `select c.id as candidate_id, c.candidate_code, c.name, c.max_attempts,
            s.id as session_id, s.attempt_number, s.status, s.submission_reason, s.started_at, s.expires_at,
            s.submitted_at, now() as db_now, r.generated_at as report_at
       from candidates c
       left join lateral (
         select * from assessment_sessions
          where candidate_id = c.id and assessment_id = $1
          order by attempt_number desc limit 1
       ) s on true
       left join reports r on r.session_id = s.id
      order by c.candidate_code`,
    [assessmentId],
  );
  const responses = await db.query<{
    session_id: string;
    item_id: number;
    priority: string | null;
    action_text: string | null;
    say_now_text: string | null;
    hold_text: string | null;
    say_hold_text: string | null;
    recommendation_text: string | null;
  }>(
    `select session_id, item_id, priority, action_text, say_now_text, hold_text, say_hold_text, recommendation_text
       from assessment_responses`,
  );

  return rows.map((r) => {
    const mine = responses.filter((x) => x.session_id === r.session_id);
    const answered = mine.filter((x) =>
      x.item_id === 9
        ? filled(x.recommendation_text)
        : filled(x.priority) ||
          filled(x.action_text) ||
          filled(x.say_now_text) ||
          filled(x.hold_text) ||
          filled(x.say_hold_text),
    );
    const status = (r.status ?? "not_started") as AdminRow["status"];
    const end = r.submitted_at && r.expires_at ? Math.min(r.submitted_at.getTime(), r.expires_at.getTime()) : null;
    return {
      candidateId: r.candidate_id,
      code: r.candidate_code,
      name: r.name,
      sessionId: r.session_id,
      attemptNumber: r.attempt_number,
      retestPending: status === "submitted" && (r.attempt_number ?? 0) < r.max_attempts,
      status,
      reason: r.submission_reason,
      startedAt: r.started_at,
      submittedAt: r.submitted_at,
      timeUsed: end && r.started_at ? mmss(end - r.started_at.getTime()) : null,
      remaining:
        status === "in_progress" && r.expires_at ? mmss(r.expires_at.getTime() - r.db_now.getTime()) : null,
      responded: answered.length,
      blank: r.session_id ? items.length - answered.length : items.length,
      item9Attempted: answered.some((x) => x.item_id === 9),
      reportAt: r.report_at,
    };
  });
}

export async function getSessionDetail(sessionId: string) {
  const session = await getSessionById(sessionId);
  if (!session) return null;
  const db = await getDb();
  const [candidate] = await db.query<{ id: string; name: string; candidate_code: string; max_attempts: number }>(
    `select id, name, candidate_code, max_attempts from candidates where id = $1`,
    [session.candidate_id],
  );
  const attempts = await db.query<{ id: string; attempt_number: number; status: string }>(
    `select id, attempt_number, status from assessment_sessions
      where candidate_id = $1 and assessment_id = $2 order by attempt_number`,
    [session.candidate_id, session.assessment_id],
  );
  const responses = await db.query<{
    item_id: number;
    priority: string | null;
    action_text: string | null;
    say_now_text: string | null;
    hold_text: string | null;
    say_hold_text: string | null;
    recommendation_text: string | null;
    first_opened_at: Date | null;
    last_opened_at: Date | null;
    visit_count: number;
    updated_at: Date;
  }>(
    `select item_id, priority, action_text, say_now_text, hold_text, say_hold_text, recommendation_text,
            first_opened_at, last_opened_at, visit_count, updated_at
       from assessment_responses where session_id = $1 order by item_id`,
    [sessionId],
  );
  const versions = await db.query<{
    item_id: number;
    field_changed: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: Date;
    after_expiry: boolean;
  }>(
    `select item_id, field_changed, old_value, new_value, changed_at, after_expiry
       from response_versions where session_id = $1 order by changed_at, id`,
    [sessionId],
  );
  const events = await db.query<{ event_type: string; item_id: number | null; payload: unknown; created_at: Date }>(
    `select event_type, item_id, payload, created_at from session_events where session_id = $1 order by created_at`,
    [sessionId],
  );
  const [report] = await db.query<{ generated_at: Date; generation_count: number }>(
    `select generated_at, generation_count from reports where session_id = $1`,
    [sessionId],
  );
  return { session, candidate, attempts, responses, versions, events, report: report ?? null };
}

/* ------------------------------------------------------------------------ */
/* Retests and resets                                                        */
/* ------------------------------------------------------------------------ */

export class AdminActionError extends Error {}

/** Typed confirmation the admin must enter; checked again here on the server. */
export const RESET_PHRASE = "RESET";
export const RETEST_PHRASE = "RETEST";

/**
 * Allow the candidate one more attempt. Only after their latest attempt is
 * submitted, and only one unstarted retest at a time. The candidate starts it
 * themselves from their dashboard ("Retest – Attempt N").
 */
export async function releaseRetest(candidateId: string): Promise<{ attemptNumber: number }> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);
  return db.transaction(async (tx) => {
    const [c] = await tx.query<{ max_attempts: number }>(
      `select max_attempts from candidates where id = $1 for update`,
      [candidateId],
    );
    if (!c) throw new AdminActionError("Candidate not found");
    const [latest] = await tx.query<{ attempt_number: number; status: string }>(
      `select attempt_number, status from assessment_sessions
        where candidate_id = $1 and assessment_id = $2 order by attempt_number desc limit 1`,
      [candidateId, assessmentId],
    );
    if (!latest || latest.status !== "submitted") {
      throw new AdminActionError("A retest can only be released once the latest attempt is submitted");
    }
    if (c.max_attempts > latest.attempt_number) throw new AdminActionError("A retest is already released");
    const next = latest.attempt_number + 1;
    await tx.query(`update candidates set max_attempts = $2 where id = $1`, [candidateId, next]);
    return { attemptNumber: next };
  });
}

/** Withdraw a released retest the candidate has not started yet. */
export async function cancelRetest(candidateId: string): Promise<void> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);
  const rows = await db.query(
    `update candidates c
        set max_attempts = greatest(1, coalesce((select max(attempt_number) from assessment_sessions s
                                                  where s.candidate_id = c.id and s.assessment_id = $2), 0))
      where c.id = $1
      returning c.id`,
    [candidateId, assessmentId],
  );
  if (!rows[0]) throw new AdminActionError("Candidate not found");
}

/**
 * Permanently delete one attempt — responses, change history, events and
 * report (all cascade) — as though it never happened. The candidate may then
 * take that attempt again. Only the latest attempt can be reset, so attempt
 * numbers stay contiguous; any retest released beyond it is withdrawn.
 * Returns the remaining latest attempt's id, if any.
 */
export async function resetAttempt(sessionId: string): Promise<{ remainingSessionId: string | null }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [s] = await tx.query<{ candidate_id: string; assessment_id: string; attempt_number: number }>(
      `select candidate_id, assessment_id, attempt_number from assessment_sessions where id = $1 for update`,
      [sessionId],
    );
    if (!s) throw new AdminActionError("Attempt not found");
    await tx.query(`select id from candidates where id = $1 for update`, [s.candidate_id]);
    const [newer] = await tx.query(
      `select id from assessment_sessions where candidate_id = $1 and assessment_id = $2 and attempt_number > $3 limit 1`,
      [s.candidate_id, s.assessment_id, s.attempt_number],
    );
    if (newer) throw new AdminActionError("Only the latest attempt can be reset");
    await tx.query(`delete from assessment_sessions where id = $1`, [sessionId]);
    await tx.query(`update candidates set max_attempts = $2 where id = $1`, [s.candidate_id, s.attempt_number]);
    const [prev] = await tx.query<{ id: string }>(
      `select id from assessment_sessions where candidate_id = $1 and assessment_id = $2
        order by attempt_number desc limit 1`,
      [s.candidate_id, s.assessment_id],
    );
    // No audit row survives the cascade, so leave a trace in the server log.
    console.info("Admin reset attempt", { sessionId, candidateId: s.candidate_id, attempt: s.attempt_number });
    return { remainingSessionId: prev?.id ?? null };
  });
}
