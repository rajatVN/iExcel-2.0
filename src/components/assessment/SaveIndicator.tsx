"use client";

import { AlertTriangle, Check, CloudOff, Loader2, Lock, RefreshCw } from "lucide-react";
import type { SaveStatus } from "./useAutosave";

const VIEW: Record<SaveStatus, { text: string; icon: typeof Check; cls: string; spin?: boolean }> = {
  saved: { text: "Saved", icon: Check, cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  pending: { text: "Saving…", icon: Loader2, cls: "text-ink-soft bg-white border-line", spin: true },
  saving: { text: "Saving…", icon: Loader2, cls: "text-ink-soft bg-white border-line", spin: true },
  retrying: {
    text: "Save failed — retrying…",
    icon: AlertTriangle,
    cls: "text-amber-800 bg-amber-50 border-amber-200",
  },
  offline: {
    text: "Offline — your work is being saved locally",
    icon: CloudOff,
    cls: "text-amber-800 bg-amber-50 border-amber-200",
  },
  syncing: { text: "Back online — syncing…", icon: RefreshCw, cls: "text-brand-700 bg-brand-50 border-brand-100", spin: true },
  locked: { text: "Responses locked", icon: Lock, cls: "text-ink-soft bg-slate-50 border-line" },
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const v = VIEW[status];
  const Icon = v.icon;
  return (
    <div
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${v.cls}`}
      role="status"
      aria-live="polite"
      data-save-status={status}
    >
      <Icon className={`h-3.5 w-3.5 ${v.spin ? "animate-spin" : ""}`} />
      {v.text}
      {status === "saved" && <span aria-hidden>✓</span>}
    </div>
  );
}
