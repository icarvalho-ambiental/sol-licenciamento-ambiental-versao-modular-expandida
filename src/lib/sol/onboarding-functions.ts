import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);

/** Status do onboarding do usuário atual. */
export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: tenants }, { data: profile }] = await Promise.all([
      context.supabase.from("tenant_users").select("tenant_id, tenants(nome, slug, ativo)")
        .eq("user_id", context.userId).eq("ativo", true),
      context.supabase.from("profiles").select("termos_aceitos_em, termos_versao").eq("user_id", context.userId).maybeSingle(),
    ]);
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role_nome: "admin" });
    return {
      tenants: tenants ?? [],
      isAppAdmin: !!isAdmin,
      termosAceitos: !!profile?.termos_aceitos_em,
      termosVersao: profile?.termos_versao ?? null,
    };
  });

/** Cria o primeiro cliente e vincula o usuário atual como admin. */
export const bootstrapTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    nome: z.string().trim().min(2).max(160),
    slug: z.string().trim().optional(),
    tipoCliente: z.enum(["municipio","consorcio_publico"]).default("municipio"),
    cnpj: z.string().trim().optional(),
    uf: z.string().trim().length(2).optional(),
    codigoIbge: z.string().trim().regex(/^\d{7}$/).optional(),
    razaoSocial: z.string().trim().max(200).optional(),
    nomeFantasia: z.string().trim().max(200).optional(),
    responsavelNome: z.string().trim().max(160).optional(),
    responsavelEmail: z.string().trim().email().optional().or(z.literal("")),
    responsavelTelefone: z.string().trim().max(40).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Autorização: requer ser admin global
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role_nome: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores podem criar clientes.");

    const tslug = data.slug?.trim() ? slug(data.slug) : slug(data.nome);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const insertRow: Record<string, unknown> = {
      nome: data.nome, slug: tslug, ativo: true,
      tipo_cliente: data.tipoCliente,
      cnpj: data.cnpj ? data.cnpj.replace(/\D/g,"") : null,
      uf: data.uf ? data.uf.toUpperCase() : null,
      codigo_ibge: data.codigoIbge ?? null,
      razao_social: data.razaoSocial ?? null,
      nome_fantasia: data.nomeFantasia ?? null,
      responsavel_nome: data.responsavelNome ?? null,
      responsavel_email: data.responsavelEmail || null,
      responsavel_telefone: data.responsavelTelefone ?? null,
    };
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants").insert(insertRow as any)
      .select("id, nome, slug").single();
    if (error) throw new Error(error.message);

    // role admin
    const { data: role } = await supabaseAdmin.from("roles").select("id").eq("nome", "admin").single();
    if (role) {
      await supabaseAdmin.from("tenant_users").insert({
        tenant_id: tenant.id, user_id: context.userId, role_id: role.id, ativo: true,
      });
    }
    return tenant;
  });

/** Convida usuário (por e-mail) para o locatário ativo. Se já cadastrado, vincula direto. */
export const inviteTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    roleNome: z.string().default("externo"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // tenant ativo do convidante
    const { data: tu } = await context.supabase.from("tenant_users")
      .select("tenant_id").eq("user_id", context.userId).eq("ativo", true)
      .order("criado_em", { ascending: true }).limit(1).maybeSingle();
    if (!tu) throw new Error("Você precisa estar vinculado a um cliente para convidar usuários.");
    const tenantId = tu.tenant_id;

    const hasPerm = await context.supabase
      .rpc("tenant_has_permission", { _user_id: context.userId, _tenant_id: tenantId, _permission_key: "tenant.convidar_usuario" });
    if (!hasPerm.data) throw new Error("Sem permissão para convidar usuários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin.from("roles").select("id").eq("nome", data.roleNome).maybeSingle();
    if (!role) throw new Error("Papel inválido.");

    // Já existe perfil com este e-mail?
    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("user_id, email_validado, nome_completo").eq("email", data.email).maybeSingle();

    if (profile) {
      if (!profile.email_validado) throw new Error("Usuário existe mas ainda não validou o e-mail.");
      const { error } = await supabaseAdmin.from("tenant_users").insert({
        tenant_id: tenantId, user_id: profile.user_id, role_id: role.id, ativo: true,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      return { ok: true, status: "linked", nome: profile.nome_completo };
    }

    // Cria convite enviando magic link
    const redirectTo = `${process.env.SUPABASE_URL?.includes("localhost") ? "http://localhost:5173" : ""}/login`;
    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { invited_tenant_id: tenantId, invited_role: data.roleNome },
      redirectTo: redirectTo || undefined,
    });
    if (invErr) throw new Error(invErr.message);
    return { ok: true, status: "invited" };
  });

/** Registra aceite dos termos para o usuário atual. */
export const acceptTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versao: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles")
      .update({ termos_aceitos_em: new Date().toISOString(), termos_versao: data.versao })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });