import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/sol/auth";
import {
  listTenants, createTenant, setTenantAtivo,
  listTenantUsers, addTenantUserByCpf, removeTenantUser,
  listCidades, createCidade, listTenantCidades, linkTenantCidade, unlinkTenantCidade,
  listRoles,
} from "@/lib/sol/tenant-functions";
import { toast } from "sonner";
import { Building2, MapPin, Users, Plus, Trash2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/host")({ component: HostPanel });

function HostPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!user.isHostAdmin) { navigate({ to: "/" }); }
  }, [user, loading, navigate]);

  if (loading || !user || !user.isHostAdmin) return null;

  const qc = useQueryClient();
  const fetchTenants = useServerFn(listTenants);
  const fetchRoles = useServerFn(listRoles);
  const doCreate = useServerFn(createTenant);
  const doToggle = useServerFn(setTenantAtivo);

  const tenantsQ = useQuery({ queryKey: ["host","tenants"], queryFn: () => fetchTenants() });
  const rolesQ = useQuery({ queryKey: ["host","roles"], queryFn: () => fetchRoles() });

  const [novoNome, setNovoNome] = useState("");
  const [novoSlug, setNovoSlug] = useState("");
  const createMut = useMutation({
    mutationFn: (v: { nome: string; slug?: string }) => doCreate({ data: v }),
    onSuccess: () => { toast.success("Cliente criado."); setNovoNome(""); setNovoSlug(""); qc.invalidateQueries({ queryKey: ["host","tenants"] }); },
    onError: (e: any) => toast.error(e.message || "Falha ao criar."),
  });
  const toggleMut = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => doToggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["host","tenants"] }),
  });

  const [selected, setSelected] = useState<string | null>(null);
  const selectedTenant = tenantsQ.data?.find((t: any) => t.id === selected) ?? null;

  return (
    <AppShell>
      <PageHeader title="Host — Gestão de Clientes" subtitle="Crie, ative ou desative clientes do SaaS." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 size={16}/>Clientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tenantsQ.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> :
              (tenantsQ.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nenhum cliente ainda.</div> :
              <div className="divide-y rounded-md border">
                {(tenantsQ.data ?? []).map((t: any) => (
                  <div key={t.id} className={`flex items-center justify-between gap-2 p-3 ${selected===t.id ? "bg-accent/40" : ""}`}>
                    <button onClick={() => setSelected(t.id)} className="flex-1 text-left">
                      <div className="font-medium">{t.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        /{t.slug} · {t.tipo_cliente === "consorcio_publico" ? "Consórcio Público" : "Município"}
                        {t.cnpj ? ` · CNPJ ${t.cnpj}` : ""}
                        {t.uf ? ` · ${t.uf}` : ""}
                        {t.codigo_ibge ? ` · IBGE ${t.codigo_ibge}` : ""}
                        {t.responsavel_nome ? ` · Resp.: ${t.responsavel_nome}` : ""}
                      </div>
                    </button>
                    <Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "ativo" : "inativo"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toggleMut.mutate({ id: t.id, ativo: !t.ativo })}>
                      {t.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                ))}
              </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus size={16}/>Novo cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cadastre Municípios ou Consórcios Públicos com CNPJ, UF, Código IBGE e
              dados do responsável na tela de Onboarding.
            </p>
            <Link to="/admin/onboarding"><Button className="w-full">Ir para Onboarding</Button></Link>
          </CardContent>
        </Card>
      </div>

      {selectedTenant && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TenantMembros tenantId={selectedTenant.id} tenantNome={selectedTenant.nome} roles={rolesQ.data ?? []} />
          <TenantCidadesCard tenantId={selectedTenant.id} />
        </div>
      )}
    </AppShell>
  );
}

