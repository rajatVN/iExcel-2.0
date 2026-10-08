import "server-only";
import { getDb, type Queryable } from "./db";
import { ASSESSMENT_CODE, assessmentDurationMinutes, submissionGraceSeconds } from "./config";
import { PRIORITIES } from "@/content/drishti";

/**
 * Assessment session logic. All timing decisions use the DATABASE clock
 * (`now()`), never the browser's.
 */

export type SessionStatus = "in_progress" | "submitted";
export type SubmissionReason = "manual" | "timeout";

export interface SessionRow {
  id: string;
  candidate_id: string;
  assessment_id: string;
  attempt_number: number;
  started_at: Date;
  expires_at: Date;
  duration_minutes: number;
  submitted_at: Date | null;
  status: SessionStatus;
  submission_reason: SubmissionReason | null;
  db_now: Date;
  [k: string]: unknown;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  item_id: number;
  priority: string | null;
  action_text: string | null;
  say_now_text: string | null;
  hold_text: string | null;
  /** Legacy combined answer (before Say now / Hold was split). Read-only. */
  say_hold_text: string | null;
  recommendation_text: string | null;
  first_opened_at: Date | null;
  last_opened_at: Date | null;
  visit_count: number;
  updated_at: Date;
  [k: string]: unknown;
}

export const RESPONSE_FIELDS = [
  "priority",
  "action_text",
  "say_now_text",
  "hold_text",
  "say_hold_text",
  "recommendation_text",
] as const;
export type ResponseField = (typeof RESPONSE_FIELDS)[number];
export type ResponseFields = Partial<Record<ResponseField, string | null>>;

/** Max characters per text field — generous, just prevents abuse. */
export const MAX_TEXT_LENGTH = 20_000;

const SESSION_COLUMNS = `id, candidate_id, assessment_id, attempt_number, started_at, expires_at, duration_minutes,
  submitted_at, status, submission_reason, now() as db_now`;

export class SessionError extends Error {
  constructor(
    public code: "not_started" | "locked" | "invalid" | "not_expired",
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function getAssessmentId(db: Queryable): Promise<string> {
  const rows = await db.query<{ id: string }>(`select id from assessments where code = $1`, [ASSESSMENT_CODE]);
  if (!rows[0]) throw new Error("Assessment not seeded");
  return rows[0].id;
}

export async function recordEvent(
  db: Queryable,
  sessionId: string,
  eventType: string,
  itemId: number | null = null,
  payload: Record<string, unknown> | null = null,
) {
  await db.query(
    `insert into session_events (session_id, event_type, item_id, payload) values ($1, $2, $3, $4)`,
    [sessionId, eventType, itemId, payload ? JSON.stringify(payload) : null],
  );
}

/**
 * The candidate's LATEST attempt for this assessment (or null if not started).
 * If time plus grace has fully elapsed, the session is finalised as a timeout
 * first — so a candidate who closed the browser is still submitted.
 */
export async function getCandidateSession(candidateId: string): Promise<SessionRow | null> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);
  const rows = await db.query<SessionRow>(
    `select ${SESSION_COLUMNS} from assessment_sessions where candidate_id = $1 and assessment_id = $2
      order by attempt_number desc limit 1`,
    [candidateId, assessmentId],
  );
  const session = rows[0];
  if (!session) return null;
  return finaliseIfOverdue(session);
}

export async function getSessionById(sessionId: string): Promise<SessionRow | null> {
  const db = await getDb();
  const rows = await db.query<SessionRow>(`select ${SESSION_COLUMNS} from assessment_sessions where id = $1`, [
    sessionId,
  ]);
  return rows[0] ? finaliseIfOverdue(rows[0]) : null;
}

async function finaliseIfOverdue(session: SessionRow): Promise<SessionRow> {
  if (session.status !== "in_progress") return session;
  const overdueMs = session.db_now.getTime() - session.expires_at.getTime();
  if (overdueMs <= submissionGraceSeconds() * 1000) return session;
  const result = await finaliseSession(session.id, "timeout", "server_overdue");
  return result.session;
}

/**
 * Whether the candidate may start a new attempt: their latest attempt (if
 * any) is submitted and the admin has allowed more attempts than they've taken.
 */
export async function getAttemptAllowance(
  candidateId: string,
): Promise<{ taken: number; maxAttempts: number; canStartNew: boolean }> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);
  const [r] = await db.query<{ taken: number; max_attempts: number; open: number }>(
    `select coalesce(max(s.attempt_number), 0)::int as taken,
            count(*) filter (where s.status = 'in_progress')::int as open,
            (select max_attempts from candidates where id = $1) as max_attempts
       from assessment_sessions s
      where s.candidate_id = $1 and s.assessment_id = $2`,
    [candidateId, assessmentId],
  );
  const maxAttempts = r?.max_attempts ?? 1;
  const taken = r?.taken ?? 0;
  return { taken, maxAttempts, canStartNew: (r?.open ?? 0) === 0 && taken < maxAttempts };
}

