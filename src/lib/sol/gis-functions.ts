import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTenant } from "./tenant-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function readTenantHeader(): Promise<string | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const raw = req?.headers.get("x-tenant-id") ?? null;
  return raw && z.string().uuid().safeParse(raw).success ? raw : null;
}

const Geom = z.object({
  type: z.enum(["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"]),
  coordinates: z.any(),
});

export const listGisLayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await readTenantHeader();
    if (!tenantId) return [];
    const { data, error } = await context.supabase
      .from("gis_layers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createGisLayer = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: unknown) =>
    z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      tipo: z.enum(["ponto", "linha", "poligono", "misto"]),
      publico: z.boolean().default(false),
      estilo: z.record(z.any()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("gis_layers")
      .insert({ ...data, tenant_id: context.tenantId, criado_por: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGisLayer = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("gis_layers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listGisFeatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ layerId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await readTenantHeader();
    if (!tenantId) return [];
    let q = context.supabase.from("gis_features").select("*").limit(2000);
    q = q.eq("tenant_id", tenantId);
    if (data.layerId) q = q.eq("layer_id", data.layerId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createGisFeature = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: unknown) =>
    z.object({
      layerId: z.string().uuid(),
      geometria: Geom,
      propriedades: z.record(z.any()).default({}),
      recurso: z.string().optional(),
      recursoId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("gis_features")
      .insert({
        tenant_id: context.tenantId,
        layer_id: data.layerId,
        geometria: data.geometria,
        propriedades: data.propriedades,
        recurso: data.recurso,
        recurso_id: data.recursoId,
        criado_por: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGisFeature = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("gis_features").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });