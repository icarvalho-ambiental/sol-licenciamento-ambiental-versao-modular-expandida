import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, UserCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createEmpreendimento, listEmpresasSimple } from "@/lib/sol/sol-functions";
import { toast } from "sonner";
import CepramPicker, { type CepramSelection } from "@/components/sol/CepramPicker";
import EmpreendimentoMap, { type MapValue } from "@/components/sol/EmpreendimentoMap";
import CpfVinculoField from "@/components/sol/CpfVinculoField";
import MunicipioPicker, { type MunicipioOption } from "@/components/sol/MunicipioPicker";

export const Route = createFileRoute("/empreendimentos/novo")({
  head: () => ({ meta: [{ title: "Novo Empreendimento" }] }),
  component: Novo,
});

function Novo() {
  const nav = useNavigate();
  const createFn = useServerFn(createEmpreendimento);
  const empresasFn = useServerFn(listEmpresasSimple);
  const { data: empresas = [] } = useQuery({ queryKey: ["empresas-simple"], queryFn: () => empresasFn() });

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    empresaId: "",
    nome: "",
    descricao: "",
    tipoCadastro: "direto" as "direto" | "pj",
    tipoImovel: "urbano" as "urbano" | "rural" | "misto",
    areaConservacao: "nao",
    telefone: "",
    email: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cep: "",
    uf: "",
    cpfAdministrador: "",
    cpfConsultor: "",
  });
  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [municipio, setMunicipio] = useState<MunicipioOption | null>(null);
  const [cepram, setCepram] = useState<CepramSelection>({});
  const [map, setMap] = useState<MapValue>({});

  function aplicarEndereco(info: { cep?: string; street?: string; neighborhood?: string; city?: string; state?: string }) {
    setForm((f) => ({
      ...f,
      logradouro: info.street ?? f.logradouro,
      bairro: info.neighborhood ?? f.bairro,
      cep: info.cep ? info.cep.replace(/\D/g, "") : f.cep,
      uf: info.state ?? f.uf,
    }));
    if (info.city && info.state && !municipio) {
      toast.message(`Município preenchido: ${info.city}/${info.state}. Selecione no campo Município para confirmar.`);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.tipoCadastro === "pj" && !form.empresaId) {
      return toast.error("Selecione a empresa.");
    }
    if (form.tipoCadastro === "direto" && !form.cpfAdministrador.trim()) {
      return toast.error("Informe o CPF do Administrador.");
    }
    if (!form.nome.trim()) return toast.error("Informe o nome do empreendimento.");
    setBusy(true);
    try {
      await createFn({
        data: {
          empresaId: form.tipoCadastro === "pj" ? form.empresaId : undefined,
          nome: form.nome,
          descricao: form.descricao || undefined,
          tipoCadastro: form.tipoCadastro,
          tipoImovel: form.tipoImovel,
          areaConservacao: form.areaConservacao || undefined,
          telefone: form.telefone || undefined,
          email: form.email || undefined,
          logradouro: form.logradouro || undefined,
          numero: form.numero || undefined,
          complemento: form.complemento || undefined,
          bairro: form.bairro || undefined,
          cep: form.cep || undefined,
          uf: form.uf || undefined,
          cpfAdministrador: form.cpfAdministrador || undefined,
          cpfConsultor: form.cpfConsultor || undefined,
          tipologiaId: cepram.tipologiaId,
          valorMedida: cepram.valorMedida,
          unidadeMedida: cepram.unidadeMedida,
          potencialPoluidor: cepram.potencialPoluidor,
          porte: cepram.porte,
          classe: cepram.classe,
          latitude: map.latitude,
          longitude: map.longitude,
          utmZona: map.utmZona,
          utmEasting: map.utmEasting,
          utmNorthing: map.utmNorthing,
        },
      });
      toast.success("Empreendimento cadastrado.");
      nav({ to: "/empreendimentos" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Novo Empreendimento" breadcrumb={["Empreendimentos", "Novo"]} />
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Empreendimento */}
        <Card>
          <CardHeader><CardTitle className="text-base">Empreendimento</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Cadastro *</Label>
              <Select value={form.tipoCadastro} onValueChange={(v: any) => upd("tipoCadastro")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">Cadastro Direto (baseado no meu CPF)</SelectItem>
                  <SelectItem value="pj">Cadastro Pessoa Jurídica (Empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipoCadastro === "pj" ? (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <div className="flex gap-2">
                  <Select value={form.empresaId} onValueChange={upd("empresaId")}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma empresa cadastrada..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          Nenhuma empresa cadastrada. Use o botão + para adicionar.
                        </div>
                      ) : (
                        empresas.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Link to="/empresas/nova" target="_blank">
                    <Button type="button" variant="outline" size="icon" title="Cadastrar nova empresa">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Origem do Cadastro</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Os dados serão migrados do CPF informado em <strong>Administrador</strong>.
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do Empreendimento *</Label>
              <Input required value={form.nome} onChange={(e) => upd("nome")(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Imóvel</Label>
              <Select value={form.tipoImovel} onValueChange={(v: any) => upd("tipoImovel")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urbano">Urbano</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área de Conservação</Label>
              <Select value={form.areaConservacao} onValueChange={upd("areaConservacao")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => upd("descricao")(e.target.value)} />
            </div>
            <div><CpfVinculoField label="CPF do Administrador" value={form.cpfAdministrador}
              onChange={(v) => upd("cpfAdministrador")(v)} /></div>
            <div><CpfVinculoField label="CPF do Consultor Ambiental" value={form.cpfConsultor}
              onChange={(v) => upd("cpfConsultor")(v)} /></div>
          </CardContent>
        </Card>

        {/* Dados de Contato */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados de Contato</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => upd("telefone")(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => upd("email")(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2"><Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => upd("logradouro")(e.target.value)} /></div>
            <div className="space-y-2"><Label>Número</Label>
              <Input value={form.numero} onChange={(e) => upd("numero")(e.target.value)} /></div>
            <div className="space-y-2"><Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => upd("complemento")(e.target.value)} /></div>
            <div className="space-y-2"><Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => upd("bairro")(e.target.value)} /></div>
            <div className="space-y-2"><Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => upd("cep")(e.target.value)} maxLength={9} /></div>
            <div className="md:col-span-2">
              <MunicipioPicker value={municipio} onChange={setMunicipio} uf={form.uf || undefined} />
            </div>
            <div className="space-y-2"><Label>UF</Label>
              <Input value={form.uf} onChange={(e) => upd("uf")(e.target.value.toUpperCase())} maxLength={2} /></div>
          </CardContent>
        </Card>

        {/* Classificação CEPRAM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classificação do Empreendimento — CEPRAM 4.579</CardTitle>
          </CardHeader>
          <CardContent>
            <CepramPicker value={cepram} onChange={setCepram} />
          </CardContent>
        </Card>

        {/* SIGWeb */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SIGWeb — Localização Georreferenciada</CardTitle>
          </CardHeader>
          <CardContent>
            <EmpreendimentoMap value={map} onChange={setMap} onAddressResolved={aplicarEndereco} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/empreendimentos"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </AppShell>
  );
}