function TenantMembros({ tenantId, tenantNome, roles }: { tenantId: string; tenantNome: string; roles: any[] }) {
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listTenantUsers);
  const doAdd = useServerFn(addTenantUserByCpf);
  const doRemove = useServerFn(removeTenantUser);
  const membersQ = useQuery({ queryKey: ["host","tu", tenantId], queryFn: () => fetchMembers({ data: { tenantId } }) });

  const [cpf, setCpf] = useState("");
  const [roleNome, setRoleNome] = useState<string>("");
  const visibleRoles = useMemo(() => roles.filter((r) => !["host_admin"].includes(r.nome)), [roles]);

  const addMut = useMutation({
    mutationFn: () => doAdd({ data: { tenantId, cpf, roleNome } }),
    onSuccess: (r: any) => { toast.success(`${r.nome ?? "Usuário"} vinculado.`); setCpf(""); qc.invalidateQueries({ queryKey: ["host","tu", tenantId] }); },
    onError: (e: any) => toast.error(e.message || "Falha."),
  });
  const rmMut = useMutation({
    mutationFn: (id: string) => doRemove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["host","tu", tenantId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users size={16}/>Membros · {tenantNome}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input placeholder="CPF (apenas usuários com e-mail validado)" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          <Select value={roleNome} onValueChange={setRoleNome}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Papel"/></SelectTrigger>
            <SelectContent>{visibleRoles.map((r) => <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={!cpf || !roleNome || addMut.isPending} onClick={() => addMut.mutate()}>Vincular</Button>
        </div>

        {membersQ.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> :
         (membersQ.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nenhum membro ainda.</div> :
          <div className="divide-y rounded-md border">
            {(membersQ.data ?? []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {m.profile?.nome_completo ?? m.userId}
                    {m.profile?.verificado && <ShieldCheck size={14} className="text-emerald-600" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.profile?.email} · CPF {m.profile?.cpf}</div>
                </div>
                <Badge variant="outline">{m.roleNome}</Badge>
                <Button size="icon" variant="ghost" onClick={() => rmMut.mutate(m.id)}><Trash2 size={14}/></Button>
              </div>
            ))}
          </div>
        }
      </CardContent>
    </Card>
  );
}

function TenantCidadesCard({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listCidades);
  const fetchLinked = useServerFn(listTenantCidades);
  const doCreate = useServerFn(createCidade);
  const doLink = useServerFn(linkTenantCidade);
  const doUnlink = useServerFn(unlinkTenantCidade);

  const allQ = useQuery({ queryKey: ["host","cidades"], queryFn: () => fetchAll() });
  const linkedQ = useQuery({ queryKey: ["host","tc", tenantId], queryFn: () => fetchLinked({ data: { tenantId } }) });

  const [nome, setNome] = useState(""); const [uf, setUf] = useState("");
  const [pickCid, setPickCid] = useState("");

  const createMut = useMutation({
    mutationFn: () => doCreate({ data: { nome, uf } }),
    onSuccess: () => { toast.success("Cidade criada."); setNome(""); setUf(""); qc.invalidateQueries({ queryKey: ["host","cidades"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const linkMut = useMutation({
    mutationFn: () => doLink({ data: { tenantId, cidadeId: pickCid } }),
    onSuccess: () => { setPickCid(""); qc.invalidateQueries({ queryKey: ["host","tc", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const unlinkMut = useMutation({
    mutationFn: (cidadeId: string) => doUnlink({ data: { tenantId, cidadeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["host","tc", tenantId] }),
  });

  const linkedIds = new Set((linkedQ.data ?? []).map((c: any) => c.id));
  const available = (allQ.data ?? []).filter((c: any) => !linkedIds.has(c.id));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin size={16}/>Cidades atendidas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={pickCid} onValueChange={setPickCid}>
            <SelectTrigger><SelectValue placeholder="Selecionar cidade existente"/></SelectTrigger>
            <SelectContent>{available.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome} / {c.uf}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={!pickCid || linkMut.isPending} onClick={() => linkMut.mutate()}>Vincular</Button>
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Cadastrar nova cidade</div>
          <div className="grid gap-2 sm:grid-cols-[2fr_80px_auto]">
            <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input placeholder="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            <Button variant="outline" disabled={!nome || uf.length !== 2 || createMut.isPending} onClick={() => createMut.mutate()}>Criar</Button>
          </div>
        </div>

        {(linkedQ.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma cidade vinculada.</div> :
          <div className="flex flex-wrap gap-2">
            {(linkedQ.data ?? []).map((c: any) => (
              <Badge key={c.id} variant="secondary" className="gap-1">
                {c.nome}/{c.uf}
                <button onClick={() => unlinkMut.mutate(c.id)} className="ml-1 opacity-70 hover:opacity-100"><Trash2 size={12}/></button>
              </Badge>
            ))}
          </div>
        }
      </CardContent>
    </Card>
  );
}