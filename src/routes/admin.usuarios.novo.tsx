import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios/novo")({ component: NovoUsuario });

function NovoUsuario() {
  return (
    <AppShell>
      <PageHeader
        title="Novo Usuário"
        subtitle="Cadastro de novo usuário do sistema"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/usuarios"><ArrowLeft size={14} className="mr-1" /> Voltar</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Construction className="text-amber-500" size={40} />
          <h2 className="text-lg font-semibold">Formulário em construção</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            O cadastro direto de usuário será disponibilizado em breve. Por enquanto, usuários se cadastram via tela de autenticação
            e podem ter papéis atribuídos em <Link to="/admin/papel" className="text-primary underline">Papéis e Permissões</Link>.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}