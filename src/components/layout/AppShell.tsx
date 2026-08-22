import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ListChecks,
  GitCompare,
  Sparkles,
  Search,
  Bell,
  LogOut,
  Plus,
  UserPlus,
  FilePlus,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/db/team.functions";
import { toast } from "sonner";

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/candidates", label: "Candidatos", icon: UserPlus },
  { to: "/jobs", label: "Vagas", icon: Briefcase },
  { to: "/shortlists", label: "Shortlists", icon: ListChecks },
  { to: "/compare", label: "Comparar", icon: GitCompare },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  // Acesso aberto: o sistema não exige login. Se houver uma sessão ativa,
  // usamos os dados dela apenas para exibir nome e iniciais.
  const accessFn = useServerFn(getMyAccess);
  const access = useQuery({
    queryKey: ["my-access"],
    queryFn: () => accessFn(),
  });

  const showTeam = access.data?.isAdmin ?? true;
  const visibleNav = showTeam
    ? [...navItems, { to: "/team", label: "Equipe", icon: Users2 }]
    : navItems;

  const displayName = user?.user_metadata?.full_name || user?.email || "Convidado";

  const initials = String(displayName)
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Moove</span>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">List</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2">
          {visibleNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-soft text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium">{user.user_metadata?.full_name ?? user.email}</div>
                <div className="truncate text-xs text-muted-foreground">Recrutador</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar candidatos, vagas, clientes…"
              className="h-9 w-full rounded-lg border border-transparent bg-secondary pl-9 pr-3 text-sm outline-none transition focus:border-border focus:bg-card"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/clients/new"><Button size="sm" variant="outline"><UserPlus className="mr-1.5 h-4 w-4" />Cliente</Button></Link>
            <Link to="/jobs/new"><Button size="sm" variant="outline"><Briefcase className="mr-1.5 h-4 w-4" />Vaga</Button></Link>
            <Link to="/candidates/new"><Button size="sm" variant="outline"><FilePlus className="mr-1.5 h-4 w-4" />Candidato</Button></Link>
            <Link to="/shortlists/new">
              <Button size="sm"><Sparkles className="mr-1.5 h-4 w-4" />Nova shortlist</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
