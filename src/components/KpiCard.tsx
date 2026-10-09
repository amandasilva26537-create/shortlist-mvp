import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  suffix,
  trend,
  to,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  trend?: string;
  /** Se informado, o card inteiro vira um link para esta rota. */
  to?: string;
}) {
  const card = (
    <div className={"card-soft p-5" + (to ? " transition hover:shadow-[var(--shadow-elevated)]" : "")}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {suffix && <div className="text-sm text-muted-foreground">{suffix}</div>}
      </div>
      {trend && <div className="mt-1 text-xs text-[color:var(--success)]">{trend}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {card}
    </Link>
  ) : (
    card
  );
}
