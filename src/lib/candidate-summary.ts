/**
 * Monta o "Resumo do candidato": um texto geral sobre a pessoa e sua
 * trajetória, construído somente a partir de dados já cadastrados
 * (cidade, formação, cargo atual, trajetória etc.) — sem IA, sem inventar
 * nada, e sem qualquer análise de compatibilidade com a vaga.
 */

function firstName(fullName?: string | null) {
  return (fullName ?? "").trim().split(/\s+/)[0] || "";
}

function pronounFor(gender?: string | null) {
  const g = (gender ?? "").toLowerCase();
  if (/^fem/.test(g)) return "Ela";
  if (/^masc/.test(g)) return "Ele";
  return null; // usa o nome como sujeito quando o gênero não está informado
}

function parseYear(value?: string | null): number | null {
  if (!value) return null;
  const s = String(value).trim();
  if (/atual|presente|current|now/i.test(s)) return new Date().getFullYear();
  const m = s.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

export function buildCandidateSummary(candidate: any): string {
  if (!candidate) return "";
  const name = firstName(candidate.full_name);
  const subject = pronounFor(candidate.gender) ?? name ?? "A pessoa candidata";

  const sentences: string[] = [];

  // Localização
  const location = [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ");

  // Cargo atual / última função
  const roleLine = candidate.current_position
    ? `${subject} atua como ${candidate.current_position}${candidate.current_company ? ` na ${candidate.current_company}` : ""}`
    : null;

  if (roleLine && location) {
    sentences.push(`${roleLine}, com base em ${location}.`);
  } else if (roleLine) {
    sentences.push(`${roleLine}.`);
  } else if (location) {
    sentences.push(`${subject} está baseado(a) em ${location}.`);
  }

  // Trajetória: tempo de carreira, empresas, evolução
  const trajectory: any[] = Array.isArray(candidate.trajectory) ? candidate.trajectory : [];
  if (trajectory.length > 0) {
    const years = trajectory.map((t) => parseYear(t.start)).filter((y): y is number => y != null);
    const firstYear = years.length > 0 ? Math.min(...years) : null;
    const careerLength = firstYear ? new Date().getFullYear() - firstYear : null;

    const companies = Array.from(new Set(trajectory.map((t) => t.company).filter(Boolean))).slice(
      0,
      4,
    );

    if (careerLength && careerLength > 0) {
      sentences.push(
        `${subject === name ? name : subject} soma aproximadamente ${careerLength} ano${careerLength === 1 ? "" : "s"} de carreira${companies.length > 0 ? `, passando por empresas como ${companies.join(", ")}` : ""}.`,
      );
    } else if (companies.length > 0) {
      sentences.push(`Já atuou em empresas como ${companies.join(", ")}.`);
    }

    // Evolução: cargo mais antigo -> cargo mais recente, quando distintos
    const sorted = [...trajectory].sort(
      (a, b) => (parseYear(a.start) ?? 0) - (parseYear(b.start) ?? 0),
    );
    const earliestRole = sorted[0]?.role;
    const latestRole = sorted[sorted.length - 1]?.role;
    if (earliestRole && latestRole && earliestRole !== latestRole) {
      sentences.push(`Ao longo da trajetória, evoluiu de ${earliestRole} até ${latestRole}.`);
    }
  }

  // Área de atuação
  if (candidate.area) {
    sentences.push(`Área de atuação: ${candidate.area}.`);
  }

  // Formação acadêmica
  const education: any[] = Array.isArray(candidate.education) ? candidate.education : [];
  if (education.length > 0) {
    const items = education
      .map((e) => [e.course, e.institution].filter(Boolean).join(" pela "))
      .filter(Boolean)
      .slice(0, 2);
    if (items.length > 0) {
      sentences.push(`Formação: ${items.join("; ")}.`);
    }
  }

  return sentences.join(" ");
}
