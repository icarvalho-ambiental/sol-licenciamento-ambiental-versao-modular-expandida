import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HEADER = "x-tenant-id";

/**
 * Client middleware (global): lê o tenant ativo do localStorage e anexa em
 * todas as chamadas de server function como header X-Tenant-Id.
 */
export const attachActiveTenant = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const id =
      typeof window !== "undefined"
        ? window.localStorage.getItem("sol.activeTenantId")
        : null;
    return next({ headers: id ? { [HEADER]: id } : {} });
  },
);

/**
 * Server middleware: valida o header X-Tenant-Id contra tenant_users
 * (ou aceita qualquer tenant se o usuário for host_admin) e expõe
 * context.tenantId. Use em server fns que dependem de um tenant ativo.
 */
export const withTenant = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const raw = req?.headers.get(HEADER) ?? null;
    const tenantId = raw ? z.string().uuid().safeParse(raw).data ?? null : null;
    if (!tenantId) throw new Error("Tenant ativo não informado (header X-Tenant-Id).");

    const { data: isHost } = await context.supabase.rpc("is_host_admin", { _user_id: context.userId });
    if (!isHost) {
      const { data: member } = await context.supabase
        .from("tenant_users")
        .select("id")
        .eq("user_id", context.userId)
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .maybeSingle();
      if (!member) throw new Error("Usuário não pertence ao locatário informado.");
    }

    return next({ context: { tenantId } });
  });