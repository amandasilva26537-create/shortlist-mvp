export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumber(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(/[^\d.,-]/g, "").replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Pretensão salarial do candidato: faixa (mín–máx) quando informada, ou valor único. */
export function salaryLabel(candidate: any): string | null {
  const min = toNumber(candidate?.salary_min);
  const max = toNumber(candidate?.salary_max);
  const single = toNumber(candidate?.salary_expectation);
  if (min != null && max != null) return `${formatBRL(min)} – ${formatBRL(max)}`;
  if (min != null) return `A partir de ${formatBRL(min)}`;
  if (max != null) return `Até ${formatBRL(max)}`;
  if (single != null) return formatBRL(single);
  return null;
}


export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function matchColor(match: number) {
  if (match >= 85) return "text-[color:var(--success)]";
  if (match >= 70) return "text-primary";
  if (match >= 50) return "text-[color:var(--warning)]";
  return "text-destructive";
}
