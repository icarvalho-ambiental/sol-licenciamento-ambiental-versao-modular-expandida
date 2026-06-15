import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lista as chaves de permissão do usuário no tenant ativo.
 * Host admin recebe wildcard "*" (autoriza tudo no front).
 */
export const listMyTenantPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).optional().parse(d))
  .handler(async ({ context }) => {
    const { data: isHost } = await context.supabase.rpc("is_host_admin", {
      _user_id: context.userId,
    });
    if (isHost) return ["*"];

    // Papéis globais (user_roles) — ex.: admin do sistema sem vínculo de tenant.
    const { data: ur, error: e0 } = await context.supabase
      .from("user_roles")
      .select("role_id, roles!inner(nome)")
      .eq("user_id", context.userId);
    if (e0) throw new Error(e0.message);
    const globalRoleIds = (ur ?? []).map((r: any) => r.role_id).filter(Boolean) as string[];
    const isAdminGlobal = (ur ?? []).some((r: any) => r.roles?.nome === "admin");
    if (isAdminGlobal) return ["*"];

    // Papéis no tenant ativo (header opcional X-Tenant-Id).
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const rawTenant = req?.headers.get("x-tenant-id") ?? null;
    const tenantId = rawTenant ? z.string().uuid().safeParse(rawTenant).data ?? null : null;
    let tenantRoleIds: string[] = [];
    if (tenantId) {
      const { data: tu, error: e1 } = await context.supabase
        .from("tenant_users")
        .select("role_id")
        .eq("user_id", context.userId)
        .eq("tenant_id", tenantId)
        .eq("ativo", true);
      if (e1) throw new Error(e1.message);
      tenantRoleIds = (tu ?? []).map((r) => r.role_id).filter(Boolean) as string[];
    }

    const roleIds = Array.from(new Set([...globalRoleIds, ...tenantRoleIds]));
    if (!roleIds.length) return [];

    const { data: rp, error: e2 } = await context.supabase
      .from("role_permissions")
      .select("permission_key")
      .in("role_id", roleIds);
    if (e2) throw new Error(e2.message);

    return Array.from(new Set((rp ?? []).map((r) => r.permission_key)));
  });