/**
 * Start the next attempt, if one is allowed. Idempotent: while an attempt is
 * in progress (or none is allowed) this returns the latest attempt — the timer
 * never restarts.
 */
export async function startSession(candidateId: string): Promise<SessionRow> {
  const db = await getDb();
  const assessmentId = await getAssessmentId(db);
  const minutes = assessmentDurationMinutes();
  // The allowance check and the attempt number are computed in the insert
  // itself; the unique (candidate, assessment, attempt) index stops a double start.
  const inserted = await db.query<SessionRow>(
    `insert into assessment_sessions
       (candidate_id, assessment_id, attempt_number, started_at, expires_at, duration_minutes)
     select $1::uuid, $2::uuid, coalesce(max(s.attempt_number), 0) + 1,
            now(), now() + make_interval(mins => $3::int), $3::int
       from assessment_sessions s
      where s.candidate_id = $1::uuid and s.assessment_id = $2::uuid
     having coalesce(max(s.attempt_number), 0) < (select max_attempts from candidates where id = $1::uuid)
        and count(*) filter (where s.status = 'in_progress') = 0
     on conflict (candidate_id, assessment_id, attempt_number) do nothing
     returning ${SESSION_COLUMNS}`,
    [candidateId, assessmentId, minutes],
  );
  if (inserted[0]) {
    const s = inserted[0];
    // Create the nine (empty) response rows up front.
    for (let item = 1; item <= 9; item++) {
      await db.query(
        `insert into assessment_responses (session_id, item_id) values ($1, $2) on conflict do nothing`,
        [s.id, item],
      );
    }
    await recordEvent(db, s.id, "session_started", null, { duration_minutes: minutes, attempt: s.attempt_number });
    return s;
  }
  const existing = await getCandidateSession(candidateId);
  if (!existing) throw new Error("Failed to start session");
  return existing;
}

export async function getResponses(sessionId: string): Promise<ResponseRow[]> {
  const db = await getDb();
  return db.query<ResponseRow>(
    `select id, session_id, item_id, priority, action_text, say_now_text, hold_text, say_hold_text, recommendation_text,
            first_opened_at, last_opened_at, visit_count, updated_at
       from assessment_responses where session_id = $1 order by item_id`,
    [sessionId],
  );
}

function validateFields(itemId: number, fields: ResponseFields): ResponseFields {
  if (!Number.isInteger(itemId) || itemId < 1 || itemId > 9) {
    throw new SessionError("invalid", "Invalid item");
  }
  // say_hold_text is still accepted so drafts saved locally by the old form
  // (before the split) can sync instead of being rejected.
  const allowed: ResponseField[] =
    itemId === 9
      ? ["recommendation_text"]
      : ["priority", "action_text", "say_now_text", "hold_text", "say_hold_text"];
  const clean: ResponseFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.includes(key as ResponseField)) {
      throw new SessionError("invalid", `Field ${key} is not valid for item ${itemId}`);
    }
    if (value !== null && typeof value !== "string") throw new SessionError("invalid", "Invalid value");
    if (key === "priority" && value !== null && value !== "" && !(PRIORITIES as readonly string[]).includes(value)) {
      throw new SessionError("invalid", "Invalid priority");
    }
    if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) {
      throw new SessionError("invalid", "Response too long");
    }
    clean[key as ResponseField] = value === "" ? null : value;
  }
  return clean;
}

/**
 * Persist changed fields for one item and append version history.
 * Accepted only while the session is in progress and within the grace window.
 */
