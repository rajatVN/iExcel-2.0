"use client";

import { useEffect } from "react";

/** After submission, remove any locally-held draft copy from this device. */
export function ClearLocalDraft({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(`inbasket:pending:${sessionId}`);
      window.sessionStorage.removeItem(`inbasket:item:${sessionId}`);
    } catch {}
  }, [sessionId]);
  return null;
}
