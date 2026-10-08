"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autosave engine for assessment responses.
 *
 * - Every edit is recorded in a `pending` map and mirrored to localStorage
 *   immediately, so nothing typed is lost if the network or browser fails.
 * - Pending changes are sent to the server after a short debounce (or
 *   immediately on demand). Only one request is in flight at a time, which
 *   keeps writes ordered.
 * - A change leaves `pending` only once the server has acknowledged that
 *   exact value. Failed saves retry with backoff; reconnecting triggers a sync.
 * - On load, any locally-held unsynced changes are re-applied and synced.
 *
 * The database is the source of truth once a change is acknowledged.
 */

export interface Fields {
  priority: string | null;
  action_text: string | null;
  say_now_text: string | null;
  hold_text: string | null;
  /** Legacy combined answer from before Say now / Hold was split. Not edited by the form. */
  say_hold_text: string | null;
  recommendation_text: string | null;
}
export type FieldName = keyof Fields;
export type Values = Record<number, Fields>;
type Pending = Map<number, Partial<Fields>>;

export type SaveStatus =
  | "saved" // everything acknowledged by the server
  | "pending" // edits waiting for the debounce
  | "saving" // request in flight
  | "retrying" // last save failed (server/network error), retrying
  | "offline" // browser reports no connection; work is held locally
  | "syncing" // connection back, sending held work
  | "locked"; // session submitted; no more edits

const DEBOUNCE_MS = 1200;
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 15000;

const storageKey = (sessionId: string) => `inbasket:pending:${sessionId}`;

function readLocal(sessionId: string): Pending {
  try {
    const raw = window.localStorage.getItem(storageKey(sessionId));
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, Partial<Fields>>;
    return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
  } catch {
    return new Map();
  }
}

function writeLocal(sessionId: string, pending: Pending) {
  try {
    if (pending.size === 0) window.localStorage.removeItem(storageKey(sessionId));
    else window.localStorage.setItem(storageKey(sessionId), JSON.stringify(Object.fromEntries(pending)));
  } catch {
    // Storage unavailable (private mode / quota): server saves still work.
  }
}

export function clearLocalPending(sessionId: string) {
  try {
    window.localStorage.removeItem(storageKey(sessionId));
  } catch {}
}

export function useAutosave(opts: {
  sessionId: string;
  initial: Values;
  onLocked: () => void;
  onRecovered?: (itemCount: number) => void;
}) {
  const { sessionId, onLocked, onRecovered } = opts;
  const [values, setValues] = useState<Values>(opts.initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const pending = useRef<Pending>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const again = useRef(false);
  const retryDelay = useRef(RETRY_MIN_MS);
  const locked = useRef(false);
  const sawOffline = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const callbacks = useRef({ onLocked, onRecovered });
  callbacks.current = { onLocked, onRecovered };

  const persist = useCallback(() => writeLocal(sessionId, pending.current), [sessionId]);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const schedule = useCallback((delay: number) => {
    clearTimer();
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (locked.current) return false;
    clearTimer();
    if (inFlight.current) {
      again.current = true;
      await inFlight.current;
      return pending.current.size === 0 ? true : flushRef.current();
    }
    if (pending.current.size === 0) {
      setStatus("saved");
      return true;
    }

    const sent = [...pending.current].map(([itemId, fields]) => ({ itemId, fields: { ...fields } }));
    const body = JSON.stringify({ changes: sent });
    setStatus(sawOffline.current ? "syncing" : "saving");

    const attempt = (async () => {
      try {
        const res = await fetch(`/api/session/responses?sid=${encodeURIComponent(sessionId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: body.length < 60_000,
        });
        if (res.status === 409) {
          locked.current = true;
          setStatus("locked");
          callbacks.current.onLocked();
          return false;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Acknowledge only values that have not changed since they were sent.
        for (const { itemId, fields } of sent) {
          const cur = pending.current.get(itemId);
          if (!cur) continue;
          for (const [k, v] of Object.entries(fields) as [FieldName, string | null][]) {
            if (cur[k] === v) delete cur[k];
          }
          if (Object.keys(cur).length === 0) pending.current.delete(itemId);
        }
        persist();
        retryDelay.current = RETRY_MIN_MS;
        sawOffline.current = false;
        setLastSavedAt(new Date());
        if (pending.current.size > 0) {
          setStatus("pending");
          schedule(DEBOUNCE_MS);
          return false;
        }
        setStatus("saved");
        return true;
      } catch {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        if (offline) sawOffline.current = true;
        setStatus(offline ? "offline" : "retrying");
        schedule(retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS);
        return false;
      }
    })();

    inFlight.current = attempt;
    try {
      return await attempt;
    } finally {
      inFlight.current = null;
      if (again.current) {
        again.current = false;
        if (pending.current.size > 0 && !locked.current) schedule(0);
      }
    }
  }, [persist, schedule, sessionId]);
  flushRef.current = flush;

  const setField = useCallback(
    (itemId: number, field: FieldName, value: string | null, immediate = false) => {
      if (locked.current) return;
      setValues((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
      const cur = pending.current.get(itemId) ?? {};
      cur[field] = value;
      pending.current.set(itemId, cur);
      persist();
      channel.current?.postMessage({ itemId, field, value });
      setStatus((s) => (s === "offline" || s === "retrying" || s === "syncing" ? s : "pending"));
      if (immediate) void flush();
      else schedule(DEBOUNCE_MS);
    },
    [flush, persist, schedule],
  );

  const lock = useCallback(() => {
    locked.current = true;
    clearTimer();
    setStatus("locked");
  }, []);

  /** Best-effort delivery while the page is being closed. */
  const beacon = useCallback(() => {
    if (locked.current || pending.current.size === 0 || !navigator.sendBeacon) return;
    const changes = [...pending.current].map(([itemId, fields]) => ({ itemId, fields }));
    navigator.sendBeacon(
      `/api/session/responses?sid=${encodeURIComponent(sessionId)}`,
      new Blob([JSON.stringify({ changes })], { type: "application/json" }),
    );
  },[sessionId]);

  // Recover unsynced local work on load.
  useEffect(() => {
    const local = readLocal(sessionId);
    if (local.size > 0) {
      pending.current = local;
      setValues((prev) => {
        const next = { ...prev };
        for (const [itemId, fields] of local) next[itemId] = { ...next[itemId], ...fields };
        return next;
      });
      callbacks.current.onRecovered?.(local.size);
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Keep other open tabs of the same session in step.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`inbasket:${sessionId}`);
    ch.onmessage = (e: MessageEvent<{ itemId: number; field: FieldName; value: string | null }>) => {
      const { itemId, field, value } = e.data;
      setValues((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };
    channel.current = ch;
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [sessionId]);

  // Connectivity and page lifecycle.
  useEffect(() => {
    const onOffline = () => {
      sawOffline.current = true;
      if (!locked.current) setStatus("offline");
    };
    const onOnline = () => {
      if (locked.current) return;
      if (pending.current.size > 0) {
        setStatus("syncing");
        retryDelay.current = RETRY_MIN_MS;
        void flush();
      } else {
        sawOffline.current = false;
        setStatus("saved");
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => beacon();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!locked.current && pending.current.size > 0) {
        beacon();
        e.preventDefault();
      }
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    if (navigator.onLine === false) onOffline();
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimer();
    };
  }, [flush, beacon]);

  return {
    values,
    setField,
    flush,
    lock,
    status,
    lastSavedAt,
    hasPending: () => pending.current.size > 0,
  };
}
