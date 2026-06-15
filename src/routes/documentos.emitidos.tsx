import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Download, QrCode, PenLine, FileText, Search, FileDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  listDocumentos, issueDocumento, signDocumentoUrl, signDocumento, createQrToken, listAssinaturas,
} from "@/lib/sol/documentos-emit-functions";
import { generateDocumentoPdf } from "@/lib/sol/pdf-functions";
import { useActiveTenant, useCan } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/documentos/emitidos")({ component: DocsEmitidos });

type Doc = {
  id: string; tipo: string; titulo: string; descricao: string | null; status: string;
  hash_sha256: string | null; paginas: number | null; tamanho_bytes: number | null;
  requerimento_id: string | null; criado_em: string;
};

function DocsEmitidos() {
  const { activeId } = useActiveTenant();
  const canManage = useCan("documento.gerenciar");
  const canSign = useCan("documento.assinar");

  const [search, setSearch] = useState("");
  const [openIssue, setOpenIssue] = useState(false);
  const [openSign, setOpenSign] = useState<Doc | null>(null);
  const [openQr, setOpenQr] = useState<{ doc: Doc; token: string; url: string } | null>(null);

  const list = useServerFn(listDocumentos);
  const issue = useServerFn(issueDocumento);
  const signUrl = useServerFn(signDocumentoUrl);
  const sign = useServerFn(signDocumento);
  const qrFn = useServerFn(createQrToken);
  const genPdf = useServerFn(generateDocumentoPdf);
  const qc = useQueryClient();

  const docsQ = useQuery({
    queryKey: ["documentos", activeId, search],
    queryFn: () => list({ data: { q: search || undefined } }) as Promise<Doc[]>,
    enabled: !!activeId,
  });

  const issueM = useMutation({
    mutationFn: (fd: FormData) => issue({ data: fd }),
    onSuccess: () => {
      toast.success("Documento emitido.");
      setOpenIssue(false);
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao emitir."),
  });

  const signM = useMutation({
    mutationFn: (v: { documentoId: string; signatarioNome: string; papel?: string }) =>
      sign({ data: v }),
    onSuccess: () => {
      toast.success("Assinatura registrada.");
      setOpenSign(null);
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao assinar."),
  });

  return (
    <AppShell>
      <PageHeader
        title="Documentos emitidos"
        subtitle="Documentos com hash, QR Code e trilha de assinaturas eletrônicas."
        breadcrumb={["Documentos", "Emitidos"]}
        actions={
          <div className="flex gap-2">
            <Link to="/documentos"><Button variant="outline">Biblioteca</Button></Link>
            {canManage && (
              <Dialog open={openIssue} onOpenChange={setOpenIssue}>
                <DialogTrigger asChild><Button className="gap-2"><Upload size={16}/> Emitir documento</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Emitir novo documento</DialogTitle></DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const file = fd.get("file");
                      if (!(file instanceof File) || !file.size) return toast.error("Selecione um arquivo.");
                      issueM.mutate(fd);
                    }}
                    className="space-y-3"
                  >
                    <div><Label>Título *</Label><Input name="titulo" required maxLength={300}/></div>
                    <div><Label>Tipo</Label><Input name="tipo" placeholder="parecer, licenca, oficio…" /></div>
                    <div><Label>Descrição</Label><Input name="descricao" maxLength={1000}/></div>
                    <div><Label>Arquivo (PDF) *</Label><Input name="file" type="file" accept="application/pdf,image/*" required /></div>
                    <DialogFooter>
                      <Button type="submit" disabled={issueM.isPending}>
                        {issueM.isPending ? "Enviando…" : "Emitir"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título…"
            className="pl-7"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {docsQ.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando…</div>
          ) : (docsQ.data ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum documento emitido.</div>
          ) : (
            <ul className="divide-y divide-border">
              {(docsQ.data ?? []).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                  <FileText className="text-muted-foreground" size={18}/>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-medium">{d.titulo}</div>
                      <Badge variant="outline">{d.tipo}</Badge>
                      <Badge>{d.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.criado_em).toLocaleString("pt-BR")}
                      {d.hash_sha256 && <> • <span className="font-mono">{d.hash_sha256.slice(0, 12)}…</span></>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" variant="outline" className="gap-1"
                      onClick={async () => {
                        const { url } = await signUrl({ data: { id: d.id } });
                        window.open(url, "_blank");
                      }}
                    >
                      <Download size={14}/> Baixar
                    </Button>
                    {canSign && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpenSign(d)}>
                        <PenLine size={14}/> Assinar
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm" variant="outline" className="gap-1"
                        onClick={async () => {
                          const r = await qrFn({ data: { documentoId: d.id } });
                          const url = `${window.location.origin}/v/${r.token}`;
                          setOpenQr({ doc: d, token: r.token, url });
                        }}
                      >
                        <QrCode size={14}/> Gerar QR
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm" variant="outline" className="gap-1"
                        onClick={async () => {
                          try {
                            const r = await genPdf({ data: { documentoId: d.id } });
                            window.open(r.url, "_blank");
                          } catch (e: any) {
                            toast.error(e?.message ?? "Falha ao gerar PDF");
                          }
                        }}
                      >
                        <FileDown size={14}/> Certificado PDF
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de assinatura */}
      <Dialog open={!!openSign} onOpenChange={(o) => !o && setOpenSign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assinar “{openSign?.titulo}”</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!openSign) return;
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              signM.mutate({
                documentoId: openSign.id,
                signatarioNome: String(fd.get("nome") ?? "").trim(),
                papel: (fd.get("papel") as string) || undefined,
              });
            }}
            className="space-y-3"
          >
            <div><Label>Seu nome *</Label><Input name="nome" required minLength={2} maxLength={200}/></div>
            <div><Label>Cargo / papel</Label><Input name="papel" maxLength={80}/></div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              A assinatura registra hash, IP, usuário e data/hora. Não é reversível.
            </div>
            <DialogFooter>
              <Button type="submit" disabled={signM.isPending}>
                {signM.isPending ? "Registrando…" : "Confirmar assinatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo do QR */}
      <Dialog open={!!openQr} onOpenChange={(o) => !o && setOpenQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Code de validação</DialogTitle></DialogHeader>
          {openQr && (
            <div className="flex flex-col items-center gap-3">
              <QRCodeSVG value={openQr.url} size={220} includeMargin />
              <div className="break-all text-center text-xs text-muted-foreground">{openQr.url}</div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(openQr.url)}>
                Copiar URL
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}