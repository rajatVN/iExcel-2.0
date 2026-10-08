import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { fmt, getSessionDetail, mmss, RESET_PHRASE, RETEST_PHRASE } from "@/lib/admin";
import { countWords, items } from "@/content/drishti";
import { AdminShell } from "@/components/AdminShell";
import { DownloadButtons } from "@/components/DownloadButtons";
import { RegenerateReportButton } from "@/components/RegenerateReportButton";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";

export const dynamic = "force-dynamic";

const FIELD_LABEL: Record<string, string> = {
  priority: "Priority",
  action_text: "Action",
  say_now_text: "Say now",
  hold_text: "Hold",
  say_hold_text: "Say now / Hold (legacy)",
  recommendation_text: "Recommendation",
};

function Text({ value }: { value: string | null }) {
  if (!value || !value.trim()) return <span className="italic text-ink-faint">[No response]</span>;
  return <div className="whitespace-pre-wrap leading-relaxed text-ink">{value}</div>;
}

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const d = await getSessionDetail(sessionId);
  if (!d) notFound();
  const { session: s, candidate } = d;
  const end = s.submitted_at ? Math.min(s.submitted_at.getTime(), s.expires_at.getTime()) : null;
  const latest = d.attempts[d.attempts.length - 1];
  const isLatest = latest?.id === s.id;
  const retestPending = isLatest && s.status === "submitted" && candidate.max_attempts > s.attempt_number;
  const attemptLabel = (n: number) => (n === 1 ? "Attempt 1" : `Retest – Attempt ${n}`);

  return (
    <AdminShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All candidates
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
            <p className="text-sm text-ink-soft">
              {candidate.candidate_code} · {attemptLabel(s.attempt_number)}
            </p>
          </div>
          {s.status === "submitted" && (
            <div className="flex flex-col items-end gap-2">
              <DownloadButtons sessionId={s.id} compact />
              <RegenerateReportButton sessionId={s.id} />
            </div>
          )}
        </div>

        {d.attempts.length > 1 && (
          <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Attempts">
            {d.attempts.map((a) => (
              <Link
                key={a.id}
                href={`/admin/sessions/${a.id}`}
                aria-current={a.id === s.id ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                  a.id === s.id ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-ink-soft ring-line hover:text-ink"
                }`}
              >
                {attemptLabel(a.attempt_number)}
                {a.status === "in_progress" && " · in progress"}
              </Link>
            ))}
          </nav>
        )}

        <section className="mt-6 rounded-2xl border border-line bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">Manage attempts</div>
              <div className="text-ink-soft">
                {retestPending
                  ? `Retest released — waiting for the candidate to start ${attemptLabel(candidate.max_attempts)}.`
                  : !isLatest
                    ? "This is an earlier attempt. Only the latest attempt can be reset."
                    : s.status === "in_progress"
                      ? "Attempt in progress. A retest can be released once it is submitted."
                      : "The candidate cannot take another attempt unless you release a retest."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isLatest && s.status === "submitted" && !retestPending && (
                <ConfirmActionButton
                  label="Release retest"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  title={`Release a retest for ${candidate.name}?`}
                  description={
                    <>
                      <p>
                        The candidate will see <strong>Retest – Attempt {s.attempt_number + 1}</strong> on their
                        dashboard and can start it with a fresh timer and blank answers.
                      </p>
                      <p>Earlier attempts, their responses and reports are kept.</p>
                    </>
                  }
                  phrase={RETEST_PHRASE}
                  confirmLabel="Release retest"
                  endpoint={`/api/admin/candidates/${candidate.id}/retest`}
                />
              )}
              {retestPending && (
                <ConfirmActionButton
                  label="Withdraw retest"
                  icon={<Undo2 className="h-3.5 w-3.5" />}
                  title="Withdraw the released retest?"
                  description={<p>The candidate has not started it yet. They will no longer be able to start it.</p>}
                  confirmLabel="Withdraw retest"
                  endpoint={`/api/admin/candidates/${candidate.id}/retest`}
                  method="DELETE"
                />
              )}
              {isLatest && (
                <ConfirmActionButton
                  label="Reset this attempt"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  danger
                  title={`Reset ${attemptLabel(s.attempt_number)}?`}
                  description={
                    <>
                      <p>
                        This <strong>permanently deletes</strong> this attempt for {candidate.name}: all responses,
                        change history, session events and the report. It cannot be undone.
                      </p>
                      <p>
                        {s.status === "in_progress"
                          ? "The candidate is mid-attempt; their open page will be closed. "
                          : ""}
                        They can then start {attemptLabel(s.attempt_number)} again from the beginning.
                      </p>
                    </>
                  }
                  phrase={RESET_PHRASE}
                  confirmLabel="Permanently reset"
                  endpoint={`/api/admin/sessions/${s.id}/reset`}
                  afterSuccess="remaining-attempt"
                />
              )}
            </div>
          </div>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["Status", s.status === "submitted" ? "Submitted" : "In progress"],
            ["Submission", s.submission_reason === "timeout" ? "Time expired" : s.submission_reason === "manual" ? "Manual" : "—"],
            ["Started", fmt(s.started_at)],
            ["Submitted", fmt(s.submitted_at)],
            ["Time allowed", `${s.duration_minutes} min`],
            ["Time used", end ? mmss(end - s.started_at.getTime()) : "—"],
            ["Report generated", d.report ? `${fmt(d.report.generated_at)} (×${d.report.generation_count})` : "—"],
            ["Changes recorded", String(d.versions.length)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-xs text-ink-faint">{k}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 space-y-4">
          {items.map((it) => {
            const r = d.responses.find((x) => x.item_id === it.id);
            const hist = d.versions.filter((v) => v.item_id === it.id);
            const late = hist.filter((v) => v.after_expiry).length;
            return (
              <section key={it.id} className="rounded-2xl border border-line bg-white">
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-6 py-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Item {it.id} · {it.formatLabel}
                    </div>
                    <h2 className="font-semibold">{it.shortTitle}</h2>
                  </div>
                  <div className="text-xs tabular-nums text-ink-faint">
                    Opened {r?.visit_count ?? 0}× · first {fmt(r?.first_opened_at)} · last {fmt(r?.last_opened_at)}
                  </div>
                </header>
                <div className="space-y-4 px-6 py-5 text-sm">
                  {it.responseType === "recommendation" ? (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        Recommendation · {countWords(r?.recommendation_text)} words
                      </div>
                      <Text value={r?.recommendation_text ?? null} />
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Priority</div>
                        {r?.priority ? <span className="font-semibold">{r.priority}</span> : <Text value={null} />}
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Action</div>
                        <Text value={r?.action_text ?? null} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Say now</div>
                          <Text value={r?.say_now_text ?? null} />
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Hold</div>
                          <Text value={r?.hold_text ?? null} />
                        </div>
                      </div>
                      {r?.say_hold_text?.trim() && (
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                            Say now / Hold (legacy)
                          </div>
                          <Text value={r.say_hold_text} />
                        </div>
                      )}
                    </>
                  )}
                  {hist.length > 0 && (
                    <details className="rounded-lg bg-slate-50 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                        Change history ({hist.length} saved change{hist.length === 1 ? "" : "s"}
                        {late ? `, ${late} after expiry` : ""})
                      </summary>
                      <ol className="mt-3 space-y-3">
                        {hist.map((v, i) => (
                          <li key={i} className="border-l-2 border-line pl-3 text-xs">
                            <div className="text-ink-faint">
                              {fmt(v.changed_at)} · {FIELD_LABEL[v.field_changed] ?? v.field_changed}
                              {v.after_expiry && <span className="ml-1 font-semibold text-amber-700">after expiry</span>}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-ink">{v.new_value ?? <em className="text-ink-faint">cleared</em>}</div>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-white">
          <h2 className="border-b border-line px-6 py-4 font-semibold">Session events</h2>
          <ol className="divide-y divide-line text-xs">
            {d.events.map((e, i) => (
              <li key={i} className="flex gap-4 px-6 py-2">
                <span className="w-36 shrink-0 tabular-nums text-ink-faint">{fmt(e.created_at)}</span>
                <span className="font-medium">{e.event_type}</span>
                {e.item_id && <span className="text-ink-soft">Item {e.item_id}</span>}
                {e.payload ? <span className="truncate text-ink-faint">{JSON.stringify(e.payload)}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </AdminShell>
  );
}
