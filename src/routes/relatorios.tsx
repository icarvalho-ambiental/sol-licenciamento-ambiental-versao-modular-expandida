import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRelatorios, saveRelatorio, deleteRelatorio, runRelatorio } from "@/lib/sol/reports-functions";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/relatorios")({ component: Page });

const COLUNAS_POR_ENTIDADE: Record<string, string[]> = {
  empresas: ["nome_fantasia", "ativo", "criado_em"],
  empreendimentos: ["nome", "endereco", "ativo", "criado_em"],
  requerimentos: ["titulo", "tipo", "status", "numero_processo", "criado_em"],
  condicionantes: ["titulo", "status", "prazo", "criado_em"],
};

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRelatorios);
  const saveFn = useServerFn(saveRelatorio);
  const delFn = useServerFn(deleteRelatorio);
  const runFn = useServerFn(runRelatorio);

  const { data: relatorios = [] } = useQuery({ queryKey: ["relatorios"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", entidade: "requerimentos", colunas: [] as string[] });
  const [resultado, setResultado] = useState<any>(null);

  const onSave = async () => {
    if (!form.nome || form.colunas.length === 0) return toast.error("Informe nome e colunas.");
    try {
      await saveFn({ data: { ...form, filtros: {} } });
      toast.success("Relatório salvo");
      setOpen(false); setForm({ nome: "", entidade: "requerimentos", colunas: [] });
      qc.invalidateQueries({ queryKey: ["relatorios"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onRun = async (id: string) => {
    try { setResultado(await runFn({ data: { id } })); }
    catch (e: any) { toast.error(e.message); }
  };

  const onCsv = () => {
    if (!resultado) return;
    const cols = resultado.definicao.colunas as string[];
    const rows = resultado.linhas as any[];
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${resultado.definicao.nome}.csv`; a.click();
  };

  const colunasDisponiveis = COLUNAS_POR_ENTIDADE[form.entidade] ?? [];

  return (
    <AppShell>
      <PageHeader title="Relatórios" subtitle="Defina relatórios e exporte resultados." />
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-1"/>Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Relatório</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e=>setForm(s=>({...s,nome:e.target.value}))}/></div>
              <div><Label>Entidade</Label>
                <Select value={form.entidade} onValueChange={v=>setForm(s=>({...s,entidade:v,colunas:[]}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {Object.keys(COLUNAS_POR_ENTIDADE).map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colunas</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {colunasDisponiveis.map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.colunas.includes(c)}
                        onChange={e => setForm(s => ({ ...s, colunas: e.target.checked ? [...s.colunas, c] : s.colunas.filter(x => x !== c) }))} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={onSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Definições</CardTitle></CardHeader>
        <CardContent>
          {relatorios.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum relatório.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Entidade</TableHead><TableHead>Colunas</TableHead><TableHead/></TableRow></TableHeader>
              <TableBody>
                {relatorios.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.nome}</TableCell>
                    <TableCell>{r.entidade}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(r.colunas as string[]).join(", ")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={()=>onRun(r.id)}><Play size={14}/></Button>
                      <Button size="sm" variant="outline" onClick={async()=>{await delFn({data:{id:r.id}}); qc.invalidateQueries({queryKey:["relatorios"]});}}><Trash2 size={14}/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Resultado: {resultado.definicao.nome}</CardTitle>
            <Button size="sm" variant="outline" onClick={onCsv}><Download size={14} className="mr-1"/>CSV</Button>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow>{(resultado.definicao.colunas as string[]).map(c=><TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {resultado.linhas.map((r: any, i: number) => (
                  <TableRow key={i}>
                    {(resultado.definicao.colunas as string[]).map(c => (
                      <TableCell key={c} className="text-xs">{typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}