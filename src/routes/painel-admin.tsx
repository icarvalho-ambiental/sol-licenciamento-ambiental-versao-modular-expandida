import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardSummary } from "@/lib/sol/dashboard-functions";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid, Line, LineChart } from "recharts";
import { Building2, MapPin, FileText, Bell } from "lucide-react";

export const Route = createFileRoute("/painel-admin")({ component: Painel });
function Painel() {
  const fetchSummary = useServerFn(dashboardSummary);
  const q = useQuery({ queryKey: ["dashboard", "summary"], queryFn: () => fetchSummary(), retry: false });
  const t = q.data?.totals ?? { empresas: 0, empreendimentos: 0, requerimentos: 0, notificacoes: 0 };
  const status = q.data?.statusCounts ?? [];
  const porMuni = q.data?.porMunicipio ?? [];

  const cards = [
    { l: "Requerimentos", v: t.requerimentos, icon: FileText, c: "text-emerald-600 bg-emerald-50" },
    { l: "Empreendimentos", v: t.empreendimentos, icon: MapPin, c: "text-amber-600 bg-amber-50" },
    { l: "Empresas", v: t.empresas, icon: Building2, c: "text-blue-600 bg-blue-50" },
    { l: "Notificações", v: t.notificacoes, icon: Bell, c: "text-violet-600 bg-violet-50" },
  ];
  return (
    <AppShell>
      <PageHeader title="Painel Gerencial" subtitle="Indicadores consolidados da plataforma."/>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c=>(
          <Card key={c.l}><CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-xl p-3 ${c.c}`}><c.icon size={20}/></div>
            <div><div className="text-2xl font-bold">{c.v}</div><div className="text-xs text-muted-foreground">{c.l}</div></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Requerimentos por status</CardTitle></CardHeader><CardContent>
          <div className="h-72"><ResponsiveContainer><BarChart data={status}>
            <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}} angle={-15} textAnchor="end" height={60}/><YAxis tick={{fontSize:11}}/><ReTooltip/>
            <Bar dataKey="value" fill="var(--color-primary)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card className="lg:col-span-1"><CardHeader><CardTitle className="text-base">Empreendimentos por município ({porMuni.length})</CardTitle></CardHeader><CardContent>
          <div className="h-72"><ResponsiveContainer><BarChart data={porMuni} layout="vertical" margin={{left: 80}}>
            <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:11}}/><YAxis type="category" dataKey="municipio" tick={{fontSize:11}} width={120}/>
            <ReTooltip/><Bar dataKey="empreendimentos" fill="var(--color-primary)" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}