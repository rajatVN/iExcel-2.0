import { redirect } from "next/navigation";
import { getCandidate } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCandidate()) redirect("/dashboard");
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <Brand dark subtitle="Behavioural assessment" />
        <div className="relative mt-auto max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300/80">In-Basket Exercise</div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">Project Drishti</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100/75">
            Step into the role of a manager returning to a full inbox. Read the briefing, work through nine items and
            decide what you will do, with whom, and when.
          </p>
        </div>
        <div className="relative mt-16 text-xs text-blue-200/50">iExcel 2.0 · Pilot · October 2026</div>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mb-8 mt-1.5 text-sm text-ink-soft">Enter the candidate ID and access code you were given.</p>
          <LoginForm mode="candidate" />
          <p className="mt-8 text-xs leading-relaxed text-ink-faint">
            Pilot login. Your responses are confidential and are used only for this assessment.
          </p>
        </div>
      </section>
    </div>
  );
}
