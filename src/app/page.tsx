import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getCandidate } from "@/lib/auth";
import { Brand, BrandMark } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

/** Neutral metadata: nothing about the case is exposed before sign-in. */
export const metadata: Metadata = {
  title: "iExcel 2.0 · Sign in",
  description: "iExcel 2.0 behavioural assessment",
};

/**
 * Organisation logo for the login panel. Place an approved, white/reversed logo
 * in /public (e.g. /public/brand/organisation-logo.svg) and set the path here.
 * While null, a neutral placeholder is shown.
 */
const ORGANISATION_LOGO: { src: string; alt: string } | null = null;

export default async function LoginPage() {
  if (await getCandidate()) redirect("/dashboard");
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 85% 10%, rgba(59,116,232,0.28), transparent 70%), radial-gradient(50% 45% at 0% 100%, rgba(33,58,104,0.9), transparent 70%)",
          }}
        />

        <div className="relative">
          {ORGANISATION_LOGO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ORGANISATION_LOGO.src} alt={ORGANISATION_LOGO.alt} className="h-10 w-auto" />
          ) : (
            <div
              className="flex h-10 w-40 items-center justify-center rounded-md border border-dashed border-white/20 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-100/40"
              aria-hidden
            >
              Organisation logo
            </div>
          )}
        </div>

        <div className="relative my-auto max-w-md">
          <BrandMark className="h-12 w-12" />
          <h1 className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tight">iExcel 2.0</h1>
          <div className="mt-5 h-px w-12 bg-brand-500" />
          <p className="mt-5 text-lg text-blue-100/75">Behavioural assessment</p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-blue-200/50">
          <LockKeyhole className="h-3.5 w-3.5" />
          Secure candidate access
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-12 lg:hidden">
            <Brand subtitle="Behavioural assessment" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mb-9 mt-2 text-sm leading-relaxed text-ink-soft">
            Enter the candidate ID and access code you were given.
          </p>
          <LoginForm mode="candidate" />
          <div className="mt-10 flex gap-2.5 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Your responses are confidential and are used only for this assessment.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
