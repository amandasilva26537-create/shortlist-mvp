/** Marca visual da Portus usada no portal do cliente (apresentação apenas). */
export function PortusLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Portus"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="portus-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D6A3" />
          <stop offset="100%" stopColor="#007A5E" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="14" fill="url(#portus-g)" />
      <path
        d="M15 34V15h9.5a6.5 6.5 0 0 1 0 13H20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="33" cy="33" r="2.6" fill="#DDF8ED" />
    </svg>
  );
}

export function PortusWordmark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PortusLogo />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-semibold tracking-tight text-foreground">
          ShortList <span className="text-primary">Portus</span>
        </div>
        <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Seleção executiva
        </div>
      </div>
    </div>
  );
}
