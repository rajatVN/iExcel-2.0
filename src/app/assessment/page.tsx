import { redirect } from "next/navigation";
import { getCandidate } from "@/lib/auth";
import { getCandidateSession, getResponses, responsesDto, sessionDto } from "@/lib/sessions";
import { AssessmentApp } from "@/components/assessment/AssessmentApp";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const candidate = await getCandidate();
  if (!candidate) redirect("/");
  const session = await getCandidateSession(candidate.id);
  if (!session) redirect("/dashboard");
  if (session.status === "submitted") redirect("/complete");
  const responses = await getResponses(session.id);
  return (
    <AssessmentApp
      session={sessionDto(session)}
      responses={responsesDto(responses)}
      candidate={{ name: candidate.name, code: candidate.candidate_code }}
    />
  );
}
