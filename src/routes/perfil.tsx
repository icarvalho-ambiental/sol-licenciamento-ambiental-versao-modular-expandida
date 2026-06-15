import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/sol/auth";
import { toast } from "sonner";
import { CepLookup } from "@/components/sol/CepLookup";
import { useState } from "react";

export const Route = createFileRoute("/perfil")({ component: Perfil });
function Perfil() {
  const { user } = useAuth();
  const [end, setEnd] = useState({ cep:"", logradouro:"", bairro:"", cidade:"", uf:"" });
  if (!user) return null;
  return (
    <AppShell>
      <PageHeader title="Meu Perfil" subtitle="Dados pessoais e preferências de acesso."/>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card><CardContent className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
            {user.nome[0]?.toUpperCase()}
          </div>
          <div className="font-semibold">{user.nome}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          <div className="mt-3 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark">
            {user.roleNames.length ? user.roleNames.join(", ") : "—"}
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Dados cadastrais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input defaultValue={user.nome}/></div>
            <div className="space-y-2"><Label>E-mail</Label><Input defaultValue={user.email}/></div>
            <div className="space-y-2"><Label>CPF</Label><Input placeholder="000.000.000-00"/></div>
            <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(71) 90000-0000"/></div>
            <div className="md:col-span-2">
              <CepLookup onResolved={(i) => setEnd({ cep:i.cep, logradouro:i.street, bairro:i.neighborhood, cidade:i.city, uf:i.state })}/>
            </div>
            <div className="space-y-2"><Label>Logradouro</Label><Input value={end.logradouro} onChange={(e)=>setEnd({...end, logradouro:e.target.value})}/></div>
            <div className="space-y-2"><Label>Bairro</Label><Input value={end.bairro} onChange={(e)=>setEnd({...end, bairro:e.target.value})}/></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={end.cidade} onChange={(e)=>setEnd({...end, cidade:e.target.value})}/></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={end.uf} onChange={(e)=>setEnd({...end, uf:e.target.value.toUpperCase()})}/></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={()=>toast.success("Dados atualizados.")}>Salvar alterações</Button></div>
          </CardContent></Card>
      </div>
    </AppShell>
  );
}