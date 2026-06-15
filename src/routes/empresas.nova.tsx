import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createEmpresa } from "@/lib/sol/sol-functions";
import { toast } from "sonner";
import { CepLookup } from "@/components/sol/CepLookup";

export const Route = createFileRoute("/empresas/nova")({ component: Nova });

function Nova() {
  const nav = useNavigate();
  const fn = useServerFn(createEmpresa);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ cnpj: "", razaoSocial: "", nomeFantasia: "", email: "", telefone: "" });
  // Endereço é exibido para uso operacional / referência; não persiste em pessoa jurídica neste MVP.
  const [endereco, setEndereco] = useState({ cep: "", logradouro: "", bairro: "", cidade: "", uf: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fn({ data: form });
      toast.success("Empresa cadastrada.");
      nav({ to: "/empresas" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const updEnd = (k: keyof typeof endereco) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEndereco((s) => ({ ...s, [k]: e.target.value }));

  return (
    <AppShell>
      <PageHeader title="Nova Empresa" subtitle="Cadastro de pessoa jurídica." breadcrumb={["Empresas","Nova"]}/>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Razão Social *</Label>
              <Input required value={form.razaoSocial} onChange={upd("razaoSocial")}/></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label>
              <Input value={form.nomeFantasia} onChange={upd("nomeFantasia")}/></div>
            <div className="space-y-2"><Label>CNPJ *</Label>
              <Input required placeholder="00.000.000/0001-00" value={form.cnpj} onChange={upd("cnpj")}/></div>
            <div className="space-y-2"><Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={upd("email")}/></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={form.telefone} onChange={upd("telefone")}/></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <CepLookup onResolved={(info) => setEndereco({
                cep: info.cep, logradouro: info.street, bairro: info.neighborhood,
                cidade: info.city, uf: info.state,
              })} />
            </div>
            <div className="space-y-2"><Label>Logradouro</Label><Input value={endereco.logradouro} onChange={updEnd("logradouro")}/></div>
            <div className="space-y-2"><Label>Bairro</Label><Input value={endereco.bairro} onChange={updEnd("bairro")}/></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={endereco.cidade} onChange={updEnd("cidade")}/></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={endereco.uf} onChange={updEnd("uf")}/></div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Sócios, representante legal e procurador podem ser adicionados após salvar.
        </p>
        <div className="flex justify-end gap-2">
          <Link to="/empresas"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar empresa"}</Button>
        </div>
      </form>
    </AppShell>
  );
}