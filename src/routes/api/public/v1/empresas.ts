import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export const Route = createFileRoute("/api/public/v1/empresas")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const started = Date.now();
        const { authenticateApiRequest, jsonOk, logApiRequest, requireScope } = await import("@/lib/api/auth.server");
        const auth = await authenticateApiRequest(request);
        if ("error" in auth) return auth.error;
        const scopeErr = requireScope(auth, "empresas:read");
        if (scopeErr) {
          await logApiRequest({ tenantId: auth.tenantId, tokenId: auth.tokenId, request, status: 403, startedAt: started, scopes: auth.scopes });
          return scopeErr;
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
        const { data, error } = await supabaseAdmin.from("empresas")
          .select("id, nome_fantasia, ativo, criado_em, pessoas_juridicas(cnpj, razao_social, email)")
          .eq("tenant_id", auth.tenantId).limit(limit);
        const status = error ? 500 : 200;
        await logApiRequest({ tenantId: auth.tenantId, tokenId: auth.tokenId, request, status, startedAt: started, scopes: auth.scopes });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json", ...CORS } });
        return jsonOk({ data });
      },
    },
  },
});