import { Button } from "@/components/ui/button";

export type CandidateSection = "analysis" | "profile" | "behavior" | "test_results";

const BASE_ITEMS: { key: CandidateSection; label: string }[] = [
  { key: "analysis", label: "Análise para esta vaga" },
  { key: "profile", label: "Perfil completo" },
  { key: "behavior", label: "Perfil comportamental" },
];

const TEST_RESULTS_ITEM = {
  key: "test_results" as const,
  label: "Testes e avaliações",
};

/** Menu de botões que alterna o conteúdo detalhado do candidato na mesma tela.
 * O item "Testes e avaliações" só aparece quando `hasTestResults` é true. */
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
      className="flex min-h-12 items-end gap-6 overflow-x-auto border-y border-border bg-card px-5"
    >
      {items.map(({ key, label }) => {
        const active = value === key;
        return (
          <Button
            key={key}
            type="button"
            variant="ghost"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 px-1 text-sm font-medium shadow-none hover:bg-transparent ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Button>
        );
      })}
    </nav>
  );
}
