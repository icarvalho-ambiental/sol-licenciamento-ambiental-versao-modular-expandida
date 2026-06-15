import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditoria } from "@/lib/sol/sol-functions";

export const Route = createFileRoute("/admin/auditoria")({ component: AuditoriaPage });

function AuditoriaPage() {
  const fn = useServerFn(listAuditoria);
  const { data, isLoading } = useQuery({ queryKey: ["auditoria"], queryFn: () => fn() });

  return (
    <AppShell>
      <PageHeader title="Auditoria" subtitle="Últimas 200 ações sensíveis do locatário."/>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : !data || data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Sem registros.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Tabela</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                    <th className="px-4 py-3 font-medium">Registro</th>
                    <th className="px-4 py-3 font-medium">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-xs">{new Date(a.em).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">{a.tabela}</td>
                      <td className="px-4 py-3"><span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{a.acao}</span></td>
                      <td className="px-4 py-3 font-mono text-[11px]">{a.registro_id ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{a.user_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}