export async function saveResponse(
  sessionId: string,
  itemId: number,
  fields: ResponseFields,
): Promise<{ updatedAt: Date; afterExpiry: boolean }> {
  const clean = validateFields(itemId, fields);
  const db = await getDb();
  const grace = submissionGraceSeconds();

  const outcome = await db.transaction(async (tx) => {
    const sess = await tx.query<SessionRow>(
      `select ${SESSION_COLUMNS} from assessment_sessions where id = $1 for update`,
      [sessionId],
    );
    const s = sess[0];
    if (!s) throw new SessionError("invalid", "Session not found");
    if (s.status !== "in_progress") throw new SessionError("locked", "Assessment already submitted");
    const overdueMs = s.db_now.getTime() - s.expires_at.getTime();
    if (overdueMs > grace * 1000) return { overdue: true as const };
    const afterExpiry = overdueMs > 0;

    await tx.query(
      `insert into assessment_responses (session_id, item_id) values ($1, $2) on conflict do nothing`,
      [sessionId, itemId],
    );
    const current = (
      await tx.query<ResponseRow>(
        `select * from assessment_responses where session_id = $1 and item_id = $2 for update`,
        [sessionId, itemId],
      )
    )[0];

    const changed = (Object.keys(clean) as ResponseField[]).filter((f) => (current[f] ?? null) !== clean[f]);
    if (changed.length === 0) return { overdue: false as const, updatedAt: current.updated_at, afterExpiry };

    const sets = changed.map((f, i) => `${f} = $${i + 3}`).join(", ");
    const updated = await tx.query<{ updated_at: Date }>(
      `update assessment_responses set ${sets}, updated_at = now()
        where session_id = $1 and item_id = $2 returning updated_at`,
      [sessionId, itemId, ...changed.map((f) => clean[f])],
    );
    for (const f of changed) {
      await tx.query(
        `insert into response_versions
           (response_id, session_id, item_id, field_changed, old_value, new_value, after_expiry)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [current.id, sessionId, itemId, f, current[f] ?? null, clean[f] ?? null, afterExpiry],
      );
    }
    await tx.query(`update assessment_sessions set updated_at = now() where id = $1`, [sessionId]);
    return { overdue: false as const, updatedAt: updated[0].updated_at, afterExpiry };
  });

  if (outcome.overdue) {
    await finaliseSession(sessionId, "timeout", "server_overdue");
    throw new SessionError("locked", "Time has expired");
  }
  return { updatedAt: outcome.updatedAt, afterExpiry: outcome.afterExpiry };
}

/** Telemetry: item opened. */
export async function recordVisit(sessionId: string, itemId: number): Promise<void> {
  if (!Number.isInteger(itemId) || itemId < 1 || itemId > 9) throw new SessionError("invalid", "Invalid item");
  const db = await getDb();
  await db.query(
    `update assessment_responses r
        set first_opened_at = coalesce(r.first_opened_at, now()),
            last_opened_at = now(),
            visit_count = r.visit_count + 1
       from assessment_sessions s
      where r.session_id = s.id and s.id = $1 and r.item_id = $2 and s.status = 'in_progress'`,
    [sessionId, itemId],
  );
}

/**
 * Finalise (lock) a session. Idempotent — returns the already-submitted
 * session unchanged if it was finalised before. Generates the report.
 */
export async function finaliseSession(
  sessionId: string,
  reason: SubmissionReason,
  trigger: string,
): Promise<{ session: SessionRow; changed: boolean }> {
  const db = await getDb();
  const updated = await db.query<SessionRow>(
    `update assessment_sessions
        set status = 'submitted', submission_reason = $2, submitted_at = now(), updated_at = now()
      where id = $1 and status = 'in_progress'
      returning ${SESSION_COLUMNS}`,
    [sessionId, reason],
  );
  if (updated[0]) {
    await recordEvent(db, sessionId, "session_submitted", null, { reason, trigger });
    // Generate the report now; if this fails it is regenerated on first download.
    try {
      const { generateCandidateReport } = await import("./report");
      await generateCandidateReport(sessionId);
    } catch (err) {
      console.error("Report generation failed for session", sessionId, err);
      await recordEvent(db, sessionId, "report_generation_failed", null, { message: String(err) });
    }
    return { session: updated[0], changed: true };
  }
  const current = await db.query<SessionRow>(`select ${SESSION_COLUMNS} from assessment_sessions where id = $1`, [
    sessionId,
  ]);
  if (!current[0]) throw new SessionError("invalid", "Session not found");
  return { session: current[0], changed: false };
}

/**
 * Candidate-requested submission.
 *  - intent "manual": submits now (recorded as "timeout" if time has already run out).
 *  - intent "timeout": accepted only once the server agrees time is up.
 */
export async function submitSession(sessionId: string, intent: SubmissionReason) {
  const db = await getDb();
  const rows = await db.query<SessionRow>(`select ${SESSION_COLUMNS} from assessment_sessions where id = $1`, [
    sessionId,
  ]);
  const s = rows[0];
  if (!s) throw new SessionError("invalid", "Session not found");
  if (s.status === "submitted") return s;

  const remainingMs = s.expires_at.getTime() - s.db_now.getTime();
  // Allow 1.5s for clock offset estimation error between browser and server.
  const expired = remainingMs <= 1500;
  if (intent === "timeout" && !expired) {
    throw new SessionError("not_expired", "Time has not expired yet", {
      expiresAt: s.expires_at.toISOString(),
      serverNow: s.db_now.toISOString(),
    });
  }
  const reason: SubmissionReason = expired ? "timeout" : "manual";
  const { session } = await finaliseSession(sessionId, reason, `client_${intent}`);
  return session;
}

/** Client-safe view of the session timing. */
export function sessionDto(s: SessionRow) {
  return {
    id: s.id,
    attemptNumber: s.attempt_number,
    status: s.status,
    startedAt: s.started_at.toISOString(),
    expiresAt: s.expires_at.toISOString(),
    durationMinutes: s.duration_minutes,
    submittedAt: s.submitted_at?.toISOString() ?? null,
    submissionReason: s.submission_reason,
    serverNow: s.db_now.toISOString(),
  };
}
export type SessionDto = ReturnType<typeof sessionDto>;

export function responsesDto(rows: ResponseRow[]) {
  return rows.map((r) => ({
    itemId: r.item_id,
    priority: r.priority,
    action_text: r.action_text,
    say_now_text: r.say_now_text,
    hold_text: r.hold_text,
    say_hold_text: r.say_hold_text,
    recommendation_text: r.recommendation_text,
  }));
}
export type ResponseDto = ReturnType<typeof responsesDto>[number];
