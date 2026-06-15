import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/sol/AppShell";
import { useAuth, canSee } from "@/lib/sol/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FilePlus2, Building2, MapPin, ShieldCheck, FileText, Bell, Play, CalendarClock, AlertTriangle, CheckCircle2, FolderOpen, BarChart3, Globe } from "lucide-react";
import { SolLogo } from "@/components/sol/SolLogo";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardSummary } from "@/lib/sol/dashboard-functions";
import { getHomeContent } from "@/lib/sol/home-content-functions";
import { useActiveTenant } from "@/lib/sol/use-tenant";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useAuth();
  const role = user?.role;
  const { activeId } = useActiveTenant();
  const [muni, setMuni] = useState<string>("todos");
  const fetchSummary = useServerFn(dashboardSummary);
  const fetchHome = useServerFn(getHomeContent);
  const summaryQ = useQuery({
    queryKey: ["dashboard", "summary", activeId],
    queryFn: () => fetchSummary(),
    enabled: !!user && !!activeId,
    retry: false,
  });
  const homeQ = useQuery({
    queryKey: ["home-content"],
    queryFn: () => fetchHome(),
    retry: false,
  });
  const data = summaryQ.data;
  const totals = data?.totals ?? { empresas: 0, empreendimentos: 0, requerimentos: 0, notificacoes: 0 };
  const porMuni = data?.porMunicipio ?? [];
  const municipios = useMemo(() => porMuni.map((r) => r.municipio), [porMuni]);

  const resumo = useMemo(
    () => (muni === "todos" ? porMuni : porMuni.filter((x) => x.municipio === muni)),
    [muni, porMuni],
  );

  const chartData = [
    { categoria: "Requerimentos", total: totals.requerimentos, ativos: data?.statusCounts.find((s) => s.name === "em_analise")?.value ?? 0 },
    { categoria: "Empreendimentos", total: totals.empreendimentos, ativos: totals.empreendimentos },
    { categoria: "Pessoa Jurídica", total: totals.empresas, ativos: totals.empresas },
  ];

  const slides = homeQ.data?.slides ?? [];
  const videoUrl = homeQ.data?.video_url ?? null;

  const condicionantes = data?.condicionantes ?? [];

  const condIcon = (s: string) =>
    s === "vencida" ? <AlertTriangle size={16} className="text-destructive"/> :
    s === "em_andamento" ? <CalendarClock size={16} className="text-amber-600"/> :
    <CheckCircle2 size={16} className="text-emerald-600"/>;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Hero: official SOL logomark + tagline */}
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-primary-soft/40 px-6 py-10 text-center">
          <SolLogo variant="full" size={140} />
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">
            Plataforma oficial de licenciamento e regularização ambiental — protocolos,
            condicionantes e fiscalização em um só lugar.
          </p>
        </section>

        {/* Primary action: Consulta Pública */}
        <section className="flex justify-center">
          <Link to="/consulta-publica" className="w-full max-w-md">
            <Button
              size="lg"
              className="h-14 w-full gap-2 text-base font-semibold shadow-[var(--shadow-card)]"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Globe size={20}/> Consulta Pública
            </Button>
          </Link>
        </section>

        {/* Three centered action buttons */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { to: "/requerimentos/novo", label: "Novo Requerimento", icon: FilePlus2, desc: "Abrir um novo protocolo ambiental." },
            { to: "/empreendimentos/novo", label: "Cadastrar Empreendimento", icon: MapPin, desc: "Registrar uma nova unidade ou área." },
            { to: "/empresas/nova", label: "Cadastrar Empresa", icon: Building2, desc: "Adicionar pessoa jurídica e responsáveis." },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="group">
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <a.icon size={26}/>
                  </div>
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-sm text-muted-foreground">{a.desc}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {/* Carousel of institutional images (admin-managed) */}
        {slides.length > 0 && (
        <section>
          <Card className="overflow-hidden">
            <Carousel opts={{ loop: true }} className="w-full">
              <CarouselContent>
                {slides.map((s) => (
                  <CarouselItem key={s.src}>
                    <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                      <img src={s.src} alt={s.title} className="h-full w-full object-cover"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="text-lg font-semibold md:text-2xl">{s.title}</div>
                        <div className="text-sm text-white/90 md:text-base">{s.caption}</div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3"/>
              <CarouselNext className="right-3"/>
            </Carousel>
          </Card>
        </section>
        )}

        {/* Institutional video (admin-managed) */}
        {videoUrl && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play size={16}/> Vídeo Institucional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  className="h-full w-full"
                  src={videoUrl}
                  title="Vídeo institucional SOL"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        </section>
        )}

      {/* Two-column dashboard: Gestão do Sistema (left) + side stack (Dashboard geral + Condicionantes) */}
      {canSee(role, ["admin","gac","analista"]) && (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Gestão do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão do Sistema</CardTitle>
              <p className="text-xs text-muted-foreground">Apenas para perfis com permissões.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { to: "/empresas", label: "Pessoa Jurídica", icon: Building2, desc: "Acessar o cadastro e a manutenção das pessoas jurídicas." },
                  { to: "/empreendimentos", label: "Empreendimentos", icon: MapPin, desc: "Gerenciar localização, situação e dados principais." },
                  { to: "/requerimentos", label: "Requerimentos", icon: FileText, desc: "Criar, consultar e acompanhar o fluxo dos requerimentos." },
                  { to: "/notificacoes", label: "Notificações", icon: Bell, desc: "Consultar notificações emitidas e pendências operacionais." },
                  { to: "/painel-admin", label: "Relatórios", icon: BarChart3, desc: "Abrir relatórios analíticos, exportações e dashboards." },
                  { to: "/documentos", label: "Documentos", icon: FolderOpen, desc: "Acessar documentos, modelos e arquivos institucionais." },
                ].map((s) => (
                  <Link key={s.label} to={s.to} className="group">
                    <div className="flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        <s.icon size={20}/>
                      </div>
                      <div className="text-sm font-semibold">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Side stack */}
          <div className="space-y-6">
            {/* Dashboard geral */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dashboard Geral</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Requerimentos, empreendimentos e pessoa jurídica.
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {chartData.map((d) => (
                    <div key={d.categoria} className="rounded-md border border-border bg-muted/30 p-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">{d.categoria}</div>
                      <div className="text-lg font-bold text-foreground">{d.total}</div>
                    </div>
                  ))}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 140)"/>
                      <XAxis dataKey="categoria" tick={{ fontSize: 10 }}/>
                      <YAxis tick={{ fontSize: 10 }}/>
                      <ReTooltip/>
                      <Legend wrapperStyle={{ fontSize: 11 }}/>
                      <Bar dataKey="total" name="Total" fill="var(--color-primary)" radius={[6,6,0,0]}/>
                      <Bar dataKey="ativos" name="Ativos" fill="oklch(0.7 0.14 145)" radius={[6,6,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Condicionantes */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck size={18}/></div>
                  <div>
                    <CardTitle className="text-base">Condicionantes Ambientais</CardTitle>
                    <p className="text-xs text-muted-foreground">Apenas para perfis com permissões.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {condicionantes.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 rounded-md border border-border p-2">
                      <span className="mt-0.5">{condIcon(c.status)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium">{c.processo}</span>
                          <Badge variant="outline" className="font-normal">{c.prazo}</Badge>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{c.descricao}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Resumo dinâmico por município (apenas GAC) */}
      {canSee(role, ["gac"]) && (
        <section>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Resumo dinâmico por município</CardTitle>
                <p className="text-xs text-muted-foreground">Apenas para o GAC.</p>
              </div>
              <Select value={muni} onValueChange={setMuni}>
                <SelectTrigger className="w-56"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os municípios</SelectItem>
                  {municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 font-medium">Município</th>
                      <th className="py-2 font-medium">Empreendimentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.map((r) => (
                      <tr key={r.municipio} className="border-b last:border-0 hover:bg-accent/30">
                        <td className="py-2 font-medium">{r.municipio}</td>
                        <td className="py-2">{r.empreendimentos}</td>
                      </tr>
                    ))}
                    {!resumo.length && (
                      <tr><td colSpan={2} className="py-6 text-center text-xs text-muted-foreground">Sem dados ainda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      </div>
    </AppShell>
  );
}
