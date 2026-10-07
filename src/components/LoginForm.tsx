"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

const inputCls =
  "block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition " +
  "placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

export function LoginForm({ mode }: { mode: "candidate" | "admin" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body =
      mode === "candidate"
        ? { candidateCode: String(form.get("candidateCode") ?? ""), accessCode: String(form.get("accessCode") ?? "") }
        : { accessCode: String(form.get("accessCode") ?? "") };
    try {
      const res = await fetch(mode === "candidate" ? "/api/auth/login" : "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.replace(mode === "candidate" ? "/dashboard" : "/admin");
        router.refresh();
        return;
      }
      setError(
        res.status === 503
          ? "The admin area is not configured (ADMIN_ACCESS_CODE)."
          : mode === "candidate"
            ? "Candidate ID or access code not recognised."
            : "Access code not recognised.",
      );
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "candidate" && (
        <div>
          <label htmlFor="candidateCode" className="mb-1.5 block text-sm font-medium text-ink">
            Candidate ID
          </label>
          <input
            id="candidateCode"
            name="candidateCode"
            className={`${inputCls} uppercase tracking-wide placeholder:normal-case`}
            placeholder="e.g. CAND001"
            autoComplete="username"
            autoCapitalize="characters"
            required
            autoFocus
          />
        </div>
      )}
      <div>
        <label htmlFor="accessCode" className="mb-1.5 block text-sm font-medium text-ink">
          Access code
        </label>
        <input
          id="accessCode"
          name="accessCode"
          type="password"
          className={inputCls}
          autoComplete="current-password"
          required
          autoFocus={mode === "admin"}
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-navy-800 disabled:opacity-70"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continue
        {!busy && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
