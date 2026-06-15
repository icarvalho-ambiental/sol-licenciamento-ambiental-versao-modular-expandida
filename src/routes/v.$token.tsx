import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { validarQrToken } from "@/lib/sol/documentos-emit-functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SolLogo } from "@/components/sol/SolLogo";
import { CheckCircle2, AlertTriangle, ShieldOff, Clock } from "lucide-react";

export const Route = createFileRoute("/v/$token")({
  component: ValidarQR,
  head: () => ({
    meta: [
      { title: "Validação de Documento — SOL" },
      { name: "description", content: "Verifique a autenticidade de um documento emitido pelo SOL." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type QrResult = {
  documento_id: string;
  titulo: string;
  tipo: string;
  status: string;
  hash_sha256: string | null;
  emitido_em: string;
  tenant_nome: string;
  assinaturas: Array<{ nome: string; papel: string | null; assinado_em: string }>;
  expirado: boolean;
  revogado: boolean;
} | null;

function ValidarQR() {
  const { token } = useParams({ from: "/v/$token" });
  const fetchFn = useServerFn(validarQrToken);
  const q = useQuery({
    queryKey: ["qr", token],
    queryFn: () => fetchFn({ data: { token } }) as Promise<QrResult>,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <SolLogo />
          <span className="text-sm text-muted-foreground">Validação de Documento</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        {q.isLoading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Validando…</CardContent></Card>
        )}
        {q.isError && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-destructive">
              <AlertTriangle /> Não foi possível validar o token.
            </CardContent>
          </Card>
        )}
        {!q.isLoading && !q.isError && !q.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldOff size={20}/> Documento não encontrado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              O token informado não corresponde a nenhum documento emitido.
            </CardContent>
          </Card>
        )}
        {q.data && <ResultCard r={q.data} />}
      </main>
    </div>
  );
}

function ResultCard({ r }: { r: NonNullable<QrResult> }) {
  const invalido = r.revogado || r.expirado;
  const okIcon = invalido ? <ShieldOff className="text-destructive" /> : <CheckCircle2 className="text-emerald-600" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {okIcon}
          <CardTitle className="text-xl">{r.titulo}</CardTitle>
          <Badge variant="outline">{r.tipo}</Badge>
          <Badge>{r.status}</Badge>
          {r.revogado && <Badge variant="destructive">REVOGADO</Badge>}
          {r.expirado && (
            <Badge variant="destructive" className="gap-1"><Clock size={12}/> EXPIRADO</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Emitido por" value={r.tenant_nome} />
          <Field label="Data de emissão" value={new Date(r.emitido_em).toLocaleString("pt-BR")} />
          {r.hash_sha256 && <Field label="Hash SHA-256" value={r.hash_sha256} mono />}
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Assinaturas ({r.assinaturas.length})
          </div>
          {r.assinaturas.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem assinaturas registradas.</div>
          ) : (
            <ul className="space-y-2">
              {r.assinaturas.map((a, i) => (
                <li key={i} className="rounded-md border border-border p-3">
                  <div className="font-medium">{a.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.papel ?? "—"} • {new Date(a.assinado_em).toLocaleString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={mono ? "break-all font-mono text-xs" : "text-sm"}>{value}</div>
    </div>
  );
}