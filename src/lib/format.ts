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

/** Disponibilidade resumida: "Imediata", "5 dias", "30 dias"… */
export function availabilityLabel(raw: any): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (/imediat/.test(low)) return "Imediata";
  const m = low.match(/(\d+)\s*(dia|dias|d)\b/);
  if (m) return `${m[1]} dias`;
  const w = low.match(/(\d+)\s*(semana|semanas)/);
  if (w) return `${Number(w[1]) * 7} dias`;
  const mo = low.match(/(\d+)\s*(m[êe]s|meses)/);
  if (mo) return `${Number(mo[1]) * 30} dias`;
  const n = low.match(/^(\d+)$/);
  if (n) return `${n[1]} dias`;
  return s.length > 28 ? s.slice(0, 28) + "…" : s;
}

/**
 * Garante o padrão de headline em palavras-chave: até 4 blocos separados por " | ".
 * Se o texto vier como frase (padrão antigo), extrai as palavras-chave.
 */
export function keywordHeadline(raw?: string | null): string | null {
  if (!raw) return null;
  let t = String(raw).trim().replace(/\.$/, "");
  if (!t) return null;
  if (!t.includes("|")) {
    t = t.replace(/^[^,|]*?\b(?:com|em)\s+(?:sólida\s+)?(?:experiência|vivência|atuação)\s+(?:em|com)\s+/i, "");
    t = t.replace(/\b(?:profissional|especialista|estrategista|gestor|gestora|analista|coordenador|coordenadora)\s+(?:de|em)\s+/gi, "");
  }
  const parts = t
    .split(/\s*\|\s*|\s*,\s*|\s+e\s+/i)
    .map((p) => p.trim().replace(/^[-–]\s*/, ""))
    .filter(Boolean)
    .map((p) => p.split(/\s+/).slice(0, 2).join(" "));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length === 4) break;
  }
  return out.join(" | ") || null;
}
