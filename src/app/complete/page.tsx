import { redirect } from "next/navigation";
import { CheckCircle2, TimerOff } from "lucide-react";
import { getCandidate } from "@/lib/auth";
import { getAttemptAllowance, getCandidateSession } from "@/lib/sessions";
import { CandidateShell } from "@/components/CandidateShell";
import { ClearLocalDraft } from "@/components/ClearLocalDraft";

export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const candidate = await getCandidate();
  if (!candidate) redirect("/");
  const session = await getCandidateSession(candidate.id);
  if (!session) redirect("/dashboard");
  if (session.status !== "submitted") redirect("/assessment");
  if ((await getAttemptAllowance(candidate.id)).canStartNew) redirect("/dashboard"); // retest released

  const timeout = session.submission_reason === "timeout";
  const Icon = timeout ? TimerOff : CheckCircle2;

  return (
    <CandidateShell candidate={candidate}>
      <ClearLocalDraft sessionId={session.id} />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-line bg-white p-10 text-center shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              timeout ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {timeout ? "Assessment time has ended." : "Assessment submitted successfully."}
          </h1>
          <p className="mt-3 text-[15px] text-ink-soft">Thank you for attempting this assessment.</p>
          <p className="mt-1 text-[15px] text-ink-soft">Your responses have been recorded.</p>
        </div>
        <p className="mt-6 text-center text-xs text-ink-faint">
          Your responses can no longer be edited. You may now close this window.
        </p>
      </main>
    </CandidateShell>
  );
}
