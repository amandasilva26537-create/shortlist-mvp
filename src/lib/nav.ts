import {
  LayoutDashboard, Users, Briefcase, ListChecks, GitCompare, Tag as TagIcon, Users2, UserPlus, Inbox, Megaphone,
  Globe, Radar, Contact, Library, MessagesSquare, Settings, type LucideIcon,
} from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon; exact?: boolean; soon?: boolean; adminOnly?: boolean }
export interface NavGroup { title: string; items: NavItem[] }

/**
 * Menu por áreas de trabalho. "soon" = módulo ainda não implementado: aparece com "Em breve" e não leva a nenhuma página.
 * Ao implementar um módulo, remova `soon` e informe a rota.
 */
export const NAV_GROUPS: NavGroup[] = [
  { title: "Visão geral", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Gestão de recrutamento",
    items: [
      { to: "/clients", label: "Clientes", icon: Users },
      { to: "/jobs", label: "Vagas", icon: Briefcase },
      { to: "/candidates", label: "Candidatos", icon: UserPlus },
      { to: "/crm", label: "CRM de recrutamento", icon: Contact, soon: true },
      { to: "/candidaturas", label: "Candidaturas", icon: Inbox },
      { to: "/shortlists", label: "Shortlists", icon: ListChecks },
      { to: "/acompanhamento", label: "Acompanhamento de Vagas", icon: Radar, exact: true },
    ],
  },
  {
    title: "Atração de talentos",
    items: [
      { to: "/divulgacao", label: "Divulgação de Vagas", icon: Megaphone },
      { to: "/carreiras", label: "Página de Carreiras", icon: Globe },
      { to: "/banco-de-talentos", label: "Banco de Talentos", icon: Library, soon: true },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { to: "/roteiros", label: "Roteiros de Entrevista", icon: MessagesSquare, soon: true },
      { to: "/compare", label: "Comparar Candidatos", icon: GitCompare },
      { to: "/tags", label: "Etiquetas", icon: TagIcon },
    ],
  },
  {
    title: "Administração",
    items: [
      { to: "/team", label: "Equipe", icon: Users2, adminOnly: true },
      { to: "/configuracoes", label: "Configurações", icon: Settings, soon: true },
    ],
  },
];

export const isNavActive = (pathname: string, item: Pick<NavItem, "to" | "exact">) =>
  item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
