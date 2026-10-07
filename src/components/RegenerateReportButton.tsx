"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function RegenerateReportButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const res = await fetch(`/api/admin/sessions/${sessionId}/regenerate`, { method: "POST" }).catch(() => null);
          setBusy(false);
          setMsg(res?.ok ? "Report regenerated from stored responses." : "Regeneration failed.");
          router.refresh();
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Regenerate report
      </button>
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
    </div>
  );
}
