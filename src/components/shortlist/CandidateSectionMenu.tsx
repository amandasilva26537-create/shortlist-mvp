import { FileText, User, Brain, ClipboardList } from "lucide-react";

export type CandidateSection = "analysis" | "profile" | "behavior" | "test_results";

const BASE_ITEMS: { key: CandidateSection; label: string; icon: any }[] = [
  { key: "analysis", label: "Análise para esta vaga", icon: FileText },
  { key: "profile", label: "Ver perfil completo", icon: User },
  { key: "behavior", label: "Ver perfil comportamental", icon: Brain },
];

const TEST_RESULTS_ITEM = {
  key: "test_results" as const,
  label: "Resultados de testes",
  icon: ClipboardList,
};

/** Menu de botões que alterna o conteúdo detalhado do candidato na mesma tela.
 * O item "Resultados de testes" só aparece quando `hasTestResults` é true. */
export function CandidateSectionMenu({
  value,
  onChange,
  hasTestResults,
}: {
  value: CandidateSection | null;
  onChange: (next: CandidateSection | null) => void;
  hasTestResults?: boolean;
}) {
  const items = hasTestResults ? [...BASE_ITEMS, TEST_RESULTS_ITEM] : BASE_ITEMS;
  return (
    <nav
      aria-label="Seções do candidato"
      className={`grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm ${items.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : key)}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-secondary text-secondary-foreground hover:border-primary"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
