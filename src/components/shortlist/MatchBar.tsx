export function MatchBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const color = v >= 85 ? "var(--success)" : v >= 70 ? "var(--primary)" : v >= 50 ? "var(--warning)" : "var(--destructive)";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{v}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v}%`, background: color }} />
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
