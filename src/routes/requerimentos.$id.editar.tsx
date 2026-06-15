import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/requerimentos/$id/editar")({ component: EditarRequerimento });

function EditarRequerimento() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <PageHeader title="Editar Requerimento" breadcrumb={["Requerimentos", "Editar"]} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
          <Construction className="text-amber-500" size={36} />
          <p className="text-sm">Edição do requerimento <span className="font-mono">{id}</span> em desenvolvimento.</p>
          <Link to="/requerimentos/$id" params={{ id }}><Button variant="outline">Ver detalhes</Button></Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}