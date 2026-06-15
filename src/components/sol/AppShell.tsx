import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home, Building2, MapPin, FileText, Bell, FolderOpen, Search,
  LayoutDashboard, User, LogOut, Menu, X, Settings, ChevronDown, Leaf,
  Users, ShieldCheck, History, SlidersHorizontal, FormInput, BellRing, FileCog,
  Paperclip, FileSearch, PieChart, Mail, BarChart3, MessageSquareWarning,
  Library, AlertOctagon, Scale, Map as MapIcon, Grid3x3, Award, ListTree, Ruler,
  Workflow, Folder, ChevronRight,
  ShieldAlert, Sprout, Beef,
} from "lucide-react";
import { useAuth, canSee } from "@/lib/sol/auth";
import { ROLE_LABELS } from "@/lib/sol/constants";
import type { Role } from "@/lib/sol/mock-data";
import { useActiveTenant, useTenantPermissions } from "@/lib/sol/use-tenant";
import { SolLogo } from "./SolLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof Home;
  iconClass?: string;
  roles: Role[];
  /** Chave de permissão opcional. Quando definida, o item só aparece se o
   *  usuário tiver essa permissão no tenant ativo (host admin sempre vê). */
  perm?: string;
};
type NavGroup = { label: string; roles: Role[]; items: NavItem[]; module?: string };

const ALL: Role[] = ["admin","gac","analista","externo","empresa"];
const STAFF: Role[] = ["admin","gac","analista"];
const ADMIN_ONLY: Role[] = ["admin"];

const HOME_ITEM: NavItem = { to: "/", label: "Home", icon: Home, iconClass: "text-blue-600", roles: ALL };

