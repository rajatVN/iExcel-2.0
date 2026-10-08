import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Clock, Inbox, UserRound } from "lucide-react";
import { getCandidate } from "@/lib/auth";
import { getAttemptAllowance, getCandidateSession } from "@/lib/sessions";
import { assessmentDurationMinutes } from "@/lib/config";
import { ITEM_COUNT, ROLE_NAME, ROLE_TITLE } from "@/content/drishti";
import { CandidateShell } from "@/components/CandidateShell";
import { StartAssessmentButton } from "@/components/StartAssessmentButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const candidate = await getCandidate();
  if (!candidate) redirect("/");
  const session = await getCandidateSession(candidate.id);
  const allowance = await getAttemptAllowance(candidate.id);
  // A submitted candidate only comes back here when the admin has released a retest.
  if (session?.status === "submitted" && !allowance.canStartNew) redirect("/complete");

  const inProgress = session?.status === "in_progress";
  const attempt = inProgress ? session.attempt_number : allowance.taken + 1;
  const isRetest = attempt > 1;
  const minutes = inProgress ? session.duration_minutes : assessmentDurationMinutes();
  const remainingMin = session
    ? Math.max(0, Math.ceil((session.expires_at.getTime() - session.db_now.getTime()) / 60000))
    : null;

  return (
    <CandidateShell candidate={candidate}>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-ink-soft">Welcome, {candidate.name}</p>
        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="grid lg:grid-cols-[1.4fr_1fr]">
            <div className="p-8 sm:p-10">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                iExcel 2.0 · In-Basket Assessment
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Project Drishti</h1>
              {isRetest && (
                <p className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                  Retest – Attempt {attempt}
                </p>
              )}
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                You will play the role of a manager at a fictional company who has just returned from a week away to
                find nine items waiting. Read the briefing first. Then, for each item, decide its priority, what you
                will do, with whom and by when, and what you will say now or hold back. The last item asks for the
                outline of a one-page recommendation.
              </p>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                The timer starts only when you select{" "}
                <strong className="text-ink">{isRetest ? "Start retest" : "Start assessment"}</strong>. Your
                responses save automatically as you work.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/briefing"
                  className="flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-ink transition hover:bg-slate-50"
                >
                  <BookOpen className="h-4 w-4" /> View instructions
                </Link>
                <StartAssessmentButton durationMinutes={minutes} resume={inProgress} retest={isRetest} />
              </div>
              {inProgress && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Your {isRetest ? "retest" : "assessment"} is in progress — about {remainingMin} minute{remainingMin === 1 ? "" : "s"} left. The
                  timer has kept running.
                </p>
              )}
            </div>
            <dl className="grid content-start gap-px bg-line lg:border-l lg:border-line">
              {[
                { icon: UserRound, label: "Your role", value: ROLE_NAME, sub: ROLE_TITLE },
                { icon: Clock, label: "Duration", value: `${minutes} minutes`, sub: "One continuous session" },
                { icon: Inbox, label: "Items", value: String(ITEM_COUNT), sub: "Open them in any order" },
                {
                  icon: UserRound,
                  label: "Candidate",
                  value: candidate.name,
                  sub: candidate.candidate_code,
                },
              ].map((r) => (
                <div key={r.label} className="flex gap-4 bg-white px-8 py-5">
                  <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{r.label}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{r.value}</dd>
                    <dd className="text-sm text-ink-soft">{r.sub}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </main>
    </CandidateShell>
  );
}
