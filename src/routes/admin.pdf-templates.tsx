import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPdfTemplates, savePdfTemplate } from "@/lib/sol/reports-functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pdf-templates")({ component: Page });

const SAMPLE_HTML = `<h1>Requerimento {{titulo}}</h1>
<p><b>Tipo:</b> {{tipo}} • <b>Status:</b> {{status}}</p>
<p><b>Empresa:</b> {{empresa}}</p>
<p><b>Empreendimento:</b> {{empreendimento}} — {{cidade}}/{{uf}}</p>
<p>{{descricao}}</p>`;

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPdfTemplates);
  const saveFn = useServerFn(savePdfTemplate);
  const { data: tpls = [] } = useQuery({ queryKey: ["pdf-templates"], queryFn: () => listFn() });

  const [form, setForm] = useState({ id: undefined as string | undefined, nome: "", html: SAMPLE_HTML, css: "" });

  const onSave = async () => {
    try {
      await saveFn({ data: form });
      toast.success("Modelo salvo");
      setForm({ id: undefined, nome: "", html: SAMPLE_HTML, css: "" });
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <PageHeader title="Modelos de PDF" subtitle="Edite o HTML do PDF impresso por locatário. Variáveis: {{titulo}}, {{empresa}}, {{empreendimento}}, {{cidade}}, {{uf}}, {{status}}, {{descricao}}." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{form.id ? "Editar" : "Novo modelo"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e=>setForm(s=>({...s,nome:e.target.value}))}/></div>
            <div><Label>HTML</Label><Textarea rows={10} className="font-mono text-xs" value={form.html} onChange={e=>setForm(s=>({...s,html:e.target.value}))}/></div>
            <div><Label>CSS (opcional)</Label><Textarea rows={4} className="font-mono text-xs" value={form.css} onChange={e=>setForm(s=>({...s,css:e.target.value}))}/></div>
            <Button onClick={onSave} className="w-full">Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Modelos salvos</CardTitle></CardHeader>
          <CardContent>
            {tpls.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum modelo.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead/></TableRow></TableHeader>
                <TableBody>
                  {tpls.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.nome}</TableCell>
                      <TableCell>{t.ativo ? "Sim" : "Não"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={()=>setForm({id:t.id,nome:t.nome,html:t.html,css:t.css ?? ""})}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}