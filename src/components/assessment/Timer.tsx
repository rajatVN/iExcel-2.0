"use client";

import { Clock } from "lucide-react";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Live countdown display. `remainingMs` is derived from the server's expires_at. */
export function Timer({ remainingMs }: { remainingMs: number }) {
  const min = remainingMs / 60000;
  const tone =
    remainingMs <= 60_000
      ? "bg-red-600 text-white border-red-600 animate-soft-pulse"
      : min <= 5
        ? "bg-red-50 text-red-700 border-red-200"
        : min <= 10
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-white text-ink border-line";
  const labelTone = remainingMs <= 60_000 ? "text-red-100" : min <= 10 ? "opacity-80" : "text-ink-faint";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-1.5 transition-colors ${tone}`}
      role="timer"
      aria-live="off"
      aria-label={`Time left ${formatClock(remainingMs)}`}
    >
      <Clock className="h-5 w-5 shrink-0" strokeWidth={2} />
      <div className="leading-none">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${labelTone}`}>Time left</div>
        <div
          className={`mt-1 font-semibold tabular-nums tracking-tight ${remainingMs <= 60_000 ? "text-[22px]" : "text-xl"}`}
        >
          {formatClock(remainingMs)}
        </div>
      </div>
    </div>
  );
}
