import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotificacoes, marcarNotificacaoLida, marcarTodasLidas } from "@/lib/sol/sol-functions";
import { toast } from "sonner";

export const Route = createFileRoute("/notificacoes")({ component: NotPage });

function NotPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNotificacoes);
  const markFn = useServerFn(marcarNotificacaoLida);
  const allFn = useServerFn(marcarTodasLidas);
  const { data = [], isLoading } = useQuery({ queryKey: ["notificacoes"], queryFn: () => listFn() });
  const rows = data as any[];

  async function markAll() {
    try { await allFn(); qc.invalidateQueries({ queryKey: ["notificacoes"] }); toast.success("Todas marcadas como lidas."); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function mark(id: string) {
    try { await markFn({ data: { id, lida: true } }); qc.invalidateQueries({ queryKey: ["notificacoes"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <AppShell>
      <PageHeader
        title="Notificações"
        subtitle="Avisos automáticos do sistema."
        actions={<Button variant="outline" className="gap-2" onClick={markAll}><CheckCheck size={16}/> Marcar todas como lidas</Button>}
      />
      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && rows.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Sem notificações.</CardContent></Card>
        )}
        {rows.map((n) => (
          <Card key={n.id} className={n.lida ? "opacity-70" : ""}>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><Bell size={18}/></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{n.titulo}</div>
                  {!n.lida && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase text-primary-foreground">nova</span>}
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] uppercase">{n.tipo}</span>
                </div>
                {n.mensagem && <div className="mt-1 text-sm text-muted-foreground">{n.mensagem}</div>}
                <div className="mt-1 text-xs text-muted-foreground">{new Date(n.criado_em).toLocaleString("pt-BR")}</div>
              </div>
              <div className="flex gap-2">
                {!n.lida && <Button size="sm" variant="ghost" onClick={() => mark(n.id)}>Marcar lida</Button>}
                {n.requerimento_id && (
                  <Link to="/requerimentos/$id" params={{ id: n.requerimento_id }}>
                    <Button variant="outline" size="sm" className="gap-1">Abrir <ArrowRight size={14}/></Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