const GROUPS: NavGroup[] = [
  {
    label: "Host (SaaS)", roles: ADMIN_ONLY, module: "core",
    items: [
      { to: "/host", label: "Clientes", icon: Building2, iconClass: "text-violet-600", roles: ADMIN_ONLY, perm: "host.gerenciar" },
      { to: "/host/modulos", label: "Módulos por Cliente", icon: Grid3x3, iconClass: "text-violet-600", roles: ADMIN_ONLY, perm: "host.modulos.gerenciar" },
      { to: "/host/api-docs", label: "API Docs", icon: FileSearch, iconClass: "text-violet-600", roles: ADMIN_ONLY },
    ],
  },
  {
    label: "Padrão", roles: STAFF, module: "core",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: Users, iconClass: "text-blue-600", roles: STAFF, perm: "admin.ver_usuarios" },
      { to: "/perfil", label: "Meus Dados", icon: User, iconClass: "text-slate-500", roles: ALL },
      { to: "/admin/papel", label: "Papéis e Permissões", icon: ShieldCheck, iconClass: "text-blue-600", roles: ADMIN_ONLY, perm: "admin.gerenciar_papeis" },
    ],
  },
  {
    label: "Requerimentos", roles: ALL, module: "licenciamento",
    items: [
      { to: "/empresas", label: "Empresa", icon: Building2, iconClass: "text-slate-600", roles: ALL, perm: "empresa.ver" },
      { to: "/empreendimentos", label: "Empreendimentos", icon: MapPin, iconClass: "text-rose-600", roles: ALL, perm: "empreendimento.ver" },
      { to: "/requerimentos", label: "Requerimento", icon: FileText, iconClass: "text-amber-600", roles: ALL, perm: "requerimento.ver" },
      { to: "/denuncias", label: "Denúncia", icon: MessageSquareWarning, iconClass: "text-amber-600", roles: ALL },
    ],
  },
  {
    label: "Notificações", roles: ALL, module: "core",
    items: [
      { to: "/notificacoes", label: "Notificação Ambiental", icon: Bell, iconClass: "text-emerald-600", roles: ALL },
      { to: "/auto-infracao", label: "Auto de Infração", icon: AlertOctagon, iconClass: "text-rose-600", roles: ALL },
    ],
  },
  {
    label: "Consulta Processos", roles: ALL, module: "core",
    items: [
      { to: "/consulta-publica", label: "Consulta Pública", icon: Search, iconClass: "text-blue-600", roles: ALL },
    ],
  },
  {
    label: "REURB", roles: ALL, module: "reurb",
    items: [
      { to: "/reurb", label: "Painel", icon: MapIcon, iconClass: "text-emerald-600", roles: ALL, perm: "reurb.ver" },
    ],
  },
  {
    label: "ATER", roles: ALL, module: "ater",
    items: [
      { to: "/ater", label: "Painel", icon: Sprout, iconClass: "text-green-600", roles: ALL, perm: "ater.ver" },
    ],
  },
  {
    label: "SIM", roles: ALL, module: "sim",
    items: [
      { to: "/sim", label: "Painel", icon: Beef, iconClass: "text-amber-600", roles: ALL, perm: "sim.ver" },
    ],
  },
  {
    label: "Documentos", roles: ALL, module: "core",
    items: [
      { to: "/documentos", label: "Documentos da Tipologia", icon: FolderOpen, iconClass: "text-slate-500", roles: ALL },
      { to: "/documentos/emitidos", label: "Documentos Emitidos", icon: FileText, iconClass: "text-rose-600", roles: STAFF, perm: "documento.ver" },
      { to: "/documentos/pareceres", label: "Pareceres Técnicos", icon: Paperclip, iconClass: "text-slate-500", roles: STAFF },
      { to: "/documentos/solicitaveis", label: "Documentos Solicitáveis", icon: FileSearch, iconClass: "text-blue-600", roles: STAFF },
    ],
  },
  {
    label: "Design", roles: ADMIN_ONLY, module: "core",
    items: [
      { to: "/design/campos", label: "Campos", icon: FormInput, iconClass: "text-blue-600", roles: ADMIN_ONLY, perm: "design.gerenciar" },
      { to: "/design/grupo-campos", label: "Grupo de Campos", icon: Grid3x3, iconClass: "text-blue-600", roles: ADMIN_ONLY, perm: "design.gerenciar" },
      { to: "/design/formularios", label: "Formulários", icon: FileText, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "design.gerenciar" },
      { to: "/design/tipos-notificacoes", label: "Tipos de Notificações", icon: BellRing, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "design.gerenciar" },
      { to: "/design/tipos-requerimentos", label: "Tipos de Requerimentos", icon: FileCog, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "design.gerenciar" },
    ],
  },
  {
    label: "Relatórios", roles: STAFF, module: "core",
    items: [
      { to: "/painel-admin", label: "Painéis de controle", icon: PieChart, iconClass: "text-rose-600", roles: STAFF, perm: "painel.ver" },
      { to: "/relatorios/emails", label: "Modelos de Emails", icon: Mail, iconClass: "text-amber-600", roles: ADMIN_ONLY, perm: "relatorios.emails.gerenciar" },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3, iconClass: "text-violet-600", roles: STAFF, perm: "relatorios.ver" },
    ],
  },
  {
    label: "Máquina de Estados", roles: ADMIN_ONLY, module: "licenciamento",
    items: [
      { to: "/admin/maquina-estados", label: "Máquina de Estados", icon: Workflow, iconClass: "text-blue-600", roles: ADMIN_ONLY, perm: "maquina_estados.gerenciar" },
    ],
  },
  {
    label: "GIS / Web SIG", roles: ALL, module: "gis",
    items: [
      { to: "/gis", label: "Mapa", icon: MapIcon, iconClass: "text-emerald-600", roles: ALL, perm: "gis.ver" },
    ],
  },
  {
    label: "Tabelas", roles: STAFF, module: "core",
    items: [
      { to: "/tabelas/biblioteca", label: "Biblioteca", icon: Library, iconClass: "text-slate-500", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/clientes", label: "Clientes", icon: BarChart3, iconClass: "text-blue-600", roles: ADMIN_ONLY, perm: "tabelas.gerenciar" },
      { to: "/tabelas/configuracoes", label: "Configurações", icon: SlidersHorizontal, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "tabelas.gerenciar" },
      { to: "/tabelas/crimes-ambientais", label: "Crimes Ambientais", icon: AlertOctagon, iconClass: "text-rose-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/leis-decretos", label: "Leis e Decretos", icon: Scale, iconClass: "text-slate-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/localizacoes", label: "Localizações", icon: MapIcon, iconClass: "text-blue-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/municipios", label: "Municípios", icon: MapPin, iconClass: "text-rose-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/status-notificacoes", label: "Status das Notificações", icon: Grid3x3, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "tabelas.gerenciar" },
      { to: "/tabelas/profissoes", label: "Profissões", icon: Award, iconClass: "text-amber-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/status-requerimentos", label: "Status dos Requerimentos", icon: Grid3x3, iconClass: "text-violet-600", roles: ADMIN_ONLY, perm: "tabelas.gerenciar" },
      { to: "/tabelas/tipologias", label: "Tipologias", icon: ListTree, iconClass: "text-amber-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/divisoes", label: "Divisões", icon: ListTree, iconClass: "text-amber-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/grupos", label: "Grupos", icon: ListTree, iconClass: "text-amber-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/tipos-unidades", label: "Tipos Unidades", icon: ListTree, iconClass: "text-blue-600", roles: STAFF, perm: "tabelas.ver" },
      { to: "/tabelas/unidades", label: "Unidades", icon: Ruler, iconClass: "text-rose-600", roles: STAFF, perm: "tabelas.ver" },
    ],
  },
  {
    label: "Administração", roles: ADMIN_ONLY, module: "core",
    items: [
      { to: "/admin/auditoria", label: "Auditoria", icon: History, iconClass: "text-amber-600", roles: ADMIN_ONLY, perm: "auditoria.ver" },
      { to: "/admin/api-tokens", label: "Tokens de API", icon: ShieldCheck, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "admin.api_tokens.gerenciar" },
      { to: "/admin/pdf-templates", label: "Modelos de PDF", icon: FileText, iconClass: "text-rose-600", roles: ADMIN_ONLY, perm: "admin.pdf_templates.gerenciar" },
      { to: "/admin/configuracoes-modelo", label: "Configurações do Modelo", icon: SlidersHorizontal, iconClass: "text-rose-600", roles: ADMIN_ONLY, perm: "admin.pdf_templates.gerenciar" },
      { to: "/admin/tipos-requerimento", label: "Tipos de Requerimento", icon: FileCog, iconClass: "text-emerald-600", roles: ADMIN_ONLY, perm: "requerimento_tipo.gerenciar" },
      { to: "/admin/onboarding", label: "Onboarding (Clientes)", icon: Building2, iconClass: "text-violet-600", roles: ADMIN_ONLY },
      { to: "/admin/home", label: "Conteúdo da Home", icon: Home, iconClass: "text-blue-600", roles: ADMIN_ONLY },
      { to: "/admin/cepram", label: "Classificação CEPRAM", icon: ListTree, iconClass: "text-emerald-600", roles: ADMIN_ONLY },
      { to: "/fiscalizacao", label: "Fiscalização", icon: ShieldAlert, iconClass: "text-rose-600", roles: ADMIN_ONLY, perm: "fiscalizacao.ver" },
    ],
  },
];

