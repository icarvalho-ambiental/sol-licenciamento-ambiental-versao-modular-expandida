import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function getActiveTenantId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenant_users").select("tenant_id").eq("user_id", userId).eq("ativo", true)
    .order("criado_em", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sem locatário ativo.");
  return data.tenant_id as string;
}

/* ============== RELATÓRIOS ============== */

const ENTIDADES = ["empresas", "empreendimentos", "requerimentos", "condicionantes"] as const;

export const listRelatorios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("relatorios").select("*").order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; nome: string; descricao?: string; entidade: string; colunas: string[]; filtros: Record<string, any> }) =>
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      entidade: z.enum(ENTIDADES),
      colunas: z.array(z.string()).min(1),
      filtros: z.record(z.string(), z.any()).default({}),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const payload = {
      tenant_id: tenantId, nome: data.nome, descricao: data.descricao ?? null,
      entidade: data.entidade, colunas: data.colunas, filtros: data.filtros,
      criado_por: context.userId,
    };
    const q = data.id
      ? context.supabase.from("relatorios").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("relatorios").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("relatorios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rel, error } = await context.supabase.from("relatorios").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    let q: any;
    if (rel.entidade === "empresas") {
      q = context.supabase.from("empresas").select("id, nome_fantasia, ativo, criado_em, pessoas_juridicas(cnpj, razao_social, email)");
    } else if (rel.entidade === "empreendimentos") {
      q = context.supabase.from("empreendimentos").select("id, nome, endereco, ativo, criado_em, cidades(nome, uf)");
    } else if (rel.entidade === "requerimentos") {
      q = context.supabase.from("requerimentos").select("id, titulo, tipo, status, numero_processo, criado_em");
    } else {
      q = context.supabase.from("condicionantes").select("id, titulo, status, prazo, criado_em");
    }
    const filtros = (rel.filtros ?? {}) as Record<string, any>;
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== "") q = q.eq(k as any, v);
    }
    q = q.order("criado_em", { ascending: false }).limit(500);
    const { data: rows, error: e2 } = await q;
    if (e2) throw new Error(e2.message);
    return { definicao: rel, linhas: rows ?? [] };
  });

/* ============== PAINÉIS ============== */

export const listPaineis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("paineis").select("*").order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; nome: string; descricao?: string; cards: Array<{ titulo: string; entidade: string; filtro?: Record<string, any> }> }) =>
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      cards: z.array(z.object({
        titulo: z.string(),
        entidade: z.enum(ENTIDADES),
        filtro: z.record(z.string(), z.any()).optional(),
      })),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const payload = { tenant_id: tenantId, nome: data.nome, descricao: data.descricao ?? null, cards: data.cards, criado_por: context.userId };
    const q = data.id
      ? context.supabase.from("paineis").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("paineis").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const runPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: painel, error } = await context.supabase.from("paineis").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const cards = (painel.cards ?? []) as Array<{ titulo: string; entidade: string; filtro?: Record<string, any> }>;
    const results = await Promise.all(cards.map(async (c) => {
      let q: any = (context.supabase as any).from(c.entidade).select("id", { count: "exact", head: true });
      for (const [k, v] of Object.entries(c.filtro ?? {})) {
        if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
      }
      const { count, error: e2 } = await q;
      if (e2) return { titulo: c.titulo, valor: 0, erro: e2.message };
      return { titulo: c.titulo, valor: count ?? 0 };
    }));
    return { painel, valores: results };
  });

/* ============== PDF TEMPLATES ============== */

export const listPdfTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("pdf_templates").select("*").order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePdfTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; nome: string; tipo?: string; html: string; css?: string; ativo?: boolean }) =>
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1),
      tipo: z.string().default("requerimento"),
      html: z.string().min(1),
      css: z.string().optional(),
      ativo: z.boolean().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const payload = { tenant_id: tenantId, nome: data.nome, tipo: data.tipo, html: data.html, css: data.css ?? "", ativo: data.ativo ?? true };
    const q = data.id
      ? context.supabase.from("pdf_templates").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("pdf_templates").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

function interpolate(tpl: string, vars: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const v = path.split(".").reduce((acc: any, k: string) => acc?.[k], vars);
    return v == null ? "" : String(v);
  });
}

export const renderRequerimentoPdfHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requerimentoId: string; templateId?: string }) =>
    z.object({ requerimentoId: z.string().uuid(), templateId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: req, error } = await context.supabase
      .from("requerimentos")
      .select("*, empreendimentos(nome, endereco, cidades(nome, uf), empresas(nome_fantasia, pessoas_juridicas(razao_social, cnpj)))")
      .eq("id", data.requerimentoId).single();
    if (error) throw new Error(error.message);

    let tpl: any;
    if (data.templateId) {
      const r = await context.supabase.from("pdf_templates").select("*").eq("id", data.templateId).single();
      tpl = r.data;
    } else {
      const r = await context.supabase.from("pdf_templates").select("*")
        .eq("tenant_id", req.tenant_id).eq("ativo", true).eq("tipo", "requerimento")
        .order("criado_em", { ascending: false }).limit(1).maybeSingle();
      tpl = r.data;
    }
    const defaultHtml = `<h1>Requerimento {{titulo}}</h1>
<p><strong>Tipo:</strong> {{tipo}} • <strong>Status:</strong> {{status}}</p>
<p><strong>Empresa:</strong> {{empresa}}</p>
<p><strong>Empreendimento:</strong> {{empreendimento}} — {{cidade}}/{{uf}}</p>
<p><strong>Criado em:</strong> {{criado_em}}</p>
<hr/>
<p>{{descricao}}</p>`;
    const defaultCss = `body{font-family:system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}h1{margin:0 0 8px}hr{margin:16px 0;border:0;border-top:1px solid #ddd}`;
    const vars = {
      titulo: req.titulo, tipo: req.tipo, status: req.status,
      descricao: req.descricao ?? "",
      criado_em: new Date(req.criado_em).toLocaleString("pt-BR"),
      empresa: (req as any).empreendimentos?.empresas?.pessoas_juridicas?.razao_social
        ?? (req as any).empreendimentos?.empresas?.nome_fantasia ?? "—",
      empreendimento: (req as any).empreendimentos?.nome ?? "—",
      cidade: (req as any).empreendimentos?.cidades?.nome ?? "—",
      uf: (req as any).empreendimentos?.cidades?.uf ?? "—",
    };
    const body = interpolate(tpl?.html ?? defaultHtml, vars);
    const css = tpl?.css || defaultCss;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${vars.titulo}</title><style>${css}</style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`;
    return { html };
  });

/* ============== API TOKENS ============== */

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const listApiTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("api_tokens")
      .select("id, nome, prefixo, escopos, criado_em, expira_em, ultimo_uso_em, revogado")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; escopos?: string[]; expiraEm?: string }) =>
    z.object({
      nome: z.string().min(1),
      escopos: z.array(z.string()).default(["read"]),
      expiraEm: z.string().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const secret = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const prefixo = "sol_" + secret.slice(0, 8);
    const fullToken = `${prefixo}.${secret}`;
    const hash = await sha256Hex(fullToken);
    const { data: row, error } = await context.supabase.from("api_tokens").insert({
      tenant_id: tenantId, nome: data.nome, token_hash: hash, prefixo,
      escopos: data.escopos, criado_por: context.userId,
      expira_em: data.expiraEm || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ...row, token: fullToken };
  });

export const revokeApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("api_tokens").update({ revogado: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listApiRequestLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("api_request_log")
      .select("id, rota, metodo, status, latencia_ms, ip, criado_em, token_id, api_tokens(nome, prefixo)")
      .order("criado_em", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });