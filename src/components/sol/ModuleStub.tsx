import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ModuleStub({
  title, descricao, icon, children,
}: { title: string; descricao: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-2">
            <Construction className="mx-auto text-amber-500" size={32} />
            <p className="text-sm">Módulo registrado. Próximas entregas trarão CRUD completo, GIS dedicado e relatórios.</p>
            {children}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}