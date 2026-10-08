"use client";

import { PRIORITIES, countWords, responseGuidance as g, type InBasketItem } from "@/content/drishti";
import type { FieldName, Fields } from "./useAutosave";

const PRIORITY_STYLE: Record<string, string> = {
  High: "peer-checked:border-red-300 peer-checked:bg-red-50 peer-checked:text-red-700",
  Medium: "peer-checked:border-amber-300 peer-checked:bg-amber-50 peer-checked:text-amber-800",
  Low: "peer-checked:border-emerald-300 peer-checked:bg-emerald-50 peer-checked:text-emerald-700",
};
const PRIORITY_DOT: Record<string, string> = { High: "bg-red-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };

const textareaCls =
  "block w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-[15px] leading-relaxed text-ink " +
  "placeholder:text-ink-faint/80 shadow-[inset_0_1px_1px_rgba(16,24,40,0.03)] outline-none transition " +
  "focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-ink-soft " +
  "[field-sizing:content]";

export function ResponsePanel({
  item,
  value,
  disabled,
  onChange,
}: {
  item: InBasketItem;
  value: Fields;
  disabled: boolean;
  onChange: (field: FieldName, value: string | null, immediate?: boolean) => void;
}) {
  const id = (f: string) => `item-${item.id}-${f}`;

  if (item.responseType === "recommendation") {
    const words = countWords(value.recommendation_text);
    const target = g.recommendation.targetWords;
    return (
      <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Your response</h2>
        <label htmlFor={id("rec")} className="mt-4 block text-sm font-semibold text-ink">
          {g.recommendation.label}
        </label>
        <p className="mb-2.5 mt-0.5 text-sm text-ink-soft">{g.recommendation.hint}</p>
        <textarea
          id={id("rec")}
          className={`${textareaCls} min-h-[22rem]`}
          value={value.recommendation_text ?? ""}
          onChange={(e) => onChange("recommendation_text", e.target.value)}
          disabled={disabled}
          placeholder="Write the outline of your one-page recommendation to Suresh…"
          spellCheck
        />
        <div className="mt-2 flex justify-end">
          <span
            className={`text-xs tabular-nums ${words > target * 1.4 ? "text-amber-700" : "text-ink-faint"}`}
            aria-live="polite"
          >
            Word count: {words} / ~{target}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Your response</h2>

      <fieldset className="mt-5" disabled={disabled}>
        <legend className="text-sm font-semibold text-ink">{g.priority}</legend>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5" role="radiogroup">
          {PRIORITIES.map((p) => (
            <label key={p} className="relative cursor-pointer">
              <input
                type="radio"
                name={id("priority")}
                value={p}
                checked={value.priority === p}
                onChange={() => onChange("priority", p, true)}
                className="peer sr-only"
              />
              <span
                className={`flex min-w-28 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-slate-300 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${PRIORITY_STYLE[p]}`}
              >
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`} />
                {p}
              </span>
            </label>
          ))}
          {value.priority && !disabled && (
            <button
              type="button"
              onClick={() => onChange("priority", null, true)}
              className="ml-1 text-xs font-medium text-ink-faint underline-offset-2 hover:text-ink hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor={id("action")} className="block text-sm font-semibold text-ink">
          {g.action.label}
        </label>
        <p className="mb-2.5 mt-0.5 text-sm text-ink-soft">{g.action.hint}</p>
        <textarea
          id={id("action")}
          className={`${textareaCls} min-h-[7.75rem]`}
          value={value.action_text ?? ""}
          onChange={(e) => onChange("action_text", e.target.value)}
          disabled={disabled}
          placeholder="What, who, by when…"
          spellCheck
        />
      </div>

      <fieldset className="mt-6" disabled={disabled}>
        <legend className="block text-sm font-semibold text-ink">{g.sayHold.label}</legend>
        <p className="mb-2.5 mt-0.5 text-sm text-ink-soft">{g.sayHold.hint}</p>
        {/* Side by side when the form is wide enough; stacked (Say now on top) when narrow.
            A container query, so the inbox column on small laptops also counts as narrow. */}
        <div className="@container">
          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2" data-testid="sayhold-row">
            <div>
              <label htmlFor={id("saynow")} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                {g.sayHold.sayNow.label}
              </label>
              <textarea
                id={id("saynow")}
                className={`${textareaCls} min-h-[5.5rem]`}
                value={value.say_now_text ?? ""}
                onChange={(e) => onChange("say_now_text", e.target.value)}
                disabled={disabled}
                placeholder={g.sayHold.sayNow.placeholder}
                spellCheck
              />
            </div>
            <div>
              <label htmlFor={id("hold")} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                {g.sayHold.hold.label}
              </label>
              <textarea
                id={id("hold")}
                className={`${textareaCls} min-h-[5.5rem]`}
                value={value.hold_text ?? ""}
                onChange={(e) => onChange("hold_text", e.target.value)}
                disabled={disabled}
                placeholder={g.sayHold.hold.placeholder}
                spellCheck
              />
            </div>
          </div>
        </div>
      </fieldset>
    </section>
  );
}

export type ItemState = "empty" | "partial" | "complete";

export function itemState(item: InBasketItem, v: Fields | undefined): ItemState {
  const has = (s: string | null | undefined) => !!s && s.trim().length > 0;
  if (!v) return "empty";
  if (item.responseType === "recommendation") return has(v.recommendation_text) ? "complete" : "empty";
  // A legacy combined answer (from before the split) counts for both halves.
  const legacy = has(v.say_hold_text);
  const filled = [has(v.priority), has(v.action_text), legacy || has(v.say_now_text), legacy || has(v.hold_text)].filter(
    Boolean,
  ).length;
  return filled === 0 ? "empty" : filled === 4 ? "complete" : "partial";
}
