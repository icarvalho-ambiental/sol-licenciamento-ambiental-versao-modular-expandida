import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export const Route = createFileRoute("/api/public/v1/requerimentos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const started = Date.now();
        const { authenticateApiRequest, jsonOk, logApiRequest, requireScope } = await import("@/lib/api/auth.server");
        const auth = await authenticateApiRequest(request);
        if ("error" in auth) return auth.error;
        const scopeErr = requireScope(auth, "requerimentos:read");
        if (scopeErr) {
          await logApiRequest({ tenantId: auth.tenantId, tokenId: auth.tokenId, request, status: 403, startedAt: started, scopes: auth.scopes });
          return scopeErr;
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
        const status = url.searchParams.get("status");
        let q = supabaseAdmin.from("requerimentos")
          .select("id, titulo, tipo, status, numero_processo, criado_em, prazo_em")
          .eq("tenant_id", auth.tenantId).order("criado_em", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status as any);
        const { data, error } = await q;
        const httpStatus = error ? 500 : 200;
        await logApiRequest({ tenantId: auth.tenantId, tokenId: auth.tokenId, request, status: httpStatus, startedAt: started, scopes: auth.scopes });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json", ...CORS } });
        return jsonOk({ data });
      },
    },
  },
});