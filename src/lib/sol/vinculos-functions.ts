import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const PAPEIS = ["administrador", "consultor", "procurador", "gerente", "responsavel_tecnico"] as const;

export const lookupCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cpf: z.string().trim().min(11) }).parse(d))
  .handler(async ({ data, context }) => {
    const cpf = onlyDigits(data.cpf);
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("user_id, nome_completo, email, cpf")
      .eq("cpf", cpf)
      .maybeSingle();
    return prof ? { cpf, userId: prof.user_id, nome: prof.nome_completo, email: prof.email } : { cpf, userId: null, nome: null, email: null };
  });

export const listVinculos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ empreendimentoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("empreendimento_vinculos")
      .select("id, cpf, nome, papel, user_id, ativo, criado_em, aceito_em")
      .eq("empreendimento_id", data.empreendimentoId)
      .order("criado_em");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addVinculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      empreendimentoId: z.string().uuid(),
      cpf: z.string().trim().min(11),
      nome: z.string().trim().max(200).optional(),
      papel: z.enum(PAPEIS),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const cpf = onlyDigits(data.cpf);
    if (cpf.length !== 11) throw new Error("CPF inválido.");
    const { data: prof } = await context.supabase
      .from("profiles").select("user_id, nome_completo").eq("cpf", cpf).maybeSingle();
    const { data: row, error } = await context.supabase
      .from("empreendimento_vinculos")
      .upsert(
        {
          empreendimento_id: data.empreendimentoId,
          cpf, nome: data.nome ?? prof?.nome_completo ?? null,
          papel: data.papel,
          user_id: prof?.user_id ?? null,
          criado_por: context.userId,
          ativo: true,
        },
        { onConflict: "empreendimento_id,cpf,papel" },
      )
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeVinculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("empreendimento_vinculos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });