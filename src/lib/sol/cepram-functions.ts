import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
   CEPRAM 4579 — Divisão / Grupo / Tipologia / Enquadramento
============================================================ */

export const listCepramDivisoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cepram_divisoes")
      .select("id, nome, codigo, ordem, ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCepramGrupos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ divisaoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cepram_grupos")
      .select("id, nome, codigo, divisao_id, ativo")
      .eq("divisao_id", data.divisaoId)
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCepramTipologias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cepram_tipologias")
      .select("id, nome, unidade_medida_default, grupo_id, ativo")
      .eq("grupo_id", data.grupoId)
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCepramEnquadramentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tipologiaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cepram_enquadramentos")
      .select("id, tipologia_id, faixa_min, faixa_max, unidade_medida, potencial_poluidor, porte, classe, observacao, ativo")
      .eq("tipologia_id", data.tipologiaId)
      .eq("ativo", true)
      .order("faixa_min");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * Classifica um valor de medida na tipologia escolhida, devolvendo
 * unidade/potencial/porte/classe do enquadramento aplicável.
 */
export const classifyEnquadramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tipologiaId: z.string().uuid(),
      valorMedida: z.number().nonnegative(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cepram_enquadramentos")
      .select("faixa_min, faixa_max, unidade_medida, potencial_poluidor, porte, classe")
      .eq("tipologia_id", data.tipologiaId)
      .eq("ativo", true)
      .order("faixa_min");
    if (error) throw new Error(error.message);
    const match = (rows ?? []).find((r: any) => {
      const min = Number(r.faixa_min);
      const max = r.faixa_max == null ? Infinity : Number(r.faixa_max);
      return data.valorMedida >= min && data.valorMedida <= max;
    });
    return match
      ? {
          unidadeMedida: match.unidade_medida,
          potencialPoluidor: match.potencial_poluidor,
          porte: match.porte,
          classe: match.classe,
        }
      : null;
  });

/* ---------- CRUD admin ---------- */

const requireAdmin = async (context: { supabase: any; userId: string }) => {
  const { data, error } = await context.supabase.rpc("is_host_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: r } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role_nome: "admin" });
    if (!r) throw new Error("Apenas administradores podem editar a tabela CEPRAM.");
  }
};

export const upsertCepramDivisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().trim().min(1).max(200),
      codigo: z.string().trim().max(20).optional(),
      ordem: z.number().int().optional(),
      ativo: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const payload: any = {
      nome: data.nome, codigo: data.codigo ?? null,
      ordem: data.ordem ?? 0, ativo: data.ativo ?? true,
    };
    if (data.id) payload.id = data.id;
    const { data: row, error } = await context.supabase.from("cepram_divisoes").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertCepramGrupo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      divisaoId: z.string().uuid(),
      nome: z.string().trim().min(1).max(200),
      codigo: z.string().trim().max(20).optional(),
      ativo: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const payload: any = {
      nome: data.nome, codigo: data.codigo ?? null,
      divisao_id: data.divisaoId, ativo: data.ativo ?? true,
    };
    if (data.id) payload.id = data.id;
    const { data: row, error } = await context.supabase.from("cepram_grupos").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertCepramTipologia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      grupoId: z.string().uuid(),
      nome: z.string().trim().min(1).max(400),
      unidadeMedidaDefault: z.string().trim().max(60).optional(),
      ativo: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const payload: any = {
      nome: data.nome,
      unidade_medida_default: data.unidadeMedidaDefault ?? null,
      grupo_id: data.grupoId,
      ativo: data.ativo ?? true,
    };
    if (data.id) payload.id = data.id;
    const { data: row, error } = await context.supabase.from("cepram_tipologias").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertCepramEnquadramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tipologiaId: z.string().uuid(),
      faixaMin: z.number().nonnegative(),
      faixaMax: z.number().positive().optional().nullable(),
      unidadeMedida: z.string().trim().min(1).max(60),
      potencialPoluidor: z.enum(["baixo", "medio", "alto"]),
      porte: z.enum(["pequeno", "medio", "grande", "excepcional"]),
      classe: z.number().int().min(1).max(6),
      observacao: z.string().trim().max(500).optional(),
      ativo: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const payload: any = {
      tipologia_id: data.tipologiaId,
      faixa_min: data.faixaMin,
      faixa_max: data.faixaMax ?? null,
      unidade_medida: data.unidadeMedida,
      potencial_poluidor: data.potencialPoluidor,
      porte: data.porte,
      classe: data.classe,
      observacao: data.observacao ?? null,
      ativo: data.ativo ?? true,
    };
    if (data.id) payload.id = data.id;
    const { data: row, error } = await context.supabase
      .from("cepram_enquadramentos").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCepramEnquadramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("cepram_enquadramentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });