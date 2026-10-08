"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";

/**
 * Admin action behind a confirmation dialog. With `phrase`, the confirm button
 * stays disabled until the admin types it exactly (case-sensitive); the server
 * checks it again.
 */
export function ConfirmActionButton({
  label,
  icon,
  title,
  description,
  phrase,
  confirmLabel,
  endpoint,
  method = "POST",
  danger = false,
  afterSuccess = "refresh",
}: {
  label: string;
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  phrase?: string;
  confirmLabel: string;
  endpoint: string;
  method?: "POST" | "DELETE";
  danger?: boolean;
  /** "remaining-attempt": after a reset, open the candidate's remaining latest attempt (or the list). */
  afterSuccess?: "refresh" | "remaining-attempt";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !phrase || typed === phrase;
  const id = `confirm-${label.replace(/\W+/g, "-").toLowerCase()}`;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  async function run() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: phrase ? JSON.stringify({ confirm: typed }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(typeof data.message === "string" ? data.message : `Request failed (${res.status})`);
      setOpen(false);
      setTyped("");
      if (afterSuccess === "remaining-attempt") {
        const next = data.remainingSessionId;
        router.replace(typeof next === "string" ? `/admin/sessions/${next}` : "/admin");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const tone = danger
    ? "border-red-200 text-red-700 hover:bg-red-50"
    : "border-line text-ink hover:bg-slate-50";
  const confirmTone = danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold ${tone}`}
      >
        {icon}
        {label}
      </button>
      <Modal open={open} onClose={close} labelledBy={id} dismissable={!busy}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <h2 id={id} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{description}</div>
          {phrase && (
            <label className="mt-4 block text-sm">
              <span className="text-ink-soft">
                Type <strong className="font-mono text-ink">{phrase}</strong> to confirm.
              </span>
              <input
                data-autofocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              data-autofocus={phrase ? undefined : true}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ready || busy}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${confirmTone}`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
