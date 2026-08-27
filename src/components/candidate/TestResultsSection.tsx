import {
  FileText,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileType,
  ExternalLink,
  Sheet,
  Paperclip,
} from "lucide-react";

export type TestResultFormat =
  | "pdf"
  | "image"
  | "video"
  | "link"
  | "text"
  | "docx"
  | "spreadsheet"
  | "other";

export interface TestResultItem {
  id: string;
  title: string;
  format: string;
  url?: string | null;
  content?: string | null;
}

const FORMAT_META: Record<string, { label: string; icon: any }> = {
  pdf: { label: "PDF", icon: FileText },
  docx: { label: "Word", icon: FileType },
  spreadsheet: { label: "Planilha", icon: Sheet },
  other: { label: "Arquivo", icon: Paperclip },
  image: { label: "Imagem", icon: ImageIcon },
  video: { label: "Vídeo", icon: Video },
  link: { label: "Link", icon: LinkIcon },
  text: { label: "Texto", icon: FileText },
};

function embeddableVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lista de resultados de testes cadastrados para o candidato (DISC, teste
 * técnico, redação, vídeo de apresentação etc). Só deve ser renderizada
 * quando `items` tiver ao menos um item — quem chama decide isso.
 */
export function TestResultsSection({
  items,
  singleColumn,
}: {
  items: TestResultItem[];
  singleColumn?: boolean;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={singleColumn ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}
    >
      {items.map((item) => {
        const meta = FORMAT_META[item.format] ?? FORMAT_META.link;
        const Icon = meta.icon;

        if (item.format === "text") {
          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 sm:col-span-2"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-primary" /> {item.title}
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{item.content}</p>
            </div>
          );
        }

        if (item.format === "image" && item.url) {
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary"
            >
              <img src={item.url} alt={item.title} className="h-40 w-full object-cover" />
              <div className="flex items-center gap-2 p-3 text-sm font-medium">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{item.title}</span>
              </div>
            </a>
          );
        }

        if (item.format === "video" && item.url) {
          const embed = embeddableVideoUrl(item.url);
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-card sm:col-span-2"
            >
              {embed ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={embed}
                    title={item.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 p-3 text-sm font-medium hover:bg-primary-soft/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{item.title}</span>
                </span>
                {!embed && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </a>
            </div>
          );
        }

        // pdf, docx, link (e video sem preview)
        return (
          <a
            key={item.id}
            href={item.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 text-sm font-medium transition hover:border-primary hover:bg-primary-soft/30"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{item.title}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {meta.label}
                </span>
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
