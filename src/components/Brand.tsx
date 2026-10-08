/**
 * Organisation logo (white/reversed, for navy backgrounds), shown on the login
 * panel and the candidate header. Replace the file in /public/brand or set to
 * null to hide it (the login page then shows a neutral placeholder).
 */
export const ORGANISATION_LOGO: { src: string; alt: string; width: number; height: number } | null = {
  src: "/brand/organisation-logo.png",
  alt: "Bajaj",
  width: 226,
  height: 278,
};

/** Organisation logo in white (navy backgrounds) or navy (light backgrounds). */
export function OrgLogo({ className = "h-10", tone = "white" }: { className?: string; tone?: "white" | "navy" }) {
  if (!ORGANISATION_LOGO) return null;
  const { src, alt, width, height } = ORGANISATION_LOGO;
  if (tone === "white") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} className={`${className} w-auto`} />;
  }
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={alt}
      className={`${className} inline-block shrink-0 bg-navy-900`}
      style={{ aspectRatio: `${width} / ${height}`, mask, WebkitMask: mask }}
    />
  );
}

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

export function Brand({
  dark = false,
  subtitle = "Project Drishti In-Basket",
  mark = "product",
}: {
  dark?: boolean;
  subtitle?: string;
  /** "organisation" shows the organisation logo in place of the product mark. */
  mark?: "product" | "organisation";
}) {
  return (
    <div className="flex items-center gap-3">
      {mark === "organisation" && ORGANISATION_LOGO ? (
        <OrgLogo className="h-10" tone={dark ? "white" : "navy"} />
      ) : (
        <BrandMark />
      )}
      <div className="leading-tight">
        <div className={`text-[15px] font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`}>iExcel 2.0</div>
        <div className={`text-xs ${dark ? "text-blue-200/80" : "text-ink-faint"}`}>{subtitle}</div>
      </div>
    </div>
  );
}
