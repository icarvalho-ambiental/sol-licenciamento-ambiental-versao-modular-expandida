import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApiTokens, createApiToken, revokeApiToken, listApiRequestLog } from "@/lib/sol/reports-functions";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Copy, Ban } from "lucide-react";

export const Route = createFileRoute("/admin/api-tokens")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listApiTokens);
  const createFn = useServerFn(createApiToken);
  const revokeFn = useServerFn(revokeApiToken);
  const { data: tokens = [] } = useQuery({ queryKey: ["api-tokens"], queryFn: () => listFn() });
  const logFn = useServerFn(listApiRequestLog);
  const { data: logs = [] } = useQuery({ queryKey: ["api-logs"], queryFn: () => logFn({ data: { limit: 100 } }), refetchInterval: 15000 });
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [novoToken, setNovoToken] = useState<string | null>(null);

  const onCreate = async () => {
    if (!nome) return toast.error("Informe um nome");
    try {
      const r: any = await createFn({ data: { nome } });
      setNovoToken(r.token);
      setNome("");
      qc.invalidateQueries({ queryKey: ["api-tokens"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <PageHeader title="Tokens de API" subtitle="Tokens para chamadas externas em /api/v1/*." />
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setNovoToken(null); }}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-1"/>Novo token</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerar novo token</DialogTitle></DialogHeader>
            {novoToken ? (
              <div className="space-y-3">
                <p className="text-sm">Copie agora — o segredo não será exibido novamente:</p>
                <div className="rounded bg-muted p-2 font-mono text-xs break-all">{novoToken}</div>
                <Button className="w-full" onClick={()=>{navigator.clipboard.writeText(novoToken); toast.success("Copiado");}}>
                  <Copy size={14} className="mr-1"/>Copiar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Integração ERP"/></div>
                <Button onClick={onCreate} className="w-full">Gerar</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tokens existentes</CardTitle></CardHeader>
        <CardContent>
          {tokens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum token.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Prefixo</TableHead><TableHead>Criado</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
              <TableBody>
                {tokens.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{t.prefixo}…</TableCell>
                    <TableCell className="text-xs">{new Date(t.criado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{t.revogado ? <span className="text-rose-600 text-xs">Revogado</span> : <span className="text-emerald-600 text-xs">Ativo</span>}</TableCell>
                    <TableCell className="text-right">
                      {!t.revogado && (
                        <Button size="sm" variant="outline" onClick={async()=>{await revokeFn({data:{id:t.id}}); qc.invalidateQueries({queryKey:["api-tokens"]});}}>
                          <Ban size={14}/>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Como usar</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Endpoints disponíveis (header <code>Authorization: Bearer &lt;token&gt;</code>):</p>
          <ul className="list-disc pl-6 font-mono text-xs">
            <li>GET /api/public/v1/empresas</li>
            <li>GET /api/public/v1/empreendimentos</li>
            <li>GET /api/public/v1/requerimentos</li>
          </ul>
          <p className="text-xs text-muted-foreground">Limite: 120 requisições por token a cada 60 segundos. Respostas com HTTP 429 indicam excesso.</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Últimas chamadas</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Token</TableHead><TableHead>Método</TableHead>
                <TableHead>Rota</TableHead><TableHead>Status</TableHead><TableHead>Latência</TableHead><TableHead>IP</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.criado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{l.api_tokens?.nome ?? "—"} <span className="font-mono text-muted-foreground">{l.api_tokens?.prefixo}…</span></TableCell>
                    <TableCell className="text-xs font-mono">{l.metodo}</TableCell>
                    <TableCell className="text-xs font-mono">{l.rota}</TableCell>
                    <TableCell className={`text-xs ${l.status >= 400 ? "text-rose-600" : "text-emerald-600"}`}>{l.status}</TableCell>
                    <TableCell className="text-xs">{l.latencia_ms ?? "—"} ms</TableCell>
                    <TableCell className="text-xs">{l.ip ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}