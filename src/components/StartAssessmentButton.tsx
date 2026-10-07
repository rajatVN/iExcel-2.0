"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Modal } from "./Modal";

export function StartAssessmentButton({
  durationMinutes,
  resume = false,
  className = "",
}: {
  durationMinutes: number;
  resume?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btn =
    "flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-70";

  if (resume) {
    return (
      <button className={`${btn} ${className}`} onClick={() => router.push("/assessment")}>
        <Play className="h-4 w-4" /> Resume assessment
      </button>
    );
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session/start", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      router.push("/assessment");
    } catch {
      setError("Could not start the assessment. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`${btn} ${className}`} onClick={() => setOpen(true)}>
        <Play className="h-4 w-4" /> Start assessment
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} labelledBy="start-title" dismissable={!busy}>
        <h2 id="start-title" className="text-lg font-semibold tracking-tight">
          Start the assessment now?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Your {durationMinutes}-minute timer starts as soon as you continue and cannot be paused. Refreshing the page or
          closing the browser does not stop the clock. When time runs out, your responses are submitted automatically.
        </p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Not yet
          </button>
          <button
            onClick={start}
            disabled={busy}
            data-autofocus
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Start the {durationMinutes}-minute timer
          </button>
        </div>
      </Modal>
    </>
  );
}
