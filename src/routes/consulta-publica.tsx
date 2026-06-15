import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SolLogo } from "@/components/sol/SolLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

export const Route = createFileRoute("/consulta-publica")({ component: Pub });

function Pub() {
  const [q, setQ] = useState("");
  const [muni, setMuni] = useState("");
  const [search, setSearch] = useState({ q: "", muni: "" });

  const resultsQ = useQuery({
    queryKey: ["consulta-publica", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("consulta_publica_requerimentos", {
        _q: search.q || undefined,
        _municipio: search.muni || undefined,
        _limit: 200,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const results = resultsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/"><SolLogo/></Link>
          <Link to="/login"><Button variant="outline" size="sm">Acessar plataforma</Button></Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Consulta Pública</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pesquise processos de licenciamento por protocolo, empresa, empreendimento ou município. Dados públicos.</p>
        </div>
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_240px_auto]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input
                className="pl-9"
                placeholder="Buscar por nº processo, CNPJ, empresa ou empreendimento..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearch({ q, muni })}
              />
            </div>
            <Input placeholder="Município" value={muni} onChange={(e) => setMuni(e.target.value)} />
            <Button onClick={() => setSearch({ q, muni })}>Pesquisar</Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              {resultsQ.isLoading ? "Carregando..." : `${results.length} resultado(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nº Processo</th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Empreendimento</th>
                    <th className="px-4 py-3 font-medium">Município</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-3 font-mono text-xs">{r.numero_processo ?? "—"}</td>
                      <td className="px-4 py-3">{r.empresa_nome ?? "—"}</td>
                      <td className="px-4 py-3">{r.empreendimento_nome ?? "—"}</td>
                      <td className="px-4 py-3">{r.municipio ?? "—"}</td>
                      <td className="px-4 py-3">{r.tipo}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {String(r.status).replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!resultsQ.isLoading && results.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum resultado público encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}