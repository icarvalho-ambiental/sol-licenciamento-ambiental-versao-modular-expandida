import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listIntegrationProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integration_providers")
      .select("key, nome, categoria, ativo")
      .order("categoria").order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listIntegrationConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("integration_configs")
      .select("id, provider_key, habilitado, params, secret_ref, feature_flags, updated_at")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertIntegrationConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      providerKey: z.string().min(1).max(64),
      habilitado: z.boolean(),
      params: z.record(z.unknown()).default({}),
      secretRef: z.string().max(256).optional().nullable(),
      featureFlags: z.record(z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_configs")
      .upsert({
        tenant_id: data.tenantId,
        provider_key: data.providerKey,
        habilitado: data.habilitado,
        params: data.params as never,
        secret_ref: data.secretRef ?? null,
        feature_flags: data.featureFlags as never,
      }, { onConflict: "tenant_id,provider_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listIntegrationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      providerKey: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("integration_logs")
      .select("id, provider_key, operacao, status, duracao_ms, erro, criado_em")
      .eq("tenant_id", data.tenantId)
      .order("criado_em", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.providerKey) q = q.eq("provider_key", data.providerKey);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });