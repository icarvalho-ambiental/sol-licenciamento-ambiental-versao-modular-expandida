import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export type ApiAuth = { tenantId: string; scopes: string[]; tokenId: string };

const RATE_LIMIT_PER_MINUTE = 120;

function clientIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    null
  );
}

export async function logApiRequest(opts: {
  tenantId: string;
  tokenId: string | null;
  request: Request;
  status: number;
  startedAt: number;
  scopes?: string[];
}) {
  try {
    const url = new URL(opts.request.url);
    await supabaseAdmin.from("api_request_log").insert({
      tenant_id: opts.tenantId,
      token_id: opts.tokenId,
      rota: url.pathname,
      metodo: opts.request.method,
      status: opts.status,
      latencia_ms: Date.now() - opts.startedAt,
      ip: clientIp(opts.request),
      user_agent: opts.request.headers.get("user-agent"),
      escopos: opts.scopes ?? null,
    });
  } catch { /* nunca falhar a resposta por causa do log */ }
}

export async function authenticateApiRequest(request: Request): Promise<ApiAuth | { error: Response }> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "missing_token" }), { status: 401, headers: { "content-type": "application/json", ...CORS_HEADERS } }) };
  }
  const token = auth.slice(7).trim();
  const hash = await sha256Hex(token);
  const { data, error } = await supabaseAdmin.rpc("api_token_validate", { _token_hash: hash });
  if (error || !data || data.length === 0) {
    return { error: new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { "content-type": "application/json", ...CORS_HEADERS } }) };
  }
  const row = data[0] as any;
  // rate-limit por token (janela 60s)
  const { data: count } = await supabaseAdmin.rpc("api_rate_check", { _token_id: row.token_id, _window_seconds: 60 });
  if (typeof count === "number" && count >= RATE_LIMIT_PER_MINUTE) {
    return {
      error: new Response(JSON.stringify({ error: "rate_limited", limit: RATE_LIMIT_PER_MINUTE }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "60",
          "x-ratelimit-limit": String(RATE_LIMIT_PER_MINUTE),
          ...CORS_HEADERS,
        },
      }),
    };
  }
  await supabaseAdmin.from("api_tokens").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", row.token_id);
  return { tenantId: row.tenant_id, scopes: row.escopos ?? [], tokenId: row.token_id };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
} as const;

export function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

/** Verifica se o token possui ao menos um dos escopos exigidos. Aceita curinga `*`. */
export function requireScope(auth: ApiAuth, required: string): Response | null {
  if (!auth.scopes || auth.scopes.length === 0) {
    return new Response(JSON.stringify({ error: "missing_scope", required }), {
      status: 403,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }
  if (auth.scopes.includes("*") || auth.scopes.includes(required)) return null;
  return new Response(JSON.stringify({ error: "insufficient_scope", required, granted: auth.scopes }), {
    status: 403,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}