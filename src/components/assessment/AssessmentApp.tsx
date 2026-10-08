"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListChecks,
  Loader2,
  Network,
  Send,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { items, ITEM_COUNT } from "@/content/drishti";
import type { ResponseDto, SessionDto } from "@/lib/sessions";
import { Brand, ORGANISATION_LOGO, OrgLogo } from "@/components/Brand";
import { BRIEFING_SECTIONS, BriefingSection, type BriefingSectionId } from "@/components/BriefingSections";
import { FORMAT_STYLE, ItemView } from "@/components/ItemView";
import { Modal } from "@/components/Modal";
import { ResponsePanel, itemState, type ItemState } from "./ResponsePanel";
import { SaveIndicator } from "./SaveIndicator";
import { Timer, formatClock } from "./Timer";
import { clearLocalPending, useAutosave, type FieldName, type Values } from "./useAutosave";

const SECTION_ICON: Record<BriefingSectionId, typeof Inbox> = {
  context: Building2,
  structure: Network,
  role: UserRound,
  situation: Zap,
  calendar: CalendarDays,
  instructions: ListChecks,
};

type Phase = "active" | "submitting" | "expired";

/** Session API URL tagged with the attempt this page was opened for (see candidateContext). */
const api = (path: string, sessionId: string) => `/api/session/${path}?sid=${encodeURIComponent(sessionId)}`;

