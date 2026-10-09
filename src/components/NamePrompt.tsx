"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Modal } from "./Modal";

/** Mandatory, non-dismissable prompt for the candidate's full name. */
export function NamePrompt() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = name.trim().replace(/\s+/g, " ");
  const valid = clean.length >= 2 && /\p{L}/u.test(clean);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      // 409: already set (e.g. in another tab) — just show the dashboard.
      if (res.ok || res.status === 409) {
        router.refresh();
        return;
      }
      setError("Please enter your full name (letters, at least 2 characters).");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <Modal open onClose={() => {}} labelledBy="name-prompt-title" dismissable={false}>
      <form onSubmit={onSubmit}>
        <h2 id="name-prompt-title" className="mb-4 text-lg font-semibold text-ink">
          Type in your name
        </h2>
        <input
          aria-labelledby="name-prompt-title"
          id="candidate-name"
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          required
          className="block w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        />
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !valid}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-navy-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </Modal>
  );
}
