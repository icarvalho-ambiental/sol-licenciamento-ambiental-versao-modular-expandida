import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("modules")
      .select("id, chave, nome, descricao, icone, core, ordem")
      .order("ordem");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenant_users")
      .select("tenant_id, ativo, tenants(id, nome, slug, ativo)")
      .eq("user_id", context.userId)
      .eq("ativo", true);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((r: any) => r.tenants)
      .filter((t: any) => t && t.ativo);
  });

export const listTenantModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tenant_modules")
      .select("module_id, habilitado, modules(chave, nome, ordem, core)")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setTenantModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      moduleId: z.string().uuid(),
      habilitado: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verifica se é host_admin via RPC
    const { data: isHost } = await context.supabase.rpc("is_host_admin", { _user_id: context.userId });
    if (!isHost) throw new Error("Apenas administradores da plataforma podem alterar módulos.");
    const { error } = await context.supabase
      .from("tenant_modules")
      .upsert(
        { tenant_id: data.tenantId, module_id: data.moduleId, habilitado: data.habilitado, habilitado_por: context.userId },
        { onConflict: "tenant_id,module_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });