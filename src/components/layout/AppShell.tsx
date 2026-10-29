import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Sparkles, Search, LogOut, UserPlus, Briefcase, FilePlus, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/db/team.functions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_GROUPS, isNavActive, type NavGroup } from "@/lib/nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();

  // Acesso restrito: apenas recrutadores autenticados usam o painel interno.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const accessFn = useServerFn(getMyAccess);
  const access = useQuery({
    queryKey: ["my-access"],
    queryFn: () => accessFn(),
    enabled: !!user,
    retry: false,
  });

  const showTeam = access.data?.isAdmin ?? false;
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  // Equipe continua visível só para administradores (regra de permissão existente).
  const groups: NavGroup[] = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || showTeam) })).filter((g) => g.items.length > 0);

  const displayName =
    access.data?.profile?.full_name || user?.user_metadata?.full_name || user?.email || "Recrutador";

  const initials = String(displayName)
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (access.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="card-soft max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Acesso não liberado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(access.error as any)?.message ??
              "Solicite ao administrador que inclua seu e-mail na equipe."}
          </p>
          <Button className="mt-4" variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

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
        <SidebarNav groups={groups} pathname={pathname} />
        <div className="border-t border-border p-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-soft text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">Recrutador</div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex w-full items-center gap-2 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-soft text-primary text-xs">MV</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium">Acesso livre</div>
                <div className="truncate text-xs text-muted-foreground">Recrutador</div>
              </div>
            </div>
          )}
        </div>

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 overflow-y-auto p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-16 items-center gap-2 px-5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
                <div className="flex flex-col leading-tight"><span className="text-sm font-semibold tracking-tight">Moove</span><span className="text-[11px] uppercase tracking-widest text-muted-foreground">List</span></div>
              </div>
              <SidebarNav groups={groups} pathname={pathname} />
            </SheetContent>
          </Sheet>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar candidatos, vagas, clientes…"
              className="h-9 w-full rounded-lg border border-transparent bg-secondary pl-9 pr-3 text-sm outline-none transition focus:border-border focus:bg-card"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 overflow-x-auto">
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

function SidebarNav({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav className="flex-1 px-3 py-2" aria-label="Menu principal">
      {groups.map((g, gi) => (
        <div key={g.title} className={gi === 0 ? "" : "mt-5"}>
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{g.title}</div>
          {g.items.map((item) => {
            const Icon = item.icon;
            if (item.soon) {
              return (
                <div key={item.to} aria-disabled className="mb-0.5 flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/60">
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide">Em breve</span>
                </div>
              );
            }
            const active = isNavActive(pathname, item);
            return (
              <Link key={item.to} to={item.to}
                className={cn("mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