function sendEvent(sessionId: string, type: string, extra: { itemId?: number; detail?: string } = {}) {
  void fetch(api("events", sessionId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...extra }),
    keepalive: true,
  }).catch(() => {});
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AssessmentApp({
  session: initialSession,
  responses,
  candidate,
}: {
  session: SessionDto;
  responses: ResponseDto[];
  candidate: { name: string; code: string };
}) {
  const router = useRouter();
  const sessionId = initialSession.id;

  /* ---------------- Authoritative clock ---------------- */
  // remaining = expires_at − (browser time + offset to server time)
  const expiresAt = useRef(Date.parse(initialSession.expiresAt));
  const offset = useRef(Date.parse(initialSession.serverNow) - Date.now());
  const serverNow = () => Date.now() + offset.current;
  const [remainingMs, setRemainingMs] = useState(() => expiresAt.current - serverNow());

  const goComplete = useCallback(() => {
    clearLocalPending(sessionId);
    router.replace("/complete");
  }, [router, sessionId]);

  const syncClock = useCallback(async () => {
    try {
      const t0 = Date.now();
      const res = await fetch(api("clock", sessionId), { cache: "no-store" });
      const t1 = Date.now();
      // 409/404: this attempt was reset or replaced by the admin.
      if (res.status === 409 || res.status === 404) return goComplete();
      if (!res.ok) return;
      const { session } = (await res.json()) as { session: SessionDto };
      offset.current = Date.parse(session.serverNow) - (t0 + t1) / 2;
      expiresAt.current = Date.parse(session.expiresAt);
      if (session.status === "submitted") goComplete();
    } catch {
      // Offline: keep ticking on the last known offset.
    }
  }, [goComplete, sessionId]);

  /* ---------------- Responses & autosave ---------------- */
  const initialValues = useMemo<Values>(() => {
    const v: Values = {};
    for (const it of items) {
      const r = responses.find((x) => x.itemId === it.id);
      v[it.id] = {
        priority: r?.priority ?? null,
        action_text: r?.action_text ?? null,
        say_now_text: r?.say_now_text ?? null,
        hold_text: r?.hold_text ?? null,
        say_hold_text: r?.say_hold_text ?? null,
        recommendation_text: r?.recommendation_text ?? null,
      };
    }
    return v;
  }, [responses]);

  const autosave = useAutosave({
    sessionId,
    initial: initialValues,
    onLocked: goComplete,
    onRecovered: () => sendEvent(sessionId, "local_recovery_applied"),
  });
  const { values, setField, flush, status } = autosave;

  /* ---------------- UI state ---------------- */
  const itemKey = `inbasket:item:${sessionId}`;
  const [selected, setSelected] = useState(1);
  const [drawer, setDrawer] = useState<BriefingSectionId | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("active");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const expired = remainingMs <= 0;
  const editable = phase === "active" && !expired;

  // Restore last-opened item after a refresh (before any visit is recorded).
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem(itemKey));
      if (saved >= 1 && saved <= ITEM_COUNT) setSelected(saved);
    } catch {}
    setRestored(true);
  }, [itemKey]);

  // Item open telemetry + save on item change.
  const lastVisit = useRef<{ item: number; at: number } | null>(null);
  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(itemKey, String(selected));
    } catch {}
    mainRef.current?.scrollTo({ top: 0 });
    void flush();
    // Ignore an immediate repeat of the same item (React dev double-invokes effects).
    const prev = lastVisit.current;
    if (prev && prev.item === selected && Date.now() - prev.at < 1500) return;
    lastVisit.current = { item: selected, at: Date.now() };
    void fetch(api("visit", sessionId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: selected }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, restored]);

  // Session-level telemetry and resync triggers.
  const openedSent = useRef(false);
  useEffect(() => {
    if (!openedSent.current) {
      openedSent.current = true;
      sendEvent(sessionId, "assessment_opened");
    }
    void syncClock();
    const iv = setInterval(() => void syncClock(), 30_000);
    const onVis = () => {
      sendEvent(sessionId, document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible");
      if (document.visibilityState === "visible") void syncClock();
    };
    const onOnline = () => {
      sendEvent(sessionId, "connection_restored");
      void syncClock();
    };
    const onOffline = () => sendEvent(sessionId, "connection_lost"); // queued by the browser if possible
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncClock]);

  /* ---------------- Live countdown (display layer) ---------------- */
  const flushedNearEnd = useRef<Set<number>>(new Set());
  useEffect(() => {
    const tick = () => {
      const r = expiresAt.current - (Date.now() + offset.current);
      setRemainingMs(r);
      // Save eagerly as the end approaches.
      for (const mark of [60_000, 15_000, 5_000]) {
        if (r <= mark && !flushedNearEnd.current.has(mark)) {
          flushedNearEnd.current.add(mark);
          if (autosave.hasPending()) void flush();
        }
      }
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle time notices.
  const shownNotices = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const [mark, text] of [
      [10 * 60_000, "10 minutes remaining."],
      [5 * 60_000, "5 minutes remaining."],
      [60_000, "1 minute remaining. Your responses will be submitted automatically when time runs out."],
    ] as const) {
      if (remainingMs <= mark && remainingMs > mark - 3000 && !shownNotices.current.has(mark)) {
        shownNotices.current.add(mark);
        setNotice(text);
        setTimeout(() => setNotice(null), 6000);
      }
    }
  }, [remainingMs]);

  /* ---------------- Timeout: automatic submission ---------------- */
  const timeoutStarted = useRef(false);
  useEffect(() => {
    if (!expired || timeoutStarted.current) return;
    timeoutStarted.current = true;
    setPhase("expired");
    setConfirmOpen(false);
    setDrawer(null);
    (async () => {
      // Push any last locally-held edits. The server accepts them for a short
      // grace window after expiry (flagged as such), so keep trying briefly.
      const flushDeadline = Date.now() + 45_000;
      while (autosave.hasPending() && Date.now() < flushDeadline) {
        if (await flush()) break;
        await sleep(2000);
      }
      autosave.lock();
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await fetch(api("submit", sessionId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "timeout" }),
          });
          if (res.ok || res.status === 409) return goComplete();
          if (res.status === 425) {
            // Our clock ran slightly ahead of the server's. Wait until the server agrees.
            const data = await res.json();
            const wait = Date.parse(data.expiresAt) - Date.parse(data.serverNow);
            await sleep(Math.max(250, wait + 250));
            continue;
          }
          if (res.status === 401 || res.status === 404) return router.replace("/dashboard");
        } catch {
          // Network down: keep trying. The server will also finalise on its own.
        }
        await sleep(Math.min(2000 + attempt * 1000, 8000));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  /* ---------------- Manual submission ---------------- */
  const submitManually = async () => {
    setSubmitError(null);
    setPhase("submitting");
    const saved = await flush();
    if (!saved && autosave.hasPending()) {
      setPhase("active");
      setSubmitError(
        "We could not reach the server to save your latest changes. They are kept on this device. Check your connection and try again.",
      );
      return;
    }
    try {
      const res = await fetch(api("submit", sessionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "manual" }),
      });
      if (res.ok || res.status === 409) {
        autosave.lock();
        return goComplete();
      }
      throw new Error(String(res.status));
    } catch {
      setPhase("active");
      setSubmitError("Submission did not reach the server. Your responses are saved. Please try again.");
    }
  };

  /* ---------------- Derived ---------------- */
  const states = useMemo(() => {
    const m: Record<number, ItemState> = {};
    for (const it of items) m[it.id] = itemState(it, values[it.id]);
    return m;
  }, [values]);
  const respondedCount = Object.values(states).filter((s) => s !== "empty").length;
  const blankCount = ITEM_COUNT - respondedCount;
  const item = items.find((i) => i.id === selected)!;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const openDrawer = (id: BriefingSectionId) => {
    void flush();
    setDrawer(id);
    sendEvent(sessionId, "panel_opened", { detail: id });
  };

  const onFieldChange = (field: FieldName, value: string | null, immediate?: boolean) => {
    if (!editable) return;
    setField(item.id, field, value, immediate);
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header (fixed) */}
      <header className="z-20 flex h-[68px] shrink-0 items-stretch border-b border-line bg-white">
        <div className="hidden w-60 shrink-0 items-center bg-navy-900 px-5 lg:flex">
          <Brand dark mark="organisation" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-5 px-5">
          <div className="shrink-0 lg:hidden">
            <div className="sm:hidden">
              {ORGANISATION_LOGO ? <OrgLogo className="h-10" tone="navy" /> : <Brand />}
            </div>
            <div className="hidden sm:block">
              <Brand mark="organisation" />
            </div>
          </div>
          <div className="hidden min-w-0 md:block">
            <div className="text-xs text-ink-soft">
              <span className="font-semibold text-ink">{respondedCount}</span> of {ITEM_COUNT} items responded
            </div>
            <div className="mt-1.5 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${(respondedCount / ITEM_COUNT) * 100}%` }}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator status={status} />
            <div className="mx-1 hidden h-8 w-px bg-line sm:block" />
            <Timer remainingMs={remainingMs} />
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!editable}
              className="hidden items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 disabled:opacity-50 xl:flex"
            >
              <Send className="h-4 w-4" />
              Submit assessment
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div className="animate-fade-in pointer-events-none fixed left-1/2 top-[80px] z-30 -translate-x-1/2 rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {notice}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav className="pane-scroll-dark hidden w-60 shrink-0 flex-col overflow-y-auto bg-navy-900 px-3 py-4 text-blue-100/80 lg:flex">
          <button
            onClick={() => setDrawer(null)}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
          >
            <Inbox className="h-[18px] w-[18px]" />
            Inbox
            <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums">
              {ITEM_COUNT}
            </span>
          </button>
          <div className="mb-1.5 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-200/50">
            Briefing pack
          </div>
          {BRIEFING_SECTIONS.map((s) => {
            const Icon = SECTION_ICON[s.id];
            return (
              <button
                key={s.id}
                onClick={() => openDrawer(s.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5 hover:text-white ${
                  drawer === s.id ? "bg-white/10 text-white" : ""
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {s.title}
              </button>
            );
          })}
          <div className="mt-auto space-y-3 pt-6">
            <div className="rounded-lg bg-white/5 px-3 py-2.5 text-xs">
              <div className="text-blue-200/60">Candidate</div>
              <div className="mt-0.5 font-medium text-white">{candidate.name}</div>
              <div className="text-blue-200/60">{candidate.code}</div>
              {initialSession.attemptNumber > 1 && (
                <div className="mt-1.5 font-semibold text-blue-100">Retest – Attempt {initialSession.attemptNumber}</div>
              )}
            </div>
          </div>
        </nav>

        {/* Inbox list */}
        <aside className="pane-scroll hidden w-[340px] shrink-0 overflow-y-auto border-r border-line bg-white md:block xl:w-[370px]">
          <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
            <h2 className="text-lg font-semibold tracking-tight">Inbox</h2>
            <span className="text-xs text-ink-faint">Monday 19 October · 7:30 AM</span>
          </div>
          <ul>
            {items.map((it) => {
              const st = FORMAT_STYLE[it.format];
              const Icon = st.icon;
              const active = it.id === selected;
              const state = states[it.id];
              const prio = values[it.id]?.priority;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => setSelected(it.id)}
                    aria-current={active ? "true" : undefined}
                    aria-label={`Item ${it.id}: ${it.sender} – ${it.format === "whatsapp" ? it.formatLabel : it.subject}`}
                    className={`group relative flex w-full gap-3 border-b border-line px-5 py-4 text-left transition ${
                      active ? "bg-brand-50/80" : "hover:bg-canvas"
                    }`}
                  >
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-brand-500" />}
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${st.tint}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                          Item {it.id}
                        </span>
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-faint">{it.sentShort}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-ink">{it.sender}</span>
                      <span className="block truncate text-[13px] font-medium text-ink-soft group-hover:text-ink">
                        {it.format === "whatsapp" ? it.formatLabel : it.subject}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-faint group-hover:text-ink-soft">
                        {it.preview}
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <StatusChip state={state} />
                        {prio && <PriorityChip p={prio} />}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Current item + response */}
        <main ref={mainRef} className="pane-scroll min-w-0 flex-1 overflow-y-auto">
          {/* Compact item switcher for narrow screens */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-white px-4 py-2 md:hidden">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelected(it.id)}
                className={`h-9 w-9 shrink-0 rounded-lg text-sm font-semibold ${
                  it.id === selected ? "bg-navy-900 text-white" : "bg-slate-100 text-ink-soft"
                }`}
              >
                {it.id}
              </button>
            ))}
          </div>
          <div className="mx-auto max-w-[860px] space-y-5 px-4 py-6 sm:px-8">
            <ItemView item={item} />
            <ResponsePanel item={item} value={values[item.id]} disabled={!editable} onChange={onFieldChange} />
            <div className="flex items-center justify-between pb-10">
              <button
                onClick={() => setSelected(Math.max(1, selected - 1))}
                disabled={selected === 1}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink disabled:invisible"
              >
                <ChevronLeft className="h-4 w-4" /> Item {selected - 1}
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!editable}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-navy-900 underline-offset-4 hover:underline disabled:opacity-50 xl:hidden"
              >
                <Send className="h-4 w-4" /> Submit
              </button>
              <button
                onClick={() => setSelected(Math.min(ITEM_COUNT, selected + 1))}
                disabled={selected === ITEM_COUNT}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink disabled:invisible"
              >
                Item {selected + 1} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Briefing drawer — the response stays mounted underneath. */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Briefing pack">
          <div className="animate-fade-in absolute inset-0 bg-navy-950/30" onClick={() => setDrawer(null)} />
          <div className="animate-drawer-in relative flex h-full w-full max-w-[720px] flex-col bg-white shadow-2xl">
            <div className="flex items-center border-b border-line pl-4 pr-2 pt-3">
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {BRIEFING_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openDrawer(s.id)}
                  className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition ${
                    drawer === s.id
                      ? "border-brand-500 text-ink"
                      : "border-transparent text-ink-faint hover:text-ink"
                  }`}
                >
                  {s.title}
                </button>
              ))}
              </div>
              <button
                onClick={() => setDrawer(null)}
                className="mb-2 ml-2 shrink-0 rounded-lg p-2 text-ink-faint hover:bg-slate-100 hover:text-ink"
                aria-label="Close briefing"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="pane-scroll flex-1 overflow-y-auto px-8 py-6">
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">
                {BRIEFING_SECTIONS.find((s) => s.id === drawer)!.title}
              </h2>
              <BriefingSection id={drawer} />
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      <Modal open={confirmOpen && phase !== "expired"} onClose={() => setConfirmOpen(false)} labelledBy="submit-title" dismissable={phase === "active"}>
        <h2 id="submit-title" className="text-lg font-semibold tracking-tight">
          Submit your assessment?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Are you sure you want to submit? You will not be able to edit your responses after submission.
        </p>
        <div className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Items responded</span>
            <span className="font-semibold tabular-nums">
              {respondedCount} of {ITEM_COUNT}
            </span>
          </div>
          {blankCount > 0 && (
            <div className="mt-1 text-amber-800">
              No response yet: Item{" "}
              {items
                .filter((i) => states[i.id] === "empty")
                .map((i) => i.id)
                .join(", ")}
            </div>
          )}
          <div className="mt-1 flex justify-between">
            <span className="text-ink-soft">Time left</span>
            <span className="font-semibold tabular-nums">{formatClock(remainingMs)}</span>
          </div>
        </div>
        {submitError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={phase === "submitting"}
            data-autofocus
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Keep working
          </button>
          <button
            onClick={submitManually}
            disabled={phase === "submitting"}
            className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-70"
          >
            {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Submit assessment
          </button>
        </div>
      </Modal>

      {/* Time up */}
      {phase === "expired" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-[2px]">
          <div className="animate-fade-in w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl" role="alertdialog" aria-labelledby="timeup-title">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 id="timeup-title" className="mt-4 text-lg font-semibold tracking-tight">
              Time is up
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Your responses are being saved and submitted automatically.
              {status === "offline" && " Waiting for your connection to return…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ state }: { state: ItemState }) {
  if (state === "complete")
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" /> Responded
      </span>
    );
  if (state === "partial")
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> In progress
      </span>
    );
  return <span className="text-[11px] text-ink-faint">Not started</span>;
}

function PriorityChip({ p }: { p: string }) {
  const cls =
    p === "High"
      ? "bg-red-50 text-red-700 ring-red-200"
      : p === "Medium"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cls}`}>{p}</span>;
}
