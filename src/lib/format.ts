export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
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
