import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, Printer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRequerimento, updateRequerimentoStatus, addComentario,
  listCondicionantesByRequerimento, createCondicionante,
  updateCondicionanteStatus, deleteCondicionante, listTenantMembers,
} from "@/lib/sol/sol-functions";
import { renderRequerimentoPdfHtml } from "@/lib/sol/reports-functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, CheckCircle2 } from "lucide-react";
import { useCan, useTenantPermissions } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/requerimentos/$id")({ component: Detalhe });

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", em_analise: "Em análise",
  pendente_documentos: "Pend. docs", aprovado: "Aprovado",
  indeferido: "Indeferido", arquivado: "Arquivado",
};

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  rascunho: [{ value: "enviado", label: "Enviar" }],
  enviado: [{ value: "em_analise", label: "Iniciar análise" }, { value: "arquivado", label: "Arquivar" }],
  em_analise: [
    { value: "pendente_documentos", label: "Solicitar documentos" },
    { value: "aprovado", label: "Aprovar" },
    { value: "indeferido", label: "Indeferir" },
    { value: "arquivado", label: "Arquivar" },
  ],
  pendente_documentos: [{ value: "em_analise", label: "Voltar para análise" }, { value: "arquivado", label: "Arquivar" }],
  aprovado: [{ value: "arquivado", label: "Arquivar" }],
  indeferido: [{ value: "arquivado", label: "Arquivar" }],
  arquivado: [],
};

const STATUS_PERM: Record<string, string> = {
  enviado: "requerimento.enviar",
  em_analise: "requerimento.analisar",
  pendente_documentos: "requerimento.solicitar_documentos",
  aprovado: "requerimento.aprovar",
  indeferido: "requerimento.indeferir",
  arquivado: "requerimento.arquivar",
};

