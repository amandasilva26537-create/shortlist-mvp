import { Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Abre a página de PDF do candidato (nova aba) já com a janela de impressão/“Salvar como PDF”. */
export function DownloadPdfMenu({ basePath, size = "sm" }: { basePath: string; size?: "sm" | "default" }) {
  const open = (sections: string) => {
    window.open(`${basePath}?sections=${sections}&autoprint=1`, "_blank");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size}>
          <Download className="mr-1.5 h-4 w-4" /> Baixar PDF <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>O que baixar?</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => open("analysis,profile,disc")}>Tudo em um PDF</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open("analysis")}>Somente Análise</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("profile")}>Somente Perfil completo</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("disc")}>Somente Perfil comportamental</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
