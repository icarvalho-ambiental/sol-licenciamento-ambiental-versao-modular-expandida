import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/sol/auth";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck, Search, UserCheck, UserX } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateRole, adminDeleteRole, adminSetRolePermission,
  adminListUsers, adminAssignRoleByCpf, adminRemoveUserRole,
} from "@/lib/sol/admin-functions";

export const Route = createFileRoute("/admin/papel")({ component: AdminPapel });

type Role = { id: string; nome: string; descricao: string | null; sistema: boolean };
type Perm = { key: string; descricao: string; modulo: string };
type UserRow = { user_id: string; nome_completo: string; cpf: string | null; email: string; email_validado: boolean; roles: { role_id: string; nome: string }[] };

function AdminPapel() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (user && user.role !== "admin") nav({ to: "/" }); }, [user]);

  return (
    <AppShell>
      <PageHeader title="Papéis e Permissões" subtitle="Crie papéis, defina permissões e atribua a usuários pelo CPF."/>
      <Tabs defaultValue="roles">
        <TabsList className="mb-4">
          <TabsTrigger value="roles">Papéis</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de permissões</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="roles"><RolesTab/></TabsContent>
        <TabsContent value="matrix"><MatrixTab/></TabsContent>
        <TabsContent value="users"><UsersTab/></TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ---------- Roles ----------
function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const createRole = useServerFn(adminCreateRole);
  const deleteRole = useServerFn(adminDeleteRole);

  const load = async () => {
    const { data } = await supabase.from("roles").select("*").order("nome");
    setRoles((data ?? []) as Role[]);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createRole({ data: { nome, descricao } }); toast.success("Papel criado."); setNome(""); setDescricao(""); setOpen(false); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este papel?")) return;
    try { await deleteRole({ data: { role_id: id } }); toast.success("Papel removido."); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Papéis do sistema</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus size={14}/> Novo papel</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar novo papel</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-1.5"><Label>Nome técnico *</Label>
                <Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="ex: analista, consultor, gestor"/></div>
              <div className="space-y-1.5"><Label>Descrição</Label>
                <Input value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Descrição do papel"/></div>
              <DialogFooter><Button type="submit">Criar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">Nome</th><th>Descrição</th><th>Tipo</th><th></th></tr>
          </thead>
          <tbody>{roles.map(r => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 font-medium">{r.nome}</td>
              <td className="text-muted-foreground">{r.descricao ?? "—"}</td>
              <td>{r.sistema ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Sistema</span> : <span className="text-xs text-muted-foreground">Customizado</span>}</td>
              <td className="text-right">
                {!r.sistema && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)} className="text-destructive">
                    <Trash2 size={14}/>
                  </Button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ---------- Matrix ----------
function MatrixTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [grants, setGrants] = useState<Set<string>>(new Set()); // `${role_id}:${perm_key}`
  const setPerm = useServerFn(adminSetRolePermission);

  const load = async () => {
    const [{ data: r }, { data: p }, { data: rp }] = await Promise.all([
      supabase.from("roles").select("*").order("nome"),
      supabase.from("permissions").select("*").order("modulo, key"),
      supabase.from("role_permissions").select("role_id, permission_key"),
    ]);
    setRoles((r ?? []) as Role[]);
    setPerms((p ?? []) as Perm[]);
    setGrants(new Set((rp ?? []).map((x: any) => `${x.role_id}:${x.permission_key}`)));
  };
  useEffect(() => { load(); }, []);

  const toggle = async (role: Role, perm: Perm, enabled: boolean) => {
    const key = `${role.id}:${perm.key}`;
    setGrants(prev => { const n = new Set(prev); enabled ? n.add(key) : n.delete(key); return n; });
    try { await setPerm({ data: { role_id: role.id, permission_key: perm.key, enabled } }); }
    catch (err: any) { toast.error(err.message); load(); }
  };

  const byModulo = useMemo(() => {
    const m: Record<string, Perm[]> = {};
    perms.forEach(p => (m[p.modulo] ||= []).push(p));
    return m;
  }, [perms]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16}/> Matriz de permissões</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="py-2 pr-4 text-xs uppercase text-muted-foreground">Permissão</th>
              {roles.map(r => <th key={r.id} className="px-2 text-center text-xs font-semibold">{r.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byModulo).map(([modulo, ps]) => (
              <>
                <tr key={`g-${modulo}`} className="bg-muted/40">
                  <td colSpan={roles.length + 1} className="py-1.5 pl-2 text-xs font-semibold text-muted-foreground">{modulo}</td>
                </tr>
                {ps.map(p => (
                  <tr key={p.key} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{p.descricao}</div>
                      <div className="text-xs text-muted-foreground">{p.key}</div>
                    </td>
                    {roles.map(r => {
                      const checked = grants.has(`${r.id}:${p.key}`);
                      const disabled = r.nome === "admin";
                      return (
                        <td key={r.id} className="text-center">
                          <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => toggle(r, p, !!v)}/>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ---------- Users ----------
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [q, setQ] = useState("");
  const [selRole, setSelRole] = useState<Record<string, string>>({});
  const listUsers = useServerFn(adminListUsers);
  const assign = useServerFn(adminAssignRoleByCpf);
  const removeRole = useServerFn(adminRemoveUserRole);

  const load = async () => {
    try {
      const [u, { data: r }] = await Promise.all([
        listUsers(),
        supabase.from("roles").select("*").order("nome"),
      ]);
      setUsers(u as UserRow[]);
      setRoles((r ?? []) as Role[]);
    } catch (err: any) { toast.error(err.message); }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (u.nome_completo?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || (u.cpf || "").includes(s.replace(/\D/g, "")));
  });

  const onAssign = async (u: UserRow) => {
    const role_id = selRole[u.user_id];
    if (!role_id) return toast.error("Selecione um papel.");
    if (!u.cpf) return toast.error("Usuário sem CPF cadastrado.");
    try { await assign({ data: { cpf: u.cpf, role_id } }); toast.success(`Papel atribuído a ${u.nome_completo}.`); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const onRemove = async (u: UserRow, role_id: string) => {
    try { await removeRole({ data: { user_id: u.user_id, role_id } }); toast.success("Papel removido."); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Usuários do sistema</CardTitle>
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por CPF, nome ou e-mail..." className="pl-9"/>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="py-2">Nome</th><th>CPF</th><th>E-mail</th><th>Status</th><th>Papéis</th><th>Atribuir</th></tr>
          </thead>
          <tbody>{filtered.map(u => (
            <tr key={u.user_id} className="border-b last:border-0 align-top">
              <td className="py-2 font-medium">{u.nome_completo}</td>
              <td>{u.cpf ?? <span className="text-muted-foreground">—</span>}</td>
              <td>{u.email}</td>
              <td>
                {u.email_validado
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"><UserCheck size={12}/> Validado</span>
                  : <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"><UserX size={12}/> Pendente</span>}
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {u.roles.map(r => (
                    <span key={r.role_id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {r.nome}
                      {r.nome !== "externo" && (
                        <button onClick={() => onRemove(u, r.role_id)} className="hover:text-destructive"><Trash2 size={10}/></button>
                      )}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Select value={selRole[u.user_id] ?? ""} onValueChange={(v) => setSelRole(s => ({ ...s, [u.user_id]: v }))}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Selecionar papel..."/></SelectTrigger>
                    <SelectContent>{roles.filter(r=>r.nome!=="externo").map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" disabled={!u.email_validado} title={!u.email_validado ? "Usuário precisa validar o e-mail antes" : ""} onClick={() => onAssign(u)}>Atribuir</Button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}