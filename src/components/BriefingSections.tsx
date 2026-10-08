import {
  calendar,
  immediateSituation,
  instructions,
  onlineFormatNotes,
  organisationContext,
  organisationStructure,
  yourRole,
} from "@/content/drishti";

export const BRIEFING_SECTIONS = [
  { id: "context", letter: "B", title: "Organisation Context" },
  { id: "structure", letter: "C", title: "Organisational Structure" },
  { id: "role", letter: "D", title: "Your Role" },
  { id: "situation", letter: "E", title: "The Immediate Situation" },
  { id: "calendar", letter: "F", title: "Your Calendar This Week" },
  { id: "instructions", letter: "G", title: "Instructions" },
] as const;
export type BriefingSectionId = (typeof BRIEFING_SECTIONS)[number]["id"];

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-sm font-semibold text-ink">{children}</h3>;
}

export function OrganisationContext() {
  const c = organisationContext;
  return (
    <div className="prose-item text-[15px] text-ink-soft">
      <p>{c.intro}</p>
      <figure className="mb-2 overflow-hidden rounded-lg border border-line bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.image} alt="" className="h-auto w-full" />
        {/* The infographic's text, for screen readers. */}
        <figcaption className="sr-only">
          <p>{c.pressuresLead}</p>
          <ul>
            {c.pressures.map((p) => (
              <li key={p.label}>
                {p.label} {p.text}
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
      <H3>{c.drishtiHeading}</H3>
      <p>{c.drishti}</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5">Term used in the items</th>
              <th className="px-4 py-2.5">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {c.glossary.map((g) => (
              <tr key={g.term}>
                <td className="w-44 px-4 py-2.5 align-top font-medium text-ink">{g.term}</td>
                <td className="px-4 py-2.5 text-ink-soft">{g.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrganisationStructure() {
  const s = organisationStructure;
  return (
    <div className="text-[15px] text-ink-soft">
      <p className="mb-4">{s.intro}</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Reports to</th>
              <th className="px-3 py-2.5">Relationship to Ananya</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {s.people.map((p) => (
              <tr key={p.name} className={p.name === "Ananya Kulkarni" ? "bg-brand-50/60" : undefined}>
                <td className="px-3 py-2.5 align-top font-medium text-ink">{p.name}</td>
                <td className="px-3 py-2.5 align-top">{p.role}</td>
                <td className="px-3 py-2.5 align-top">{p.reportsTo}</td>
                <td className="px-3 py-2.5 align-top">{p.relationship}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figure className="mt-6 overflow-hidden rounded-lg border border-line bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.chartImage}
          alt="Organisation structure chart showing the people who appear in the items and their reporting lines"
          className="h-auto w-full"
        />
      </figure>
    </div>
  );
}

export function YourRole() {
  return (
    <div className="prose-item text-[15px] text-ink-soft">
      {yourRole.paragraphs.map((p) => (
        <p key={p.slice(0, 20)}>{p}</p>
      ))}
    </div>
  );
}

export function ImmediateSituation() {
  return (
    <div className="prose-item text-[15px] text-ink-soft">
      {immediateSituation.map((p) => (
        <p key={p.slice(0, 20)}>{p}</p>
      ))}
    </div>
  );
}

export function Calendar() {
  return (
    <div className="text-[15px] text-ink-soft">
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5">Day</th>
              <th className="px-4 py-2.5">Time</th>
              <th className="px-4 py-2.5">Commitment</th>
            </tr>
          </thead>
          <tbody>
            {calendar.days.map((d) =>
              d.entries.map((e, i) => (
                <tr key={d.day + e.time} className={i === 0 ? "border-t border-line" : undefined}>
                  <td className="w-40 px-4 py-2 align-top font-medium text-ink">{i === 0 ? d.day : ""}</td>
                  <td className="w-28 px-4 py-2 align-top tabular-nums text-ink">{e.time}</td>
                  <td className="px-4 py-2 align-top">{e.text}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4">{calendar.footnote}</p>
    </div>
  );
}

export function Instructions() {
  return (
    <div className="text-[15px] text-ink-soft">
      <ol className="space-y-3">
        {instructions.map((ins, i) => (
          <li key={i} className="flex gap-3 leading-relaxed">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {i + 1}
            </span>
            <div>
              <span className={i < 3 ? "text-ink" : undefined}>{ins.text}</span>
              {ins.sub && (
                <ul className="mt-2 space-y-1.5">
                  {ins.sub.map((s) => (
                    <li key={s.label} className="flex gap-2">
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                      <span>
                        <strong className="font-semibold text-ink">{s.label}</strong> {s.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-lg border border-brand-100 bg-brand-50/70 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          About this online version
        </div>
        <ul className="space-y-1.5 text-sm text-ink">
          {onlineFormatNotes.map((n) => (
            <li key={n} className="flex gap-2 leading-snug">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BriefingSection({ id }: { id: BriefingSectionId }) {
  switch (id) {
    case "context":
      return <OrganisationContext />;
    case "structure":
      return <OrganisationStructure />;
    case "role":
      return <YourRole />;
    case "situation":
      return <ImmediateSituation />;
    case "calendar":
      return <Calendar />;
    case "instructions":
      return <Instructions />;
  }
}
