import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function activeTenant(supabase: any, userId: string) {
  const { data } = await supabase.from("tenant_users").select("tenant_id")
    .eq("user_id", userId).eq("ativo", true).order("criado_em", { ascending: true })
    .limit(1).maybeSingle();
  if (!data) throw new Error("Sem locatário ativo.");
  return data.tenant_id as string;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);

export const listRequerimentoTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await activeTenant(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("requerimento_tipos")
      .select("id, chave, nome, descricao, ativo, ordem")
      .eq("tenant_id", tenantId)
      .order("ordem").order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertRequerimentoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    nome: z.string().trim().min(2).max(120),
    chave: z.string().trim().optional(),
    descricao: z.string().trim().max(2000).optional(),
    ativo: z.boolean().default(true),
    ordem: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await activeTenant(context.supabase, context.userId);
    const payload: any = {
      tenant_id: tenantId,
      nome: data.nome,
      chave: data.chave?.trim() ? slug(data.chave) : slug(data.nome),
      descricao: data.descricao || null,
      ativo: data.ativo,
      ordem: data.ordem,
    };
    if (data.id) {
      const { error } = await context.supabase.from("requerimento_tipos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("requerimento_tipos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRequerimentoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("requerimento_tipos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTipoDocumentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tipoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("requerimento_tipo_documentos")
      .select("id, nome, descricao, obrigatorio, ordem")
      .eq("tipo_id", data.tipoId).order("ordem").order("nome");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertTipoDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    tipoId: z.string().uuid(),
    nome: z.string().trim().min(2).max(160),
    descricao: z.string().trim().max(2000).optional(),
    obrigatorio: z.boolean().default(true),
    ordem: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = {
      tipo_id: data.tipoId, nome: data.nome,
      descricao: data.descricao || null,
      obrigatorio: data.obrigatorio, ordem: data.ordem,
    };
    if (data.id) {
      const { error } = await context.supabase.from("requerimento_tipo_documentos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("requerimento_tipo_documentos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTipoDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("requerimento_tipo_documentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });