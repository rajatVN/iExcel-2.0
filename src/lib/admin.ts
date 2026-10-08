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
    status: string | null;
    submission_reason: string | null;
    started_at: Date | null;
    expires_at: Date | null;
    submitted_at: Date | null;
    db_now: Date;
    report_at: Date | null;
  }>(
    `select c.id as candidate_id, c.candidate_code, c.name,
            s.id as session_id, s.status, s.submission_reason, s.started_at, s.expires_at, s.submitted_at,
            now() as db_now, r.generated_at as report_at
       from candidates c
       left join assessment_sessions s on s.candidate_id = c.id and s.assessment_id = $1
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
  const [candidate] = await db.query<{ name: string; candidate_code: string }>(
    `select name, candidate_code from candidates where id = $1`,
    [session.candidate_id],
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
  return { session, candidate, responses, versions, events, report: report ?? null };
}
