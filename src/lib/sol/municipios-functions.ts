import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Busca municípios por nome/UF/código IBGE (case-insensitive, limit 30). */
export const searchMunicipios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().trim().max(120).optional(),
      uf: z.string().trim().length(2).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("municipios")
      .select("id, codigo_ibge, nome, uf, estado_nome, regiao")
      .eq("ativo", true)
      .order("nome")
      .limit(data.limit ?? 30);
    if (data.uf) q = q.eq("uf", data.uf.toUpperCase());
    if (data.q && data.q.length > 0) {
      if (/^\d+$/.test(data.q)) q = q.ilike("codigo_ibge", `${data.q}%`);
      else q = q.ilike("nome", `%${data.q}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Lookup direto por código IBGE. */
export const getMunicipioByIbge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ codigoIbge: z.string().regex(/^\d{7}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("municipios").select("*").eq("codigo_ibge", data.codigoIbge).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Lookup por id numérico (bigint serializado como number). */
export const getMunicipioById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("municipios").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Lookup por nome + UF (case-insensitive). Útil para migração de dados textuais. */
export const getMunicipioByNomeUf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ nome: z.string().trim().min(1).max(120), uf: z.string().trim().length(2) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("municipios").select("*")
      .eq("uf", data.uf.toUpperCase()).ilike("nome", data.nome).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });