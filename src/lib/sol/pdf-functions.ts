import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTenant } from "./tenant-middleware";

/**
 * Gera um PDF de "Certificado de Autenticidade" para um documento emitido,
 * com cabeçalho do tenant, hash, assinaturas e QR Code (URL pública /v/<token>).
 * Salva o PDF no bucket `tenant-docs` e devolve uma URL assinada.
 */
export const generateDocumentoPdf = createServerFn({ method: "POST" })
  .middleware([withTenant])
  .inputValidator((d: { documentoId: string }) =>
    z.object({ documentoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const QRCode = (await import("qrcode")).default;

    const { data: doc, error: e1 } = await context.supabase
      .from("documentos")
      .select("id,titulo,tipo,status,hash_sha256,criado_em,tenant_id")
      .eq("id", data.documentoId)
      .eq("tenant_id", context.tenantId)
      .single();
    if (e1 || !doc) throw new Error(e1?.message ?? "Documento não encontrado.");

    const [{ data: tenant }, { data: assinaturas }, { data: qrExist }] = await Promise.all([
      context.supabase.from("tenants").select("nome").eq("id", context.tenantId).single(),
      context.supabase
        .from("assinaturas")
        .select("signatario_nome,papel,assinado_em,hash_sha256")
        .eq("documento_id", doc.id)
        .order("assinado_em", { ascending: true }),
      context.supabase
        .from("qr_tokens")
        .select("token")
        .eq("documento_id", doc.id)
        .eq("revogado", false)
        .order("criado_em", { ascending: false })
        .limit(1),
    ]);

    let token = qrExist?.[0]?.token as string | undefined;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      await context.supabase.from("qr_tokens").insert({
        tenant_id: context.tenantId,
        documento_id: doc.id,
        token,
        criado_por: context.userId,
      });
    }

    // Origem pública: derivada do header Origin / Referer (fallback genérico).
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const origin =
      req?.headers.get("origin") ??
      (req?.headers.get("referer") ? new URL(req!.headers.get("referer")!).origin : "https://app.local");
    const publicUrl = `${origin}/v/${token}`;

    const qrPng = await QRCode.toBuffer(publicUrl, { errorCorrectionLevel: "M", margin: 1, width: 320 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const qrImg = await pdf.embedPng(new Uint8Array(qrPng));

    const w = page.getWidth();
    const margin = 48;
    const primary = rgb(0.12, 0.39, 0.27);

    // Header
    page.drawRectangle({ x: 0, y: 781, width: w, height: 60, color: primary });
    page.drawText("Certificado de Autenticidade", {
      x: margin, y: 805, size: 18, font: bold, color: rgb(1, 1, 1),
    });
    page.drawText(tenant?.nome ?? "Locatário", {
      x: margin, y: 788, size: 10, font, color: rgb(0.92, 0.96, 0.93),
    });

    let y = 740;
    const line = (label: string, value: string, size = 11) => {
      page.drawText(label, { x: margin, y, size: 9, font: bold, color: rgb(0.35, 0.35, 0.35) });
      y -= 14;
      const wrapped = value.match(/.{1,90}/g) ?? [value];
      for (const w2 of wrapped) {
        page.drawText(w2, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
        y -= size + 4;
      }
      y -= 6;
    };

    line("DOCUMENTO", doc.titulo, 13);
    line("TIPO", doc.tipo);
    line("STATUS", doc.status);
    line("EMITIDO EM", new Date(doc.criado_em).toLocaleString("pt-BR"));
    if (doc.hash_sha256) line("HASH SHA-256", doc.hash_sha256, 9);

    // QR
    const qrSize = 140;
    page.drawImage(qrImg, { x: w - margin - qrSize, y: 600, width: qrSize, height: qrSize });
    page.drawText("Valide em:", { x: w - margin - qrSize, y: 590, size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(publicUrl, { x: w - margin - qrSize, y: 578, size: 7, font, color: rgb(0.2, 0.2, 0.6) });

    // Assinaturas
    y = Math.min(y, 560);
    page.drawText("ASSINATURAS ELETRÔNICAS", { x: margin, y, size: 11, font: bold, color: primary });
    y -= 18;
    if (!assinaturas?.length) {
      page.drawText("— Nenhuma assinatura registrada —", {
        x: margin, y, size: 10, font, color: rgb(0.5, 0.5, 0.5),
      });
      y -= 16;
    } else {
      for (const a of assinaturas) {
        const head = `${a.signatario_nome}${a.papel ? ` • ${a.papel}` : ""}`;
        page.drawText(head, { x: margin, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.1) });
        y -= 12;
        page.drawText(
          `Em ${new Date(a.assinado_em).toLocaleString("pt-BR")} • hash ${(a.hash_sha256 ?? "").slice(0, 24)}…`,
          { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) },
        );
        y -= 16;
        if (y < 80) break;
      }
    }

    // Rodapé
    page.drawLine({ start: { x: margin, y: 60 }, end: { x: w - margin, y: 60 }, color: rgb(0.85, 0.85, 0.85), thickness: 0.5 });
    page.drawText(
      `Documento gerado por SOL — ${new Date().toLocaleString("pt-BR")}`,
      { x: margin, y: 46, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
    );

    const bytes = await pdf.save();

    const path = `${context.tenantId}/documentos/${doc.id}/certificado-${Date.now()}.pdf`;
    const up = await context.supabase.storage
      .from("tenant-docs")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(up.error.message);

    const signed = await context.supabase.storage
      .from("tenant-docs")
      .createSignedUrl(path, 60 * 10, { download: `certificado-${doc.titulo}.pdf` });
    if (signed.error) throw new Error(signed.error.message);

    return { url: signed.data.signedUrl, path, token };
  });