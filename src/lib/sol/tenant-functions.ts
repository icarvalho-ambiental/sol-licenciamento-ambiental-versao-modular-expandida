import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

// ---------- Tenants ----------
export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenants")
      .select("id, nome, slug, ativo, criado_em, tipo_cliente, cnpj, uf, codigo_ibge, responsavel_nome, responsavel_email, razao_social, nome_fantasia, responsavel_telefone")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const tenantInputSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  slug: z.string().trim().optional(),
  tipoCliente: z.enum(["municipio", "consorcio_publico"]).default("municipio"),
  cnpj: z.string().trim().optional(),
  uf: z.string().trim().length(2).optional(),
  codigoIbge: z.string().trim().regex(/^\d{7}$/).optional(),
  razaoSocial: z.string().trim().max(200).optional(),
  nomeFantasia: z.string().trim().max(200).optional(),
  responsavelNome: z.string().trim().max(160).optional(),
  responsavelEmail: z.string().trim().email().optional().or(z.literal("")),
  responsavelTelefone: z.string().trim().max(40).optional(),
});

function toTenantRow(d: Partial<z.infer<typeof tenantInputSchema>>) {
  const row: Record<string, unknown> = {};
  if (d.nome !== undefined) row.nome = d.nome;
  if (d.tipoCliente !== undefined) row.tipo_cliente = d.tipoCliente;
  if (d.cnpj !== undefined) row.cnpj = d.cnpj ? d.cnpj.replace(/\D/g, "") : null;
  if (d.uf !== undefined) row.uf = d.uf ? d.uf.toUpperCase() : null;
  if (d.codigoIbge !== undefined) row.codigo_ibge = d.codigoIbge ?? null;
  if (d.razaoSocial !== undefined) row.razao_social = d.razaoSocial ?? null;
  if (d.nomeFantasia !== undefined) row.nome_fantasia = d.nomeFantasia ?? null;
  if (d.responsavelNome !== undefined) row.responsavel_nome = d.responsavelNome ?? null;
  if (d.responsavelEmail !== undefined) row.responsavel_email = d.responsavelEmail || null;
  if (d.responsavelTelefone !== undefined) row.responsavel_telefone = d.responsavelTelefone ?? null;
  return row;
}

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const slug = (data.slug && slugify(data.slug)) || slugify(data.nome);
    if (!slug) throw new Error("Slug inválido");
    const insertRow = { slug, ...toTenantRow(data) };
    const { data: created, error } = await context.supabase
      .from("tenants").insert(insertRow as any)
      .select("id, nome, slug, ativo, tipo_cliente, cnpj, uf, codigo_ibge, responsavel_nome")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    tenantInputSchema.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const row = toTenantRow(rest);
    if (Object.keys(row).length === 0) return { ok: true };
    const { error } = await context.supabase.from("tenants").update(row as any).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTenantAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenants").update({ ativo: data.ativo }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Tenant Users ----------
export const listTenantUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tenant_users")
      .select("id, user_id, role_id, ativo, criado_em, roles(nome)")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    const userIds = (rows ?? []).map((r: any) => r.user_id);
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: p } = await context.supabase
        .from("profiles")
        .select("user_id, nome_completo, email, cpf, email_validado, verificado")
        .in("user_id", userIds);
      profiles = p ?? [];
    }
    const map = new Map(profiles.map((p) => [p.user_id, p]));
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      roleId: r.role_id,
      roleNome: r.roles?.nome,
      ativo: r.ativo,
      profile: map.get(r.user_id) ?? null,
    }));
  });

export const addTenantUserByCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      cpf: z.string().trim().min(11).max(14),
      roleNome: z.string().trim().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("user_id, email_validado, nome_completo")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!profile) throw new Error("Usuário com este CPF não encontrado.");
    if (!profile.email_validado) throw new Error("Usuário ainda não validou o e-mail.");

    const { data: role } = await context.supabase
      .from("roles").select("id").eq("nome", data.roleNome).maybeSingle();
    if (!role) throw new Error("Papel inexistente.");

    const { error } = await context.supabase.from("tenant_users").insert({
      tenant_id: data.tenantId,
      user_id: profile.user_id,
      role_id: role.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true, nome: profile.nome_completo };
  });

export const removeTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenant_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Cidades ----------
export const listCidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cidades").select("id, nome, uf").order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ nome: z.string().trim().min(2).max(120), uf: z.string().trim().length(2) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cidades").insert({ nome: data.nome, uf: data.uf.toUpperCase() })
      .select("id, nome, uf").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listTenantCidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tenant_cidades").select("cidade_id, cidades(id, nome, uf)").eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => r.cidades).filter(Boolean);
  });

export const linkTenantCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), cidadeId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenant_cidades").insert({
      tenant_id: data.tenantId, cidade_id: data.cidadeId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unlinkTenantCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), cidadeId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenant_cidades").delete()
      .eq("tenant_id", data.tenantId).eq("cidade_id", data.cidadeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Selo verificado ----------
export const setProfileVerificado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), verificado: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ verificado: data.verificado, verificado_em: data.verificado ? new Date().toISOString() : null })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Roles disponíveis ----------
export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("roles").select("id, nome, descricao").order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });