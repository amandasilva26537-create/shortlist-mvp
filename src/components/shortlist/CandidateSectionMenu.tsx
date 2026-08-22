import { FileText, User, Brain } from "lucide-react";

export type CandidateSection = "analysis" | "profile" | "behavior";

const ITEMS: { key: CandidateSection; label: string; icon: any }[] = [
  { key: "analysis", label: "Análise para esta vaga", icon: FileText },
  { key: "profile", label: "Ver perfil completo", icon: User },
  { key: "behavior", label: "Ver perfil comportamental", icon: Brain },
];

/** Menu de três botões que alterna o conteúdo detalhado do candidato na mesma tela. */
export function CandidateSectionMenu({
  value,
  onChange,
}: {
  value: CandidateSection | null;
  onChange: (next: CandidateSection | null) => void;
}) {
  return (
    <nav
      aria-label="Seções do candidato"
      className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm sm:grid-cols-3"
    >
      {ITEMS.map(({ key, label, icon: Icon }) => {
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
