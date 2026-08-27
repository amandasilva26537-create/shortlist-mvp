import { ClipboardList } from "lucide-react";
import { TestResultsSection, type TestResultItem } from "@/components/candidate/TestResultsSection";

/**
 * Card fixo na lateral da shortlist do cliente, mostrado só quando o
 * candidato tem ao menos um resultado de teste vinculado a esta vaga.
 */
export function TestResultsSidebarCard({ items }: { items: TestResultItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ClipboardList className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Testes e Avaliações</div>
      </div>
      <div className="p-4">
        <TestResultsSection items={items} />
      </div>
    </div>
  );
}
