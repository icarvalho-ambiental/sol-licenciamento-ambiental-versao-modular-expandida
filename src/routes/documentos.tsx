import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Download, Upload, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listDocumentosBiblioteca,
  uploadDocumentoBiblioteca,
  signDocumentoBibliotecaUrl,
  deleteDocumentoBiblioteca,
} from "@/lib/sol/documentos-functions";
import { useActiveTenant, useCan } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/documentos")({ component: Doc });

function formatBytes(n?: number | null) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Doc() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const { activeId } = useActiveTenant();
  const canDelete = useCan("documento.excluir");

  const list = useServerFn(listDocumentosBiblioteca);
  const upload = useServerFn(uploadDocumentoBiblioteca);
  const sign = useServerFn(signDocumentoBibliotecaUrl);
  const del = useServerFn(deleteDocumentoBiblioteca);
  const qc = useQueryClient();

  const docsQ = useQuery({
    queryKey: ["documentos-biblioteca", activeId, search],
    queryFn: () => list({ data: { q: search || undefined } }),
    enabled: !!activeId,
  });

  const uploadM = useMutation({
    mutationFn: (fd: FormData) => upload({ data: fd }),
    onSuccess: () => {
      toast.success("Documento enviado.");
      setOpenUpload(false);
      qc.invalidateQueries({ queryKey: ["documentos-biblioteca"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao enviar."),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Documento excluído.");
      qc.invalidateQueries({ queryKey: ["documentos-biblioteca"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sem permissão para excluir."),
  });

  async function handleDownload(id: string) {
    try {
      const { url } = await sign({ data: { id } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar link.");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!fd.get("file") || !(fd.get("file") as File).size) {
      toast.error("Selecione um arquivo.");
      return;
    }
    if (!fd.get("nome")) fd.set("nome", (fd.get("file") as File).name);
    uploadM.mutate(fd);
  }

  const rows = docsQ.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Documentos"
        subtitle="Biblioteca de documentos do locatário. Armazenamento privado e auditado."
        actions={
          <Dialog open={openUpload} onOpenChange={setOpenUpload}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload size={16}/> Enviar documento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enviar novo documento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="file">Arquivo (máx 50MB)</Label>
                  <Input id="file" name="file" type="file" required />
                </div>
                <div>
                  <Label htmlFor="nome">Nome de exibição</Label>
                  <Input id="nome" name="nome" placeholder="Opcional (usa o nome do arquivo)" />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input id="tipo" name="tipo" placeholder="Ex: contrato, parecer, planta" />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input id="descricao" name="descricao" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={uploadM.isPending}>
                    {uploadM.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-4"><CardContent className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input
              className="pl-9"
              placeholder="Buscar documento..."
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
            />
          </div>
          <Button variant="outline" onClick={() => setSearch(q)}>Buscar</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>
          <th className="px-4 py-3 font-medium">Nome</th>
          <th className="px-4 py-3 font-medium">Tipo</th>
          <th className="px-4 py-3 font-medium">Tamanho</th>
          <th className="px-4 py-3 font-medium">Data</th>
          <th className="px-4 py-3"></th>
        </tr></thead>
        <tbody>
          {docsQ.isLoading && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando…</td></tr>
          )}
          {!docsQ.isLoading && rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum documento enviado ainda.</td></tr>
          )}
          {rows.map((d: any) => (
            <tr key={d.id} className="border-b last:border-0 hover:bg-accent/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2"><FileText size={16} className="text-primary"/> {d.nome}</div>
                {d.descricao && <div className="text-xs text-muted-foreground">{d.descricao}</div>}
              </td>
              <td className="px-4 py-3">{d.tipo ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatBytes(d.tamanho_bytes)}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(d.criado_em).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleDownload(d.id)}>
                    <Download size={14}/> Baixar
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Excluir "${d.nome}"?`)) deleteM.mutate(d.id);
                      }}
                    >
                      <Trash2 size={14}/>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div></CardContent></Card>
    </AppShell>
  );
}