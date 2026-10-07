/** Product mark + wordmark. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2 4 8.5v15L16 30V2Z" fill="#7da2ec" />
      <path d="M16 2l12 6.5v15L16 30V2Z" fill="#3b74e8" />
      <path d="M16 9.5 10 12.8v6.4l6 3.3V9.5Z" fill="#fff" fillOpacity=".9" />
      <path d="M16 9.5l6 3.3v6.4l-6 3.3V9.5Z" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}

export function Brand({ dark = false, subtitle = "Project Drishti In-Basket" }: { dark?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div className="leading-tight">
        <div className={`text-[15px] font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`}>iExcel 2.0</div>
        <div className={`text-xs ${dark ? "text-blue-200/80" : "text-ink-faint"}`}>{subtitle}</div>
      </div>
    </div>
  );
}
