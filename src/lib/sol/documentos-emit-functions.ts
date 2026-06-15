import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTenant } from "./tenant-middleware";

/** Lista documentos emitidos no tenant ativo (com filtro opcional por requerimento). */
export const listDocumentos = createServerFn({ method: "GET" })
  .middleware([withTenant])
  .inputValidator((d: { requerimentoId?: string; q?: string } | undefined) =>
    z
      .object({
        requerimentoId: z.string().uuid().optional(),
        q: z.string().trim().max(200).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("documentos")
      .select(
        "id,tipo,titulo,descricao,status,hash_sha256,paginas,tamanho_bytes,requerimento_id,criado_em,atualizado_em",
      )
      .eq("tenant_id", context.tenantId)
      .order("criado_em", { ascending: false })
      .limit(500);
    if (data.requerimentoId) q = q.eq("requerimento_id", data.requerimentoId);
    if (data.q) q = q.ilike("titulo", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Emite um novo documento a partir de um arquivo enviado (PDF/imagem). */
export const issueDocumento = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData esperado");
    return d;
  })
  .handler(async ({ data, context }) => {
    const file = data.get("file");
    const titulo = String(data.get("titulo") ?? "").trim();
    const tipo = String(data.get("tipo") ?? "generico").trim() || "generico";
    const descricao = (data.get("descricao") as string | null) ?? null;
    const requerimentoId = (data.get("requerimentoId") as string | null) ?? null;
    if (!(file instanceof File)) throw new Error("Arquivo ausente.");
    if (!titulo) throw new Error("Título obrigatório.");
    if (file.size > 50 * 1024 * 1024) throw new Error("Arquivo > 50MB.");

    // hash SHA-256
    const buf = new Uint8Array(await file.arrayBuffer());
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${context.tenantId}/documentos/${crypto.randomUUID()}_${safe}`;

    const up = await context.supabase.storage
      .from("tenant-docs")
      .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
    if (up.error) throw new Error(up.error.message);

    const { data: row, error } = await context.supabase
      .from("documentos")
      .insert({
        tenant_id: context.tenantId,
        requerimento_id: requerimentoId,
        tipo,
        titulo,
        descricao,
        bucket: "tenant-docs",
        path,
        mime: file.type || null,
        tamanho_bytes: file.size,
        hash_sha256: hashHex,
        status: "emitido",
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

/** URL temporária para baixar o arquivo do documento. */
export const signDocumentoUrl = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documentos")
      .select("path,titulo")
      .eq("id", data.id)
      .eq("tenant_id", context.tenantId)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: e2 } = await context.supabase.storage
      .from("tenant-docs")
      .createSignedUrl(doc.path, 60 * 5, { download: doc.titulo });
    if (e2) throw new Error(e2.message);
    return { url: signed.signedUrl };
  });

/** Registra uma assinatura eletrônica no documento. */
export const signDocumento = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: {
    documentoId: string;
    signatarioNome: string;
    signatarioEmail?: string;
    papel?: string;
  }) =>
    z
      .object({
        documentoId: z.string().uuid(),
        signatarioNome: z.string().min(2).max(200),
        signatarioEmail: z.string().email().max(200).optional(),
        papel: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error: e1 } = await context.supabase
      .from("documentos")
      .select("hash_sha256,status")
      .eq("id", data.documentoId)
      .eq("tenant_id", context.tenantId)
      .single();
    if (e1) throw new Error(e1.message);
    if (!doc.hash_sha256) throw new Error("Documento sem hash; emita novamente.");
    if (doc.status === "revogado") throw new Error("Documento revogado.");

    const { error } = await context.supabase.from("assinaturas").insert({
      tenant_id: context.tenantId,
      documento_id: data.documentoId,
      signatario_id: context.userId,
      signatario_nome: data.signatarioNome,
      signatario_email: data.signatarioEmail ?? null,
      papel: data.papel ?? null,
      hash_sha256: doc.hash_sha256,
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("documentos")
      .update({ status: "assinado" })
      .eq("id", data.documentoId)
      .eq("tenant_id", context.tenantId);

    return { ok: true };
  });

/** Gera (ou reaproveita) um token público para QR Code. */
export const createQrToken = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: { documentoId: string; expiraEm?: string | null }) =>
    z
      .object({
        documentoId: z.string().uuid(),
        expiraEm: z.string().datetime().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const token = crypto.randomUUID().replace(/-/g, "");
    const { data: row, error } = await context.supabase
      .from("qr_tokens")
      .insert({
        tenant_id: context.tenantId,
        documento_id: data.documentoId,
        token,
        expira_em: data.expiraEm ?? null,
        criado_por: context.userId,
      })
      .select("id,token,expira_em")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAssinaturas = createServerFn({ method: "GET" })
  .middleware([withTenant])
  .inputValidator((d: { documentoId: string }) =>
    z.object({ documentoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("assinaturas")
      .select("id,signatario_nome,signatario_email,papel,assinado_em,hash_sha256")
      .eq("tenant_id", context.tenantId)
      .eq("documento_id", data.documentoId)
      .order("assinado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** PÚBLICO — valida um token de QR e devolve metadados do documento. */
export const validarQrToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(8).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("validar_qr_token", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    const r = (rows ?? [])[0] ?? null;
    return r;
  });