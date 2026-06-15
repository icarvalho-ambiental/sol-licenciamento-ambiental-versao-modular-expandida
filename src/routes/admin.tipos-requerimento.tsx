import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRequerimentoTipos, upsertRequerimentoTipo, deleteRequerimentoTipo,
  listTipoDocumentos, upsertTipoDocumento, deleteTipoDocumento,
} from "@/lib/sol/requisito-tipos-functions";
import { toast } from "sonner";
import { Trash2, Plus, FilePlus2 } from "lucide-react";

export const Route = createFileRoute("/admin/tipos-requerimento")({
  component: Page,
  errorComponent: ({ error }) => {
    const noTenant = /locat[aá]rio|X-Tenant-Id/i.test(error?.message ?? "");
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-lg border bg-card p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold">
            {noTenant ? "Nenhum locatário ativo" : "Não foi possível carregar"}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {noTenant ? "Crie um locatário no onboarding antes de configurar tipos de requerimento." : error?.message}
          </p>
          <a href="/admin/onboarding" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Ir para onboarding</a>
        </div>
      </AppShell>
    );
  },
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRequerimentoTipos);
  const upsertFn = useServerFn(upsertRequerimentoTipo);
  const delFn = useServerFn(deleteRequerimentoTipo);
  const { data: tipos = [] } = useQuery({ queryKey: ["req-tipos"], queryFn: () => listFn(), throwOnError: true });
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", chave: "", descricao: "", ativo: true });

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    try {
      const r = await upsertFn({ data: { nome: form.nome, chave: form.chave || undefined, descricao: form.descricao || undefined, ativo: form.ativo, ordem: 0 } });
      toast.success("Tipo salvo.");
      setForm({ nome: "", chave: "", descricao: "", ativo: true });
      qc.invalidateQueries({ queryKey: ["req-tipos"] });
      setSel((r as any).id);
    } catch (e: any) { toast.error(e.message); }
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este tipo (e seus documentos)?")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["req-tipos"] });
    if (sel === id) setSel(null);
  }

  return (
    <AppShell>
      <PageHeader title="Tipos de Requerimento" subtitle="Configure os tipos disponíveis e a lista de documentos exigidos por tipo."
        breadcrumb={["Administração", "Tipos de Requerimento"]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus size={16}/> Novo tipo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e=>setForm(f=>({...f, nome: e.target.value}))}/></div>
            <div><Label>Chave (opcional)</Label><Input value={form.chave} placeholder="auto a partir do nome" onChange={e=>setForm(f=>({...f, chave: e.target.value}))}/></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={e=>setForm(f=>({...f, descricao: e.target.value}))}/></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.ativo} onCheckedChange={(v)=>setForm(f=>({...f, ativo: !!v}))}/> Ativo</label>
            <Button onClick={salvar} className="w-full">Salvar tipo</Button>

            <div className="mt-4 space-y-1">
              {tipos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>}
              {tipos.map((t: any) => (
                <div key={t.id} className={"flex items-center gap-2 rounded-md border p-2 " + (sel===t.id ? "border-primary bg-primary/5" : "border-border")}>
                  <button className="flex-1 text-left" onClick={()=>setSel(t.id)}>
                    <div className="font-medium text-sm">{t.nome}</div>
                    <div className="text-xs text-muted-foreground">{t.chave}{!t.ativo && " · inativo"}</div>
                  </button>
                  <Button variant="ghost" size="icon" onClick={()=>excluir(t.id)}><Trash2 size={14}/></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FilePlus2 size={16}/> Documentos exigidos</CardTitle></CardHeader>
          <CardContent>
            {sel ? <DocsPanel tipoId={sel}/> : <p className="text-sm text-muted-foreground">Selecione um tipo à esquerda para configurar os documentos exigidos.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function DocsPanel({ tipoId }: { tipoId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTipoDocumentos);
  const upsertFn = useServerFn(upsertTipoDocumento);
  const delFn = useServerFn(deleteTipoDocumento);
  const { data: docs = [] } = useQuery({ queryKey: ["req-tipo-docs", tipoId], queryFn: () => listFn({ data: { tipoId } }) });
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [obrig, setObrig] = useState(true);

  async function add() {
    if (!nome.trim()) return;
    await upsertFn({ data: { tipoId, nome, descricao: descricao || undefined, obrigatorio: obrig, ordem: docs.length } });
    setNome(""); setDescricao(""); setObrig(true);
    qc.invalidateQueries({ queryKey: ["req-tipo-docs", tipoId] });
  }
  async function remove(id: string) {
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["req-tipo-docs", tipoId] });
  }
  async function toggle(d: any) {
    await upsertFn({ data: { id: d.id, tipoId, nome: d.nome, descricao: d.descricao ?? undefined, obrigatorio: !d.obrigatorio, ordem: d.ordem } });
    qc.invalidateQueries({ queryKey: ["req-tipo-docs", tipoId] });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
        <Input placeholder="Nome do documento *" value={nome} onChange={e=>setNome(e.target.value)}/>
        <Input placeholder="Descrição (opcional)" value={descricao} onChange={e=>setDescricao(e.target.value)}/>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={obrig} onCheckedChange={(v)=>setObrig(!!v)}/> Obrigatório</label>
        <Button onClick={add}>Adicionar</Button>
      </div>
      <ul className="space-y-2">
        {docs.length === 0 && <p className="text-sm text-muted-foreground">Sem documentos exigidos.</p>}
        {docs.map((d: any) => (
          <li key={d.id} className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
            <div className="flex-1">
              <div className="font-medium">{d.nome} {d.obrigatorio && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">obrigatório</span>}</div>
              {d.descricao && <div className="text-xs text-muted-foreground">{d.descricao}</div>}
            </div>
            <Button variant="outline" size="sm" onClick={()=>toggle(d)}>{d.obrigatorio ? "Tornar opcional" : "Tornar obrigatório"}</Button>
            <Button variant="ghost" size="icon" onClick={()=>remove(d.id)}><Trash2 size={14}/></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}