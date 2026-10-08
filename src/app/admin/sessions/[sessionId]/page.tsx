import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { fmt, getSessionDetail, mmss } from "@/lib/admin";
import { countWords, items } from "@/content/drishti";
import { AdminShell } from "@/components/AdminShell";
import { DownloadButtons } from "@/components/DownloadButtons";
import { RegenerateReportButton } from "@/components/RegenerateReportButton";

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

  return (
    <AdminShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All candidates
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
            <p className="text-sm text-ink-soft">{candidate.candidate_code}</p>
          </div>
          {s.status === "submitted" && (
            <div className="flex flex-col items-end gap-2">
              <DownloadButtons sessionId={s.id} compact />
              <RegenerateReportButton sessionId={s.id} />
            </div>
          )}
        </div>

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
