import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Generate/send 6-digit verification code ----------
export const sendVerificationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira_em = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Invalida códigos anteriores
    await supabase.from("email_verification_codes")
      .update({ usado: true })
      .eq("user_id", userId)
      .eq("usado", false);

    const { error } = await supabase.from("email_verification_codes").insert({
      user_id: userId,
      codigo,
      expira_em,
    });
    if (error) throw new Error(error.message);

    // Buscar e-mail do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, nome_completo")
      .eq("user_id", userId)
      .maybeSingle();

    // Tenta enviar e-mail via Lovable Emails (se configurado).
    // Se a infra de e-mail ainda não estiver pronta, retornamos o código
    // na resposta para o usuário concluir o cadastro mesmo assim.
    let emailEnviado = false;
    try {
      const origin = process.env.PUBLISHED_URL || "";
      const url = origin ? `${origin}/lovable/email/transactional/send` : null;
      if (url && profile?.email) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: "verification-code",
            recipientEmail: profile.email,
            idempotencyKey: `verify-${userId}-${Date.now()}`,
            templateData: { codigo, nome: profile.nome_completo },
          }),
        });
        emailEnviado = r.ok;
      }
    } catch {
      emailEnviado = false;
    }

    // Em desenvolvimento (e quando o e-mail não foi enviado), devolvemos o código
    // para o usuário conseguir validar a conta.
    return { ok: true, emailEnviado, codigo: emailEnviado ? undefined : codigo, email: profile?.email };
  });

// ---------- Verify code ----------
export const verifyEmailCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ codigo: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("email_verification_codes")
      .select("id, codigo, expira_em, usado")
      .eq("user_id", userId)
      .eq("usado", false)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("Nenhum código pendente. Solicite um novo.");
    if (new Date(row.expira_em) < new Date()) throw new Error("Código expirado. Solicite um novo.");
    if (row.codigo !== data.codigo) throw new Error("Código incorreto.");

    await supabase.from("email_verification_codes").update({ usado: true }).eq("id", row.id);
    await supabase.from("profiles")
      .update({ email_validado: true, perfil_completo: true })
      .eq("user_id", userId);

    return { ok: true };
  });

// ---------- Save personal data ----------
export const saveProfilePersonalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      nome_completo: z.string().trim().min(3).max(120),
      cpf: z.string().trim().min(11).max(20),
      telefone: z.string().trim().min(8).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) throw new Error("CPF inválido.");

    const { error } = await supabase.from("profiles").update({
      nome_completo: data.nome_completo,
      cpf: cpfDigits,
      telefone: data.telefone,
    }).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });