import { FileDown, FileText } from "lucide-react";

export function DownloadButtons({ sessionId, compact = false }: { sessionId: string; compact?: boolean }) {
  const base = compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50"
    : "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition";
  return (
    <div className={compact ? "flex gap-1.5" : "flex flex-wrap gap-3"}>
      <a
        href={`/api/reports/${sessionId}/docx`}
        className={compact ? base : `${base} bg-navy-900 text-white hover:bg-navy-800`}
        download
      >
        <FileText className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> {compact ? "DOCX" : "Download DOCX"}
      </a>
      <a
        href={`/api/reports/${sessionId}/pdf`}
        className={compact ? base : `${base} border border-line bg-white text-ink hover:bg-slate-50`}
        download
      >
        <FileDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> {compact ? "PDF" : "Download PDF"}
      </a>
    </div>
  );
}
