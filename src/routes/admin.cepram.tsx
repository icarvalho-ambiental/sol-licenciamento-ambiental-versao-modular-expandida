import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listCepramDivisoes, listCepramGrupos, listCepramTipologias,
  listCepramEnquadramentos,
  upsertCepramDivisao, upsertCepramGrupo, upsertCepramTipologia,
  upsertCepramEnquadramento, deleteCepramEnquadramento,
} from "@/lib/sol/cepram-functions";

export const Route = createFileRoute("/admin/cepram")({
  head: () => ({ meta: [{ title: "Classificação CEPRAM 4.579" }] }),
  component: AdminCepram,
});

function AdminCepram() {
  const qc = useQueryClient();
  const divFn = useServerFn(listCepramDivisoes);
  const grpFn = useServerFn(listCepramGrupos);
  const tipFn = useServerFn(listCepramTipologias);
  const enqFn = useServerFn(listCepramEnquadramentos);

  const upDiv = useServerFn(upsertCepramDivisao);
  const upGrp = useServerFn(upsertCepramGrupo);
  const upTip = useServerFn(upsertCepramTipologia);
  const upEnq = useServerFn(upsertCepramEnquadramento);
  const delEnq = useServerFn(deleteCepramEnquadramento);

  const [divisaoId, setDivisaoId] = useState<string>("");
  const [grupoId, setGrupoId] = useState<string>("");
  const [tipologiaId, setTipologiaId] = useState<string>("");

  const divQ = useQuery({ queryKey: ["adm-div"], queryFn: () => divFn() });
  const grpQ = useQuery({
    queryKey: ["adm-grp", divisaoId],
    queryFn: () => grpFn({ data: { divisaoId } }),
    enabled: !!divisaoId,
  });
  const tipQ = useQuery({
    queryKey: ["adm-tip", grupoId],
    queryFn: () => tipFn({ data: { grupoId } }),
    enabled: !!grupoId,
  });
  const enqQ = useQuery({
    queryKey: ["adm-enq", tipologiaId],
    queryFn: () => enqFn({ data: { tipologiaId } }),
    enabled: !!tipologiaId,
  });

  // Formulários de novo registro
  const [novaDiv, setNovaDiv] = useState("");
  const [novoGrp, setNovoGrp] = useState("");
  const [novaTip, setNovaTip] = useState("");
  const [novaUni, setNovaUni] = useState("");

  const [enq, setEnq] = useState({
    faixaMin: "0", faixaMax: "", unidadeMedida: "",
    potencialPoluidor: "baixo" as "baixo" | "medio" | "alto",
    porte: "pequeno" as "pequeno" | "medio" | "grande" | "excepcional",
    classe: "1",
  });

  async function salvarDiv() {
    if (!novaDiv.trim()) return;
    await upDiv({ data: { nome: novaDiv.trim() } });
    setNovaDiv(""); qc.invalidateQueries({ queryKey: ["adm-div"] });
    toast.success("Divisão salva.");
  }
  async function salvarGrp() {
    if (!divisaoId || !novoGrp.trim()) return;
    await upGrp({ data: { divisaoId, nome: novoGrp.trim() } });
    setNovoGrp(""); qc.invalidateQueries({ queryKey: ["adm-grp", divisaoId] });
    toast.success("Grupo salvo.");
  }
  async function salvarTip() {
    if (!grupoId || !novaTip.trim()) return;
    await upTip({ data: { grupoId, nome: novaTip.trim(), unidadeMedidaDefault: novaUni.trim() || undefined } });
    setNovaTip(""); setNovaUni(""); qc.invalidateQueries({ queryKey: ["adm-tip", grupoId] });
    toast.success("Tipologia salva.");
  }
  async function salvarEnq() {
    if (!tipologiaId) return;
    try {
      await upEnq({ data: {
        tipologiaId,
        faixaMin: Number(enq.faixaMin),
        faixaMax: enq.faixaMax === "" ? undefined : Number(enq.faixaMax),
        unidadeMedida: enq.unidadeMedida,
        potencialPoluidor: enq.potencialPoluidor,
        porte: enq.porte,
        classe: Number(enq.classe),
      }});
      qc.invalidateQueries({ queryKey: ["adm-enq", tipologiaId] });
      toast.success("Enquadramento salvo.");
    } catch (e) { toast.error((e as Error).message); }
  }
  async function removerEnq(id: string) {
    await delEnq({ data: { id } });
    qc.invalidateQueries({ queryKey: ["adm-enq", tipologiaId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Classificação CEPRAM 4.579"
        subtitle="Edite Divisões, Grupos, Tipologias e faixas de enquadramento que alimentam o cadastro de empreendimentos."
        breadcrumb={["Admin", "Classificação CEPRAM"]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Divisões */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Divisões</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={divisaoId} onValueChange={(v) => { setDivisaoId(v); setGrupoId(""); setTipologiaId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(divQ.data as any[] | undefined)?.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="Nova divisão" value={novaDiv} onChange={(e) => setNovaDiv(e.target.value)} />
              <Button type="button" onClick={salvarDiv}>+</Button>
            </div>
          </CardContent>
        </Card>

        {/* Grupos */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Grupos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={grupoId} onValueChange={(v) => { setGrupoId(v); setTipologiaId(""); }} disabled={!divisaoId}>
              <SelectTrigger><SelectValue placeholder={divisaoId ? "Selecione..." : "Escolha uma divisão"} /></SelectTrigger>
              <SelectContent>
                {(grpQ.data as any[] | undefined)?.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="Novo grupo" value={novoGrp} onChange={(e) => setNovoGrp(e.target.value)} disabled={!divisaoId} />
              <Button type="button" onClick={salvarGrp} disabled={!divisaoId}>+</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tipologias */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Tipologias</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={tipologiaId} onValueChange={setTipologiaId} disabled={!grupoId}>
              <SelectTrigger><SelectValue placeholder={grupoId ? "Selecione..." : "Escolha um grupo"} /></SelectTrigger>
              <SelectContent>
                {(tipQ.data as any[] | undefined)?.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid gap-2">
              <Input placeholder="Nova tipologia" value={novaTip} onChange={(e) => setNovaTip(e.target.value)} disabled={!grupoId} />
              <div className="flex gap-2">
                <Input placeholder="Unidade default (ex.: ha, m³/dia)" value={novaUni} onChange={(e) => setNovaUni(e.target.value)} disabled={!grupoId} />
                <Button type="button" onClick={salvarTip} disabled={!grupoId}>+</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">
            Enquadramentos da tipologia {tipologiaId ? "selecionada" : "(escolha uma tipologia acima)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tipologiaId && (
            <div className="grid gap-3 md:grid-cols-7 items-end">
              <div><Label className="text-xs">Faixa mín.</Label>
                <Input type="number" step="any" value={enq.faixaMin} onChange={(e) => setEnq({ ...enq, faixaMin: e.target.value })} /></div>
              <div><Label className="text-xs">Faixa máx.</Label>
                <Input type="number" step="any" value={enq.faixaMax} placeholder="∞" onChange={(e) => setEnq({ ...enq, faixaMax: e.target.value })} /></div>
              <div><Label className="text-xs">Unidade</Label>
                <Input value={enq.unidadeMedida} onChange={(e) => setEnq({ ...enq, unidadeMedida: e.target.value })} /></div>
              <div><Label className="text-xs">Potencial</Label>
                <Select value={enq.potencialPoluidor} onValueChange={(v: any) => setEnq({ ...enq, potencialPoluidor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Porte</Label>
                <Select value={enq.porte} onValueChange={(v: any) => setEnq({ ...enq, porte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeno</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                    <SelectItem value="excepcional">Excepcional</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Classe</Label>
                <Select value={enq.classe} onValueChange={(v) => setEnq({ ...enq, classe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map((c) => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <Button type="button" onClick={salvarEnq}>Adicionar</Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Potencial</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(enqQ.data as any[] | undefined)?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{Number(r.faixa_min)} – {r.faixa_max == null ? "∞" : Number(r.faixa_max)}</TableCell>
                  <TableCell>{r.unidade_medida}</TableCell>
                  <TableCell className="capitalize">{r.potencial_poluidor}</TableCell>
                  <TableCell className="capitalize">{r.porte}</TableCell>
                  <TableCell>{r.classe}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removerEnq(r.id)}>Remover</Button>
                  </TableCell>
                </TableRow>
              ))}
              {tipologiaId && (enqQ.data as any[] | undefined)?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum enquadramento cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}