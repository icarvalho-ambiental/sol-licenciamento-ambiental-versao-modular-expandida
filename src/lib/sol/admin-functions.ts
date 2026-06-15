import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role_nome: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem executar esta ação.");
}

export const adminCreateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    nome: z.string().trim().min(2).max(40).regex(/^[a-z0-9_\-]+$/i, "Use letras, números, _ ou -"),
    descricao: z.string().trim().max(200).optional().default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { data: row, error } = await supabase.from("roles")
      .insert({ nome: data.nome, descricao: data.descricao, criado_por: userId })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("roles").delete().eq("id", data.role_id).eq("sistema", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    role_id: z.string().uuid(),
    permission_key: z.string().min(1),
    enabled: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    if (data.enabled) {
      const { error } = await supabase.from("role_permissions")
        .upsert({ role_id: data.role_id, permission_key: data.permission_key });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("role_permissions")
        .delete()
        .eq("role_id", data.role_id)
        .eq("permission_key", data.permission_key);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nome_completo, cpf, email, telefone, email_validado, perfil_completo, criado_em")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: ur } = await supabase
      .from("user_roles")
      .select("user_id, role_id, roles(nome, descricao)");
    const byUser: Record<string, { role_id: string; nome: string; descricao: string | null }[]> = {};
    (ur ?? []).forEach((r: any) => {
      (byUser[r.user_id] ||= []).push({ role_id: r.role_id, nome: r.roles?.nome, descricao: r.roles?.descricao });
    });
    return (data ?? []).map((p) => ({ ...p, roles: byUser[p.user_id] ?? [] }));
  });

export const adminAssignRoleByCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    cpf: z.string().trim().min(11),
    role_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const cpfDigits = data.cpf.replace(/\D/g, "");
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, email_validado, nome_completo")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!prof) throw new Error("Nenhum usuário encontrado com este CPF.");
    if (!prof.email_validado) throw new Error("Usuário ainda não validou o e-mail.");

    const { error } = await supabase.from("user_roles")
      .insert({ user_id: prof.user_id, role_id: data.role_id, atribuido_por: userId });
    if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
    return { ok: true, nome: prof.nome_completo };
  });

export const adminRemoveUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), role_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("user_roles")
      .delete().eq("user_id", data.user_id).eq("role_id", data.role_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   GRADE ADMIN DE USUÁRIOS (com cliente/tenant)
============================================================ */

export const adminListUsuariosGrid = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const { data: profs, error } = await supabase
      .from("profiles")
      .select("user_id, nome_completo, email, email_validado, perfil_completo, criado_em")
      .order("nome_completo", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: ur } = await supabase
      .from("user_roles")
      .select("user_id, roles(nome)");
    const rolesByUser: Record<string, string[]> = {};
    (ur ?? []).forEach((r: any) => {
      if (r.roles?.nome) (rolesByUser[r.user_id] ||= []).push(r.roles.nome);
    });

    const { data: tu } = await supabase
      .from("tenant_users")
      .select("user_id, ativo, criado_em, tenants(nome)")
      .eq("ativo", true)
      .order("criado_em", { ascending: true });
    const tenantByUser: Record<string, string> = {};
    (tu ?? []).forEach((r: any) => {
      if (!tenantByUser[r.user_id] && r.tenants?.nome) tenantByUser[r.user_id] = r.tenants.nome;
    });

    return (profs ?? []).map((p: any) => {
      const rs = rolesByUser[p.user_id] ?? [];
      const perfilOrder = ["admin", "gac", "analista", "representante_legal", "tecnico", "externo"];
      const perfil = rs.sort((a, b) => {
        const ia = perfilOrder.indexOf(a); const ib = perfilOrder.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })[0] ?? "externo";
      return {
        id: p.user_id as string,
        nome: (p.nome_completo ?? "") as string,
        email: (p.email ?? "") as string,
        nomeUsuario: (p.email ?? "") as string,
        perfil,
        emailConfirmado: !!p.email_validado,
        verificado: !!p.perfil_completo,
        cliente: tenantByUser[p.user_id] ?? "—",
      };
    });
  });

export const adminDeleteUsuarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    if (data.ids.includes(userId)) {
      throw new Error("Você não pode excluir o próprio usuário.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const errors: string[] = [];
    for (const id of data.ids) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) errors.push(`${id}: ${error.message}`);
    }
    if (errors.length) throw new Error(errors.join("; "));
    return { ok: true, count: data.ids.length };
  });