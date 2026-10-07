import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCandidate } from "@/lib/auth";
import { getCandidateSession } from "@/lib/sessions";
import { assessmentDurationMinutes } from "@/lib/config";
import { participantNote } from "@/content/drishti";
import { CandidateShell } from "@/components/CandidateShell";
import { BRIEFING_SECTIONS, BriefingSection } from "@/components/BriefingSections";
import { StartAssessmentButton } from "@/components/StartAssessmentButton";

export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const candidate = await getCandidate();
  if (!candidate) redirect("/");
  const session = await getCandidateSession(candidate.id);
  if (session?.status === "submitted") redirect("/complete");
  const minutes = session?.duration_minutes ?? assessmentDurationMinutes();

  return (
    <CandidateShell candidate={candidate}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-0.5 text-sm">
            <Link href="/dashboard" className="mb-5 flex items-center gap-1.5 text-ink-soft hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Candidate pack</div>
            {BRIEFING_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-ink-soft hover:bg-white hover:text-ink">
                <span className="mr-2 text-ink-faint">{s.letter}.</span>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Candidate briefing</h1>
          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/70 p-5 text-[15px] leading-relaxed text-ink">
            {participantNote}
          </div>
          {BRIEFING_SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="mt-6 scroll-mt-24 rounded-2xl border border-line bg-white p-7 sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Section {s.letter}</div>
              <h2 className="mb-5 mt-1 text-xl font-semibold tracking-tight">{s.title}</h2>
              <BriefingSection id={s.id} />
            </section>
          ))}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-white p-7 sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">Ready to begin?</div>
              <div className="text-sm text-ink-soft">
                The {minutes}-minute timer starts when you select Start assessment. You can reopen this briefing at any
                time during the assessment.
              </div>
            </div>
            <StartAssessmentButton durationMinutes={minutes} resume={session?.status === "in_progress"} className="shrink-0" />
          </div>
        </main>
      </div>
    </CandidateShell>
  );
}
