import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOnboardingState, bootstrapTenant, inviteTenantUser } from "@/lib/sol/onboarding-functions";
import { searchMunicipios } from "@/lib/sol/municipios-functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Mail } from "lucide-react";

export const Route = createFileRoute("/admin/onboarding")({ component: Page });

function Page() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const stateFn = useServerFn(getOnboardingState);
  const bootstrapFn = useServerFn(bootstrapTenant);
  const inviteFn = useServerFn(inviteTenantUser);
  const searchMunFn = useServerFn(searchMunicipios);

  const { data, isLoading } = useQuery({ queryKey: ["onboarding-state"], queryFn: () => stateFn() });
  const [form, setForm] = useState({
    nome: "", slug: "",
    tipoCliente: "municipio" as "municipio" | "consorcio_publico",
    cnpj: "", uf: "", codigoIbge: "",
    razaoSocial: "", nomeFantasia: "",
    responsavelNome: "", responsavelEmail: "", responsavelTelefone: "",
  });
  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [munQuery, setMunQuery] = useState("");
  const munQ = useQuery({
    queryKey: ["munBusca", munQuery, form.uf],
    queryFn: () => searchMunFn({ data: { q: munQuery, uf: form.uf || undefined } }),
    enabled: form.tipoCliente === "municipio",
  });
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("externo");

  if (isLoading || !data) return <AppShell><PageHeader title="Carregando…"/></AppShell>;

  const temTenant = (data.tenants?.length ?? 0) > 0;

  async function criar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente.");
    if (form.tipoCliente === "municipio" && (!form.cnpj || !form.uf || !form.codigoIbge))
      return toast.error("Para Município, CNPJ, UF e Código IBGE são obrigatórios.");
    if (form.tipoCliente === "consorcio_publico" && !form.cnpj)
      return toast.error("Para Consórcio Público, o CNPJ é obrigatório.");
    setBusy(true);
    try {
      await bootstrapFn({ data: {
        nome: form.nome,
        slug: form.slug || undefined,
        tipoCliente: form.tipoCliente,
        cnpj: form.cnpj || undefined,
        uf: form.uf || undefined,
        codigoIbge: form.codigoIbge || undefined,
        razaoSocial: form.razaoSocial || undefined,
        nomeFantasia: form.nomeFantasia || undefined,
        responsavelNome: form.responsavelNome || undefined,
        responsavelEmail: form.responsavelEmail || undefined,
        responsavelTelefone: form.responsavelTelefone || undefined,
      } });
      toast.success("Cliente criado e módulos essenciais ativados.");
      qc.invalidateQueries({ queryKey: ["onboarding-state"] });
      setForm({ ...form, nome: "", slug: "", cnpj: "", codigoIbge: "", razaoSocial: "", nomeFantasia: "", responsavelNome: "", responsavelEmail: "", responsavelTelefone: "" });
      setTimeout(() => nav({ to: "/" }), 500);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function convidar() {
    if (!email.trim()) return toast.error("Informe o e-mail.");
    try {
      const r: any = await inviteFn({ data: { email, roleNome: role } });
      toast.success(r.status === "linked" ? `Usuário ${r.nome ?? ""} vinculado ao cliente.` : "Convite enviado por e-mail.");
      setEmail("");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <AppShell>
      <PageHeader title="Onboarding" subtitle="Crie o primeiro cliente (Município ou Consórcio Público) e convide usuários." breadcrumb={["Administração", "Onboarding"]}/>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 size={16}/> Clientes ativos</CardTitle></CardHeader>
          <CardContent>
            {temTenant ? (
              <ul className="space-y-2 text-sm">
                {data.tenants.map((t: any) => (
                  <li key={t.tenant_id} className="rounded-md border bg-card p-2">
                    <div className="font-medium">{t.tenants?.nome}</div>
                    <div className="text-xs text-muted-foreground">{t.tenants?.slug}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Crie o primeiro abaixo.</p>
            )}
            {data.isAppAdmin && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Tipo do Cliente *</Label>
                    <Select value={form.tipoCliente} onValueChange={(v) => upd("tipoCliente")(v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="municipio">Município</SelectItem>
                        <SelectItem value="consorcio_publico">Consórcio Público</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nome do Cliente *</Label><Input value={form.nome} onChange={e=>upd("nome")(e.target.value)} placeholder="Prefeitura Municipal de…"/></div>
                  <div><Label>Razão Social</Label><Input value={form.razaoSocial} onChange={e=>upd("razaoSocial")(e.target.value)}/></div>
                  <div><Label>Nome Fantasia</Label><Input value={form.nomeFantasia} onChange={e=>upd("nomeFantasia")(e.target.value)}/></div>
                  <div><Label>CNPJ {form.tipoCliente !== "consorcio_publico" ? "*" : "*"}</Label><Input value={form.cnpj} onChange={e=>upd("cnpj")(e.target.value)} placeholder="00.000.000/0000-00"/></div>
                  <div><Label>UF {form.tipoCliente === "municipio" && "*"}</Label><Input maxLength={2} value={form.uf} onChange={e=>upd("uf")(e.target.value.toUpperCase())}/></div>
                  {form.tipoCliente === "municipio" && (
                    <div className="sm:col-span-2">
                      <Label>Município (busca IBGE) *</Label>
                      <Input placeholder="Digite o nome para buscar…" value={munQuery} onChange={(e)=>setMunQuery(e.target.value)} />
                      {munQuery && (munQ.data?.length ?? 0) > 0 && (
                        <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-card text-sm">
                          {munQ.data!.map((m: any) => (
                            <button key={m.codigo_ibge} type="button"
                              onClick={() => { upd("codigoIbge")(m.codigo_ibge); upd("uf")(m.uf); setMunQuery(`${m.nome}/${m.uf}`); }}
                              className={`block w-full px-2 py-1 text-left hover:bg-accent ${form.codigoIbge===m.codigo_ibge ? "bg-accent/60" : ""}`}>
                              {m.nome}/{m.uf} <span className="text-xs text-muted-foreground">· IBGE {m.codigo_ibge}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">Código IBGE selecionado: <b>{form.codigoIbge || "—"}</b></div>
                    </div>
                  )}
                  <div><Label>Responsável (Nome)</Label><Input value={form.responsavelNome} onChange={e=>upd("responsavelNome")(e.target.value)}/></div>
                  <div><Label>Responsável (E-mail)</Label><Input type="email" value={form.responsavelEmail} onChange={e=>upd("responsavelEmail")(e.target.value)}/></div>
                  <div><Label>Responsável (Telefone)</Label><Input value={form.responsavelTelefone} onChange={e=>upd("responsavelTelefone")(e.target.value)}/></div>
                  <div><Label>Slug (opcional)</Label><Input value={form.slug} onChange={e=>upd("slug")(e.target.value)} placeholder="auto"/></div>
                </div>
                <Button onClick={criar} disabled={busy} className="w-full">Criar cliente e ativar módulos</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Mail size={16}/> Convidar usuário</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Se o e-mail já estiver cadastrado e validado, ele será vinculado imediatamente ao cliente ativo. Caso contrário, um convite é enviado.</p>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div><Label>Papel</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="externo">externo</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <Button onClick={convidar} disabled={!temTenant}>Convidar</Button>
            {!temTenant && <p className="text-xs text-amber-700">Crie um cliente primeiro.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}