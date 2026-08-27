import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save } from "lucide-react";

export const linesToArray = (v: string) =>
  v
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

export const arrayToLines = (v: any) =>
  Array.isArray(v) ? v.map((s: any) => String(s ?? "")).join("\n") : String(v ?? "");

/** Converte lista de objetos em linhas "campo | campo | campo" para edição simples. */
export function objectsToLines(items: any[], fields: string[]): string {
  return (Array.isArray(items) ? items : [])
    .map((it) => fields.map((f) => String(it?.[f] ?? "").trim()).join(" | "))
    .join("\n");
}

export function linesToObjects(value: string, fields: string[]): any[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const obj: any = {};
      fields.forEach((f, i) => {
        obj[f] = parts[i] ?? "";
      });
      return obj;
    });
}

/**
 * Bloco editável genérico: mostra o conteúdo e, para a recrutadora,
 * libera edição e salvamento no banco.
 */
export function EditableBlock({
  title,
  editable,
  isEmpty,
  toDraft,
  fromDraft,
  onSave,
  rows = 5,
  hint,
  children,
  className,
}: {
  title: string;
  editable?: boolean;
  isEmpty?: boolean;
  toDraft: () => string;
  fromDraft: (v: string) => any;
  onSave: (value: any) => Promise<any> | any;
  rows?: number;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (!editable && isEmpty) return null;

  const start = () => {
    setDraft(toDraft());
    setEditing(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(fromDraft(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className ?? "rounded-xl border border-border bg-card p-5 shadow-sm"}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        {editable && !editing && (
          <Button size="sm" variant="outline" onClick={start} className="print:hidden">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
          <Textarea rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="text-sm text-muted-foreground">Sem informações nesta seção.</div>
      ) : (
        children
      )}
    </div>
  );
}
