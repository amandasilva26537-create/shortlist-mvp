export function MatchRing({
  value,
  size = 56,
  strokeWidth = 5,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * radius;
  const offset = c - (value / 100) * c;
  const color =
    value >= 85
      ? "var(--success)"
      : value >= 70
        ? "var(--primary)"
        : value >= 50
          ? "var(--warning)"
          : "var(--destructive)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold" style={{ color }}>
          {value}
        </span>
        {label && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