function Detalhe() {
  const { id } = useParams({ from: "/requerimentos/$id" });
  const qc = useQueryClient();
  const getFn = useServerFn(getRequerimento);
  const statusFn = useServerFn(updateRequerimentoStatus);
  const comentFn = useServerFn(addComentario);
  const pdfFn = useServerFn(renderRequerimentoPdfHtml);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  const canComentar = useCan("requerimento.comentar");

  const { data, isLoading, error } = useQuery({
    queryKey: ["req", id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (isLoading) return <AppShell><PageHeader title="Carregando…"/></AppShell>;
  if (error || !data) return <AppShell><PageHeader title={(error as Error)?.message ?? "Não encontrado"}/></AppShell>;

  const r = data.requerimento as any;
  const emp = r.empreendimentos;
  const empresa = emp?.empresas;
  const nextActions = NEXT_STATUS[r.status] ?? [];

  async function changeStatus(next: string) {
    setBusy(true);
    try {
      await statusFn({ data: { id, status: next as any } });
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["req", id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendComentario() {
    if (!comentario.trim()) return;
    setBusy(true);
    try {
      await comentFn({ data: { requerimentoId: id, texto: comentario.trim() } });
      setComentario("");
      toast.success("Comentário publicado.");
      qc.invalidateQueries({ queryKey: ["req", id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={r.titulo}
        subtitle={`${r.tipo}${r.numero_processo ? ` • ${r.numero_processo}` : ""}`}
        breadcrumb={["Requerimentos", r.titulo]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={async () => {
              try {
                const r = await pdfFn({ data: { requerimentoId: id } });
                const w = window.open("", "_blank");
                if (w) { w.document.open(); w.document.write(r.html); w.document.close(); }
              } catch (e: any) { toast.error(e.message); }
            }}><Printer size={16}/> Imprimir PDF</Button>
            <Link to="/requerimentos"><Button variant="outline" className="gap-2"><ArrowLeft size={16}/> Voltar</Button></Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Resumo</CardTitle>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div><div className="text-xs text-muted-foreground">Empresa</div>
                <div className="font-medium">{empresa?.nome_fantasia || empresa?.pessoas_juridicas?.razao_social || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Empreendimento</div>
                <div className="font-medium">{emp?.nome ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Prazo</div>
                <div className="font-medium">{r.prazo_em ? new Date(r.prazo_em).toLocaleDateString("pt-BR") : "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Criado em</div>
                <div className="font-medium">{new Date(r.criado_em).toLocaleString("pt-BR")}</div></div>
              <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Descrição</div>
                <div className="whitespace-pre-wrap">{r.descricao || "—"}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="historico">
                <TabsList className="m-3">
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="comentarios">Comentários</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                  <TabsTrigger value="condicionantes">Condicionantes</TabsTrigger>
                </TabsList>

                <TabsContent value="historico" className="p-4 pt-0">
                  {data.historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem mudanças de status ainda.</p>
                  ) : (
                    <ol className="relative border-l border-border pl-6">
                      {data.historico.map((h: any) => (
                        <li key={h.id} className="mb-4">
                          <div className="absolute -left-2 mt-1.5 h-4 w-4 rounded-full border-2 border-primary bg-card"/>
                          <div className="text-sm font-medium">
                            {h.status_anterior ? `${STATUS_LABEL[h.status_anterior]} → ` : ""}{STATUS_LABEL[h.status_novo] ?? h.status_novo}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={12}/> {new Date(h.mudado_em).toLocaleString("pt-BR")}
                          </div>
                          {h.motivo && <div className="mt-1 text-sm">{h.motivo}</div>}
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>

                <TabsContent value="comentarios" className="space-y-3 p-4 pt-0">
                  {canComentar ? (
                    <>
                      <Textarea rows={3} placeholder="Escreva um comentário..." value={comentario}
                        onChange={(e) => setComentario(e.target.value)}/>
                      <div className="flex justify-end">
                        <Button onClick={sendComentario} disabled={busy || !comentario.trim()}>Publicar</Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Você não tem permissão para comentar neste requerimento.</p>
                  )}
                  <div className="space-y-2">
                    {data.comentarios.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem comentários.</p>
                    )}
                    {data.comentarios.map((c: any) => (
                      <div key={c.id} className="rounded-md border border-border bg-card p-3">
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.criado_em).toLocaleString("pt-BR")}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{c.texto}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="documentos" className="p-4 pt-0">
                  {data.documentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.documentos.map((d: any) => (
                        <li key={d.id} className="rounded-md border border-border bg-card p-3 text-sm">
                          <div className="font-medium">{d.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.mime_type ?? "—"} • {new Date(d.enviado_em).toLocaleDateString("pt-BR")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="condicionantes" className="p-4 pt-0">
                  <CondicionantesTab requerimentoId={id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <StatusActions actions={nextActions} busy={busy} onChange={changeStatus} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatusActions({
  actions, busy, onChange,
}: { actions: { value: string; label: string }[]; busy: boolean; onChange: (v: string) => void }) {
  const { can } = useTenantPermissions();
  const allowed = actions.filter((a) => can(STATUS_PERM[a.value] ?? ""));
  if (allowed.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ação disponível para o seu perfil neste status.</p>;
  }
  return (
    <>
      {allowed.map((a) => (
        <Button key={a.value} className="w-full" variant={a.value === "indeferido" ? "destructive" : "default"}
          onClick={() => onChange(a.value)} disabled={busy}>
          {a.label}
        </Button>
      ))}
    </>
  );
}

function CondicionantesTab({ requerimentoId }: { requerimentoId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCondicionantesByRequerimento);
  const createFn = useServerFn(createCondicionante);
  const statusFn = useServerFn(updateCondicionanteStatus);
  const delFn = useServerFn(deleteCondicionante);
  const membersFn = useServerFn(listTenantMembers);
  const canCriar = useCan("condicionante.criar");
  const canConcluir = useCan("condicionante.concluir");
  const canExcluir = useCan("condicionante.excluir");

  const { data: rows = [] } = useQuery({
    queryKey: ["condicionantes", requerimentoId],
    queryFn: () => listFn({ data: { requerimentoId } }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["tenant-members"], queryFn: () => membersFn(),
  });

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [responsavel, setResponsavel] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["condicionantes", requerimentoId] });

  async function add() {
    if (!titulo.trim()) return;
    setBusy(true);
    try {
      await createFn({ data: {
        requerimentoId, titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        prazo: prazo || undefined,
        responsavelUserId: responsavel || undefined,
      }});
      setTitulo(""); setDescricao(""); setPrazo(""); setResponsavel("");
      toast.success("Condicionante adicionada.");
      invalidate();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function setStatus(id: string, status: string) {
    try { await statusFn({ data: { id, status: status as any } }); invalidate(); toast.success("Atualizada."); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta condicionante?")) return;
    try { await delFn({ data: { id } }); invalidate(); toast.success("Excluída."); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      {canCriar && <div className="grid gap-3 rounded-md border bg-muted/30 p-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Apresentar PRAD em 90 dias"/>
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)}/>
        </div>
        <div>
          <Label>Prazo</Label>
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}/>
        </div>
        <div>
          <Label>Responsável</Label>
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger><SelectValue placeholder="Selecionar..."/></SelectTrigger>
            <SelectContent>
              {(members as any[]).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={add} disabled={busy || !titulo.trim()}>Adicionar condicionante</Button>
        </div>
      </div>}

      {(rows as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma condicionante cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {(rows as any[]).map((c) => {
            const vencida = c.prazo && c.status !== "cumprida" && new Date(c.prazo) < new Date();
            return (
              <li key={c.id} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.titulo}</div>
                    {c.descricao && <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{c.descricao}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Status: <span className="font-medium">{c.status}</span>
                      {c.prazo && <> • Prazo: <span className={vencida ? "text-destructive font-medium" : ""}>{new Date(c.prazo).toLocaleDateString("pt-BR")}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canConcluir && c.status !== "cumprida" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(c.id, "cumprida")}>
                        <CheckCircle2 size={14}/> Concluir
                      </Button>
                    )}
                    {canExcluir && (
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 size={14}/></Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}