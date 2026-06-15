import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/host/api-docs")({ component: Page });

type Spec = {
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, {
    summary: string;
    parameters?: Array<{ name: string; in: string; schema: { type: string; default?: any; maximum?: number } }>;
    responses: Record<string, { description: string }>;
  }>>;
};

function Page() {
  const { data, isLoading, error } = useQuery<Spec>({
    queryKey: ["openapi"],
    queryFn: async () => {
      const r = await fetch("/api/public/v1/openapi");
      if (!r.ok) throw new Error("Falha ao carregar OpenAPI");
      return r.json();
    },
  });

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell>
      <PageHeader
        title="API pública — Documentação"
        subtitle="Endpoints REST autenticados por token Bearer. Geração de tokens em /admin/api-tokens."
        breadcrumb={["Host", "API Docs"]}
        actions={
          <Button variant="outline" asChild>
            <a href="/api/public/v1/openapi" target="_blank" rel="noreferrer" className="gap-2">
              <ExternalLink size={14}/> Baixar OpenAPI JSON
            </a>
          </Button>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-rose-600">{(error as Error).message}</p>}

      {data && (
        <>
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">{data.info.title} <span className="text-xs text-muted-foreground">v{data.info.version}</span></CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{data.info.description}</p>
              <div className="rounded-md bg-muted p-3 font-mono text-xs">
                curl -H "Authorization: Bearer SEU_TOKEN" {origin}/api/public/v1/empresas
                <Button size="sm" variant="ghost" className="ml-2 h-6 px-2"
                  onClick={() => copy(`curl -H "Authorization: Bearer SEU_TOKEN" ${origin}/api/public/v1/empresas`)}>
                  <Copy size={12}/>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {Object.entries(data.paths).map(([path, methods]) => (
              Object.entries(methods).map(([method, op]) => (
                <Card key={`${method}-${path}`}>
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <Badge variant="outline" className="uppercase">{method}</Badge>
                    <code className="text-sm font-mono">{path}</code>
                    <Button size="sm" variant="ghost" className="ml-auto h-7 px-2" onClick={() => copy(`${origin}${path}`)}>
                      <Copy size={12}/>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>{op.summary}</p>
                    {op.parameters && op.parameters.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Parâmetros</div>
                        <ul className="space-y-1 text-xs">
                          {op.parameters.map((p) => (
                            <li key={p.name}>
                              <code className="font-mono">{p.name}</code>
                              <span className="text-muted-foreground"> · {p.in} · {p.schema.type}{p.schema.default !== undefined ? ` (default ${p.schema.default})` : ""}{p.schema.maximum ? ` · max ${p.schema.maximum}` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Respostas</div>
                      <ul className="space-y-1 text-xs">
                        {Object.entries(op.responses).map(([code, resp]) => (
                          <li key={code}>
                            <span className={code.startsWith("2") ? "text-emerald-600" : "text-rose-600"}>{code}</span>
                            <span className="text-muted-foreground"> · {resp.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}