import { BarChart3, FileText, Forward, GraduationCap, Mail, MessageCircle, Paperclip, StickyNote } from "lucide-react";
import type { Block, InBasketItem, ItemFormat } from "@/content/drishti";

export const FORMAT_STYLE: Record<ItemFormat, { icon: typeof Mail; tint: string }> = {
  email: { icon: Mail, tint: "bg-brand-50 text-brand-600" },
  dashboard: { icon: BarChart3, tint: "bg-emerald-50 text-emerald-600" },
  whatsapp: { icon: MessageCircle, tint: "bg-green-50 text-green-600" },
  "email-memo": { icon: Paperclip, tint: "bg-amber-50 text-amber-600" },
  survey: { icon: FileText, tint: "bg-violet-50 text-violet-600" },
  training: { icon: GraduationCap, tint: "bg-orange-50 text-orange-600" },
};

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
    case "bullets":
      return (
        <ul className="mb-4 space-y-1.5 pl-1">
          {block.items.map((t) => (
            <li key={t} className="flex gap-3 leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
              {t}
            </li>
          ))}
        </ul>
      );
    case "metrics":
      return (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            {block.title}
          </div>
          <dl className="divide-y divide-line">
            {block.rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[minmax(0,15rem)_1fr] gap-4 px-4 py-3 text-[15px]">
                <dt className="text-ink-soft">{r.label}</dt>
                <dd className="font-medium text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "survey":
      return (
        <div className="mb-5">
          <p>{block.intro}</p>
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5">Statement</th>
                  <th className="w-24 px-4 py-2.5 text-right">August</th>
                  <th className="w-10 px-0 py-2.5" />
                  <th className="w-24 px-4 py-2.5 text-right">October</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {block.rows.map((r) => (
                  <tr key={r.statement}>
                    <td className="px-4 py-3 text-ink">{r.statement}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{r.before}</td>
                    <td className="px-0 py-3 text-center text-ink-faint">→</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{r.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "chat":
      return (
        <div className="mb-2 space-y-2.5 rounded-xl bg-[#ece5dd] p-4">
          {block.messages.map((m, i) => (
            <div
              key={i}
              className="relative max-w-[88%] rounded-lg rounded-tl-sm bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-ink shadow-sm"
            >
              {m}
            </div>
          ))}
        </div>
      );
    case "attachment":
      return (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-2 border-b border-amber-200/70 px-4 py-3 text-sm font-medium text-amber-900">
            <Paperclip className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{block.heading}</span>
          </div>
          <div className="px-4 pb-1 pt-3">
            <Blocks blocks={block.blocks} />
          </div>
        </div>
      );
    case "forward":
      return (
        <div className="mt-5 rounded-xl border border-line bg-slate-50">
          <div className="flex items-start gap-2 border-b border-line px-4 py-3 text-sm font-medium text-ink-soft">
            <Forward className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{block.heading}</span>
          </div>
          <div className="border-l-4 border-slate-300 px-4 pb-1 pt-3 italic">
            <Blocks blocks={block.blocks} />
          </div>
        </div>
      );
    case "margin-note":
      return (
        <div className="mt-2 flex -rotate-[0.4deg] items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-[15px] text-yellow-900 shadow-sm">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
          {block.text}
        </div>
      );
  }
}

export function ItemView({ item }: { item: InBasketItem }) {
  const style = FORMAT_STYLE[item.format];
  const Icon = style.icon;
  const isChat = item.format === "whatsapp";
  return (
    <article className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="border-b border-line px-7 pb-5 pt-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-ink-faint">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${style.tint}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="uppercase tracking-wide">
            Item {item.id} · {item.formatLabel}
          </span>
        </div>
        <h1 className="text-[22px] font-semibold leading-snug tracking-tight text-ink">
          {isChat ? `Message from ${item.sender}` : item.subject}
        </h1>
        <dl className="mt-4 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
          {item.headers.map((h) => (
            <div key={h.label} className="contents">
              <dt className="text-ink-faint">{h.label}</dt>
              <dd className="text-ink-soft">{h.value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <div className="prose-item px-7 py-6 text-[15.5px] text-ink">
        <Blocks blocks={item.blocks} />
      </div>
    </article>
  );
}
