import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTenant } from "./tenant-middleware";

export const listDocumentosBiblioteca = createServerFn({ method: "GET" })
  .middleware([withTenant])
  .inputValidator((d: { q?: string } | undefined) =>
    z.object({ q: z.string().trim().max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("documentos_biblioteca")
      .select("id,nome,tipo,descricao,storage_path,tamanho_bytes,mime_type,recurso,recurso_id,criado_em")
      .eq("tenant_id", context.tenantId)
      .order("criado_em", { ascending: false })
      .limit(500);
    if (data.q) query = query.ilike("nome", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const registerDocumentoBiblioteca = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: {
    nome: string;
    tipo?: string;
    descricao?: string;
    storagePath: string;
    tamanhoBytes?: number;
    mimeType?: string;
    recurso?: string;
    recursoId?: string;
  }) =>
    z
      .object({
        nome: z.string().min(1).max(300),
        tipo: z.string().max(80).optional(),
        descricao: z.string().max(1000).optional(),
        storagePath: z.string().min(1).max(500),
        tamanhoBytes: z.number().int().nonnegative().optional(),
        mimeType: z.string().max(150).optional(),
        recurso: z.string().max(40).optional(),
        recursoId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documentos_biblioteca")
      .insert({
        tenant_id: context.tenantId,
        nome: data.nome,
        tipo: data.tipo ?? null,
        descricao: data.descricao ?? null,
        storage_path: data.storagePath,
        tamanho_bytes: data.tamanhoBytes ?? null,
        mime_type: data.mimeType ?? null,
        recurso: data.recurso ?? null,
        recurso_id: data.recursoId ?? null,
        criado_por: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocumentoBiblioteca = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error: e1 } = await context.supabase
      .from("documentos_biblioteca")
      .select("storage_path")
      .eq("id", data.id)
      .eq("tenant_id", context.tenantId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    const { error } = await context.supabase
      .from("documentos_biblioteca")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", context.tenantId);
    if (error) throw new Error(error.message);
    if (doc?.storage_path) {
      await context.supabase.storage.from("tenant-docs").remove([doc.storage_path]);
    }
    return { ok: true };
  });

export const signDocumentoBibliotecaUrl = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documentos_biblioteca")
      .select("storage_path,nome")
      .eq("id", data.id)
      .eq("tenant_id", context.tenantId)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: e2 } = await context.supabase.storage
      .from("tenant-docs")
      .createSignedUrl(doc.storage_path, 60 * 5, { download: doc.nome });
    if (e2) throw new Error(e2.message);
    return { url: signed.signedUrl };
  });

export const uploadDocumentoBiblioteca = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData esperado");
    return d;
  })
  .handler(async ({ data, context }) => {
    const file = data.get("file");
    const nome = String(data.get("nome") ?? "");
    const tipo = (data.get("tipo") as string | null) ?? null;
    const descricao = (data.get("descricao") as string | null) ?? null;
    if (!(file instanceof File)) throw new Error("Arquivo ausente.");
    if (!nome) throw new Error("Nome obrigatório.");
    if (file.size > 50 * 1024 * 1024) throw new Error("Arquivo > 50MB.");

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${context.tenantId}/biblioteca/${crypto.randomUUID()}_${safeName}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const up = await context.supabase.storage
      .from("tenant-docs")
      .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
    if (up.error) throw new Error(up.error.message);

    const { data: row, error } = await context.supabase
      .from("documentos_biblioteca")
      .insert({
        tenant_id: context.tenantId,
        nome,
        tipo,
        descricao,
        storage_path: path,
        tamanho_bytes: file.size,
        mime_type: file.type || null,
        criado_por: context.userId,
      })
      .select()
      .single();
    if (error) {
      await context.supabase.storage.from("tenant-docs").remove([path]);
      throw new Error(error.message);
    }
    return row;
  });