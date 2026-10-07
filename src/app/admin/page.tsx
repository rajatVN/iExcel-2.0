import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { fmt, listCandidates } from "@/lib/admin";
import { AdminShell } from "@/components/AdminShell";
import { DownloadButtons } from "@/components/DownloadButtons";

export const dynamic = "force-dynamic";

const STATUS = {
  submitted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  not_started: "bg-slate-50 text-ink-faint ring-line",
} as const;
const STATUS_LABEL = { submitted: "Submitted", in_progress: "In progress", not_started: "Not started" } as const;

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const rows = await listCandidates();
  const submitted = rows.filter((r) => r.status === "submitted").length;

  return (
    <AdminShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Project Drishti In-Basket · {submitted} of {rows.length} submitted. No automated scoring — responses are
              for manual evaluation.
            </p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-line bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Time used</th>
                <th className="px-4 py-3">Responded</th>
                <th className="px-4 py-3">Item 9</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.candidateId} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.name}</div>
                    <div className="text-xs text-ink-faint">{r.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.reason && (
                      <div className="mt-1 text-xs text-ink-faint">{r.reason === "timeout" ? "Time expired" : "Manual"}</div>
                    )}
                    {r.remaining && <div className="mt-1 text-xs tabular-nums text-ink-faint">{r.remaining} left</div>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{fmt(r.startedAt)}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{fmt(r.submittedAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.timeUsed ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.sessionId ? (
                      <>
                        {r.responded}/9
                        {r.blank > 0 && <span className="ml-1.5 text-xs text-amber-700">({r.blank} blank)</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{r.sessionId ? (r.item9Attempted ? "Attempted" : "Not attempted") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.sessionId && (
                        <Link
                          href={`/admin/sessions/${r.sessionId}`}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50"
                        >
                          View responses
                        </Link>
                      )}
                      {r.sessionId && r.status === "submitted" && <DownloadButtons sessionId={r.sessionId} compact />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AdminShell>
  );
}
