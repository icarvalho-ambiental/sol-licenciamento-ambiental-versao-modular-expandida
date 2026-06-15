import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createRequerimento, listEmpreendimentosSimple } from "@/lib/sol/sol-functions";
import { listRequerimentoTipos } from "@/lib/sol/requisito-tipos-functions";
import { toast } from "sonner";

export const Route = createFileRoute("/requerimentos/novo")({ component: Novo });

const TIPOS_FALLBACK = [
  "Licença Prévia (LP)","Licença de Instalação (LI)","Licença de Operação (LO)",
  "Autorização Ambiental","Renovação","Outros",
];

function Novo() {
  const nav = useNavigate();
  const createFn = useServerFn(createRequerimento);
  const empFn = useServerFn(listEmpreendimentosSimple);
  const tiposFn = useServerFn(listRequerimentoTipos);
  const { data: empreendimentos = [] } = useQuery({ queryKey: ["empreend-simple"], queryFn: () => empFn() });
  const { data: tipos = [] } = useQuery({ queryKey: ["req-tipos"], queryFn: () => tiposFn() });
  const tiposAtivos = (tipos as any[]).filter(t => t.ativo);
  const opcoes = tiposAtivos.length > 0
    ? tiposAtivos.map(t => t.nome)
    : TIPOS_FALLBACK;

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    empreendimentoId: "", tipo: "", titulo: "", descricao: "", prazoEm: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.empreendimentoId || !form.tipo) return toast.error("Selecione empreendimento e tipo.");
    setBusy(true);
    try {
      const row = await createFn({
        data: {
          empreendimentoId: form.empreendimentoId,
          tipo: form.tipo,
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          prazoEm: form.prazoEm || undefined,
        },
      });
      toast.success("Requerimento criado em rascunho.");
      nav({ to: "/requerimentos/$id", params: { id: row.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Novo Requerimento" breadcrumb={["Requerimentos","Novo"]}/>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                <SelectContent>{opcoes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Empreendimento *</Label>
              <Select value={form.empreendimentoId} onValueChange={(v) => setForm((f) => ({ ...f, empreendimentoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                <SelectContent>
                  {empreendimentos.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Título *</Label>
              <Input required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}/></div>
            <div className="space-y-2"><Label>Prazo</Label>
              <Input type="date" value={form.prazoEm} onChange={(e) => setForm((f) => ({ ...f, prazoEm: e.target.value }))}/></div>
            <div className="space-y-2 md:col-span-2"><Label>Descrição</Label>
              <Textarea rows={4} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}/></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/requerimentos"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Criar requerimento"}</Button>
        </div>
      </form>
    </AppShell>
  );
}