const ROUTE_EXISTS = new Set<string>([
  "/", "/perfil", "/painel-admin",
  "/empresas", "/empreendimentos", "/requerimentos",
  "/notificacoes", "/documentos", "/consulta-publica",
  "/admin/papel", "/host", "/admin/auditoria",
  "/admin/api-tokens", "/admin/pdf-templates",
  "/relatorios", "/empreendimentos/mapa", "/host/modulos",
  "/documentos/emitidos", "/host/api-docs",
  "/gis", "/fiscalizacao", "/reurb", "/sim", "/ater",
  "/admin/tipos-requerimento", "/admin/onboarding",
]);

export function AppShell({ children, requireAuth = true }: { children: ReactNode; requireAuth?: boolean }) {
  const { user, loading, logout, hasPermission } = useAuth();
  const { tenants, activeId, activeTenant, setActive, enabledModuleKeys } = useActiveTenant();
  const { can: hasTenantPerm, isHost } = useTenantPermissions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Requerimentos": true, "Documentos": true,
  });

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) { navigate({ to: "/login" }); return; }
    if (user && !user.perfilCompleto) { navigate({ to: "/concluir-cadastro" }); }
  }, [loading, requireAuth, user, navigate]);

  if (loading) return null;
  if (requireAuth && !user) return null;
  if (user && !user.perfilCompleto) return null;

  const role = user?.role;
  const q = filter.trim().toLowerCase();
  const isAppAdmin = !!user?.roleNames?.includes("admin") || !!user?.isHostAdmin;
  const visibleGroups = GROUPS
    .filter((g) => {
      if (g.label === "Host (SaaS)") return !!user?.isHostAdmin;
      return !role || canSee(role, g.roles);
    })
    .filter((g) => !g.module || g.module === "core" || enabledModuleKeys.has(g.module) || isAppAdmin)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (it) =>
          (!role || canSee(role, it.roles)) &&
          (!it.perm || isHost || isAppAdmin || hasTenantPerm(it.perm)) &&
          (!q || it.label.toLowerCase().includes(q))
      ),
    }))
    .filter((g) => g.items.length > 0);

  const homeMatches = !q || HOME_ITEM.label.toLowerCase().includes(q);

  const renderItem = (it: NavItem) => {
    const active = it.to && (pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to)));
    const Icon = it.icon;
    const exists = it.to ? ROUTE_EXISTS.has(it.to) : false;
    const inner = (
      <>
        <Icon size={15} className={cn("shrink-0", it.iconClass ?? "text-muted-foreground")} />
        <span className={cn("truncate underline-offset-2 group-hover:underline", active && "font-semibold")}>
          {it.label}
        </span>
      </>
    );
    const classes = cn(
      "group flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors",
      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60"
    );
    if (it.to && exists) {
      return (
        <Link key={it.label} to={it.to} onClick={() => setOpen(false)} className={classes}>
          {inner}
        </Link>
      );
    }
    return (
      <button
        key={it.label}
        type="button"
        onClick={() => toast.info(`${it.label} — módulo em construção`)}
        className={cn(classes, "w-full text-left")}
      >
        {inner}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <SolLogo />
          </Link>
          <div className="ml-2 hidden text-xs text-muted-foreground md:block">
            Sistema Online de Licenciamento Ambiental
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user && tenants.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Building2 size={14} />
                    <span className="hidden md:inline max-w-[160px] truncate">{activeTenant?.nome ?? "Cliente"}</span>
                    <ChevronDown size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Trocar de cliente</DropdownMenuLabel>
                  {tenants.map((t: any) => (
                    <DropdownMenuItem key={t.id} onClick={() => setActive(t.id)}>
                      <Building2 size={14} className="mr-2" />
                      <span className="flex-1 truncate">{t.nome}</span>
                      {t.id === activeId && <span className="text-xs text-primary">ativo</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user && tenants.length === 1 && activeTenant && (
              <div className="hidden md:flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                <Building2 size={12} /> {activeTenant.nome}
              </div>
            )}
            <Link to="/consulta-publica">
              <Button variant="outline" size="sm" className="gap-2">
                <Search size={16} /> Consulta Pública
              </Button>
            </Link>
            <Link to="/documentos">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText size={16} /> Documentos
              </Button>
            </Link>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User size={16} />
                    </div>
                    <div className="hidden text-left text-xs md:block">
                      <div className="font-medium leading-tight">{user.nome}</div>
                      <div className="text-muted-foreground">{ROLE_LABELS[user.role]}</div>
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Conta</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
                    <User size={14} className="mr-2"/> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Papéis</DropdownMenuLabel>
                  <div className="px-2 pb-2 text-xs text-muted-foreground">
                    {user.roleNames.length ? user.roleNames.join(", ") : "—"}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate({ to: "/login" }); }}>
                    <LogOut size={14} className="mr-2"/> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button className="rounded-md p-2 text-muted-foreground hover:bg-accent" aria-label="Configurações">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-16 left-0 z-30 w-72 border-r border-sidebar-border bg-sidebar transition-transform md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="flex h-full flex-col overflow-y-auto">
            {/* Filter */}
            <div className="border-b border-sidebar-border bg-muted/40 p-2">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtro..."
                  className="h-8 rounded-md border-border bg-background pl-7 text-[13px]"
                />
              </div>
            </div>

            <div className="flex-1 space-y-px p-1">
              {/* Home (top-level, always visible) */}
              {homeMatches && (
                <div className="px-1 py-0.5">
                  {renderItem(HOME_ITEM)}
                </div>
              )}

              {/* Groups */}
              {visibleGroups.map((g) => {
                const isOpen = openGroups[g.label] !== false;
                return (
                  <div key={g.label}>
                    <button
                      type="button"
                      onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !isOpen }))}
                      className="flex w-full items-center gap-2 border-y border-sidebar-border bg-muted/40 px-3 py-1.5 text-left text-[13px] font-semibold text-foreground hover:bg-muted/70"
                    >
                      <Folder size={15} className="text-amber-500" fill="currentColor" fillOpacity={0.25}/>
                      <span className="flex-1">{g.label}</span>
                      <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-90")}/>
                    </button>
                    {isOpen && (
                      <div className="space-y-px py-1 pl-2 pr-1">
                        {g.items.map(renderItem)}
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleGroups.length === 0 && !homeMatches && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum item encontrado.
                </div>
              )}
            </div>

            <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Leaf size={12} className="text-primary"/> SOL — Versão 1.0.9400
              </div>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: {
  title: string; subtitle?: string; actions?: ReactNode; breadcrumb?: string[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <div className="mb-1 text-xs text-muted-foreground">{breadcrumb.join(" / ")}</div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}