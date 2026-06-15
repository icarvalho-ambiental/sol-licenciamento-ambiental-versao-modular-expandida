import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Returns the first active tenant of the current user, or throws. */
async function getActiveTenantId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Você não está vinculado a nenhum locatário.");
  return data.tenant_id as string;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/* ============================================================
   EMPRESAS
============================================================ */

export const listEmpresas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("empresas")
      .select(
        "id, tenant_id, ativo, nome_fantasia, criado_em, " +
          "pessoas_juridicas!inner(id, cnpj, razao_social, nome_fantasia, email, telefone, verificado)"
      )
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      ativo: r.ativo,
      nomeFantasia: r.nome_fantasia ?? r.pessoas_juridicas.nome_fantasia,
      razaoSocial: r.pessoas_juridicas.razao_social,
      cnpj: r.pessoas_juridicas.cnpj,
      email: r.pessoas_juridicas.email,
      telefone: r.pessoas_juridicas.telefone,
      verificado: r.pessoas_juridicas.verificado,
      criadoEm: r.criado_em,
    }));
  });

export const getEmpresa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: e, error } = await context.supabase
      .from("empresas")
      .select(
        "id, tenant_id, nome_fantasia, ativo, consultor_user_id, criado_em, " +
          "pessoas_juridicas(id, cnpj, razao_social, nome_fantasia, email, telefone, verificado)"
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!e) throw new Error("Empresa não encontrada.");
    const { data: socios } = await context.supabase
      .from("empresa_socios")
      .select(
        "id, participacao, eh_representante_legal, eh_procurador, " +
          "pessoas_fisicas(id, cpf, nome, email, telefone, verificado)"
      )
      .eq("empresa_id", data.id);
    return { empresa: e, socios: socios ?? [] };
  });

export const createEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpj: z.string().trim().min(11),
        razaoSocial: z.string().trim().min(2).max(200),
        nomeFantasia: z.string().trim().max(200).optional(),
        email: z.string().trim().email().max(200).optional().or(z.literal("")),
        telefone: z.string().trim().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const cnpj = onlyDigits(data.cnpj);

    // Upsert pessoa jurídica
    let { data: pj } = await context.supabase
      .from("pessoas_juridicas").select("id").eq("cnpj", cnpj).maybeSingle();
    if (!pj) {
      const { data: created, error } = await context.supabase
        .from("pessoas_juridicas")
        .insert({
          cnpj,
          razao_social: data.razaoSocial,
          nome_fantasia: data.nomeFantasia || null,
          email: data.email || null,
          telefone: data.telefone || null,
          criado_por: context.userId,
        })
        .select("id").single();
      if (error) throw new Error(error.message);
      pj = created;
    }

    const { data: row, error } = await context.supabase
      .from("empresas")
      .insert({
        tenant_id: tenantId,
        pessoa_juridica_id: pj!.id,
        nome_fantasia: data.nomeFantasia || null,
        criado_por: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addSocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        empresaId: z.string().uuid(),
        cpf: z.string().trim().min(11),
        nome: z.string().trim().min(2).max(200),
        participacao: z.number().min(0).max(100).optional(),
        representanteLegal: z.boolean().optional(),
        procurador: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const cpf = onlyDigits(data.cpf);
    let { data: pf } = await context.supabase
      .from("pessoas_fisicas").select("id").eq("cpf", cpf).maybeSingle();
    if (!pf) {
      const { data: created, error } = await context.supabase
        .from("pessoas_fisicas")
        .insert({ cpf, nome: data.nome, criado_por: context.userId })
        .select("id").single();
      if (error) throw new Error(error.message);
      pf = created;
    }
    const { error } = await context.supabase.from("empresa_socios").insert({
      empresa_id: data.empresaId,
      pessoa_fisica_id: pf!.id,
      participacao: data.participacao ?? null,
      eh_representante_legal: !!data.representanteLegal,
      eh_procurador: !!data.procurador,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("empresa_socios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   EMPREENDIMENTOS
============================================================ */

export const listEmpreendimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("empreendimentos")
      .select(
        "id, nome, descricao, endereco, latitude, longitude, ativo, criado_em, " +
          "empresas(id, nome_fantasia, pessoas_juridicas(razao_social, cnpj)), " +
          "cidades(id, nome, uf)"
      )
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createEmpreendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        empresaId: z.string().uuid().optional(),
        nome: z.string().trim().min(2).max(200),
        descricao: z.string().trim().max(2000).optional(),
        cidadeId: z.string().uuid().optional(),
        endereco: z.string().trim().max(300).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        // novos campos
        tipoCadastro: z.enum(["direto", "pj"]).optional(),
        tipoImovel: z.enum(["urbano", "rural", "misto"]).optional(),
        areaConservacao: z.string().trim().max(60).optional(),
        cpfAdministrador: z.string().trim().max(20).optional(),
        cpfConsultor: z.string().trim().max(20).optional(),
        telefone: z.string().trim().max(20).optional(),
        email: z.string().email().max(160).optional(),
        logradouro: z.string().trim().max(200).optional(),
        numero: z.string().trim().max(20).optional(),
        complemento: z.string().trim().max(120).optional(),
        bairro: z.string().trim().max(120).optional(),
        cep: z.string().trim().max(15).optional(),
        uf: z.string().trim().length(2).optional(),
        tipologiaId: z.string().uuid().optional(),
        valorMedida: z.number().nonnegative().optional(),
        unidadeMedida: z.string().trim().max(60).optional(),
        potencialPoluidor: z.enum(["baixo", "medio", "alto"]).optional(),
        porte: z.enum(["pequeno", "medio", "grande", "excepcional"]).optional(),
        classe: z.number().int().min(1).max(6).optional(),
        utmZona: z.string().trim().max(5).optional(),
        utmEasting: z.number().optional(),
        utmNorthing: z.number().optional(),
        vinculos: z.array(z.object({
          cpf: z.string().trim().min(11),
          nome: z.string().trim().max(200).optional(),
          papel: z.enum(["administrador", "consultor", "procurador", "gerente", "responsavel_tecnico"]),
        })).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const digits = (s?: string) => (s ? s.replace(/\D/g, "") : null);
    const { data: row, error } = await context.supabase
      .from("empreendimentos")
      .insert({
        tenant_id: tenantId,
        empresa_id: data.empresaId ?? null,
        nome: data.nome,
        descricao: data.descricao || null,
        cidade_id: data.cidadeId || null,
        endereco: data.endereco || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        tipo_cadastro: data.tipoCadastro ?? null,
        tipo_imovel: data.tipoImovel ?? null,
        area_conservacao: data.areaConservacao ?? null,
        cpf_administrador: digits(data.cpfAdministrador),
        cpf_consultor: digits(data.cpfConsultor),
        telefone: data.telefone ?? null,
        email: data.email ?? null,
        logradouro: data.logradouro ?? null,
        numero: data.numero ?? null,
        complemento: data.complemento ?? null,
        bairro: data.bairro ?? null,
        cep: digits(data.cep),
        uf: data.uf ? data.uf.toUpperCase() : null,
        tipologia_id: data.tipologiaId ?? null,
        valor_medida: data.valorMedida ?? null,
        unidade_medida: data.unidadeMedida ?? null,
        potencial_poluidor: data.potencialPoluidor ?? null,
        porte: data.porte ?? null,
        classe: data.classe ?? null,
        utm_zona: data.utmZona ?? null,
        utm_easting: data.utmEasting ?? null,
        utm_northing: data.utmNorthing ?? null,
        criado_por: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);

    // Vínculos: administrador/consultor + adicionais
    type Papel = "administrador" | "consultor" | "procurador" | "gerente" | "responsavel_tecnico";
    const vinculosToAdd: Array<{ cpf: string; nome?: string; papel: Papel }> = [];
    if (data.cpfAdministrador) vinculosToAdd.push({ cpf: data.cpfAdministrador, papel: "administrador" });
    if (data.cpfConsultor) vinculosToAdd.push({ cpf: data.cpfConsultor, papel: "consultor" });
    for (const v of data.vinculos ?? []) vinculosToAdd.push(v);
    for (const v of vinculosToAdd) {
      const cpf = (v.cpf || "").replace(/\D/g, "");
      if (cpf.length !== 11) continue;
      const { data: prof } = await context.supabase
        .from("profiles").select("user_id, nome_completo").eq("cpf", cpf).maybeSingle();
      await context.supabase.from("empreendimento_vinculos").upsert(
        {
          empreendimento_id: row.id,
          cpf, nome: v.nome ?? prof?.nome_completo ?? null,
          papel: v.papel,
          user_id: prof?.user_id ?? null,
          criado_por: context.userId,
          ativo: true,
        },
        { onConflict: "empreendimento_id,cpf,papel" },
      );
    }

    // Provisiona camada GIS do empreendimento + ponto inicial (se houver coordenada)
    try {
      const { data: layer } = await context.supabase.from("gis_layers").insert({
        tenant_id: tenantId,
        nome: `Empreendimento • ${data.nome}`,
        descricao: `Camada SIGWeb do empreendimento ${data.nome}`,
        tipo: "misto",
        publico: false,
        estilo: { color: "#2563eb" },
        criado_por: context.userId,
      }).select("id").single();
      if (layer && data.latitude != null && data.longitude != null) {
        await context.supabase.from("gis_features").insert({
          tenant_id: tenantId,
          layer_id: layer.id,
          geometria: { type: "Point", coordinates: [data.longitude, data.latitude] },
          propriedades: { empreendimento_id: row.id, nome: data.nome },
          recurso: "empreendimentos",
          recurso_id: row.id,
          criado_por: context.userId,
        });
      }
    } catch {
      // Não bloqueia o cadastro se a camada falhar.
    }
    return row;
  });

/* ============================================================
   REQUERIMENTOS
============================================================ */

const STATUS_VALUES = [
  "rascunho","enviado","em_analise","pendente_documentos",
  "aprovado","indeferido","arquivado",
] as const;

export const listRequerimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("requerimentos")
      .select(
        "id, titulo, tipo, numero_processo, status, prazo_em, criado_em, " +
          "empreendimentos(id, nome, empresas(nome_fantasia, pessoas_juridicas(razao_social, cnpj)))"
      )
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRequerimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase
      .from("requerimentos")
      .select(
        "id, tenant_id, titulo, tipo, numero_processo, status, prazo_em, descricao, dados_dinamicos, criado_em, " +
          "empreendimentos(id, nome, endereco, empresas(id, nome_fantasia, pessoas_juridicas(razao_social, cnpj)))"
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("Requerimento não encontrado.");
    const [{ data: hist }, { data: com }, { data: docs }] = await Promise.all([
      context.supabase
        .from("requerimento_status_historico")
        .select("id, status_anterior, status_novo, motivo, mudado_em, mudado_por")
        .eq("requerimento_id", data.id)
        .order("mudado_em", { ascending: false }),
      context.supabase
        .from("requerimento_comentarios")
        .select("id, texto, autor_user_id, criado_em")
        .eq("requerimento_id", data.id)
        .order("criado_em", { ascending: false }),
      context.supabase
        .from("requerimento_documentos")
        .select("id, nome, storage_path, mime_type, tamanho_bytes, enviado_em")
        .eq("requerimento_id", data.id)
        .order("enviado_em", { ascending: false }),
    ]);
    return { requerimento: r, historico: hist ?? [], comentarios: com ?? [], documentos: docs ?? [] };
  });

export const createRequerimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        empreendimentoId: z.string().uuid(),
        tipo: z.string().trim().min(1).max(80),
        titulo: z.string().trim().min(2).max(200),
        descricao: z.string().trim().max(4000).optional(),
        prazoEm: z.string().trim().optional(),
        dadosDinamicos: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("requerimentos")
      .insert({
        tenant_id: tenantId,
        empreendimento_id: data.empreendimentoId,
        tipo: data.tipo,
        titulo: data.titulo,
        descricao: data.descricao || null,
        prazo_em: data.prazoEm || null,
        dados_dinamicos: (data.dadosDinamicos ?? {}) as any,
        criado_por: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateRequerimentoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUS_VALUES),
        motivo: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("requerimentos").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.motivo) {
      await context.supabase
        .from("requerimento_status_historico")
        .update({ motivo: data.motivo })
        .eq("requerimento_id", data.id)
        .eq("status_novo", data.status)
        .order("mudado_em", { ascending: false })
        .limit(1);
    }
    return { ok: true };
  });

export const addComentario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        requerimentoId: z.string().uuid(),
        texto: z.string().trim().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("requerimento_comentarios").insert({
      requerimento_id: data.requerimentoId,
      autor_user_id: context.userId,
      texto: data.texto,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   AUDITORIA (read)
============================================================ */

export const listAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("auditoria")
      .select("id, tenant_id, user_id, tabela, registro_id, acao, em")
      .order("em", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ============================================================
   Helpers para selects
============================================================ */

export const listEmpresasSimple = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("empresas")
      .select("id, nome_fantasia, pessoas_juridicas(razao_social, cnpj)")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      label: r.nome_fantasia || r.pessoas_juridicas?.razao_social || r.pessoas_juridicas?.cnpj,
    }));
  });

export const listEmpreendimentosSimple = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("empreendimentos")
      .select("id, nome, empresas(nome_fantasia, pessoas_juridicas(razao_social))")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      label: `${r.nome} — ${r.empresas?.nome_fantasia || r.empresas?.pessoas_juridicas?.razao_social || ""}`,
    }));
  });

/* ============================================================
   CONDICIONANTES (Fase C)
============================================================ */

const COND_STATUS = ["pendente","em_andamento","cumprida","vencida","cancelada"] as const;

export const listCondicionantesByRequerimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requerimentoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("condicionantes")
      .select("id, titulo, descricao, prazo, responsavel_user_id, status, notificar_dias_antes, concluida_em, criado_em")
      .eq("requerimento_id", data.requerimentoId)
      .order("prazo", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCondicionantesTodas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("condicionantes")
      .select("id, titulo, prazo, status, responsavel_user_id, requerimento_id, requerimentos(titulo)")
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCondicionante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      requerimentoId: z.string().uuid(),
      titulo: z.string().trim().min(2).max(200),
      descricao: z.string().trim().max(4000).optional(),
      prazo: z.string().trim().optional(),
      responsavelUserId: z.string().uuid().optional(),
      notificarDiasAntes: z.number().int().min(0).max(365).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: req, error: e1 } = await context.supabase
      .from("requerimentos").select("tenant_id").eq("id", data.requerimentoId).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!req) throw new Error("Requerimento não encontrado.");
    const { data: row, error } = await context.supabase
      .from("condicionantes")
      .insert({
        tenant_id: (req as any).tenant_id,
        requerimento_id: data.requerimentoId,
        titulo: data.titulo,
        descricao: data.descricao || null,
        prazo: data.prazo || null,
        responsavel_user_id: data.responsavelUserId || null,
        notificar_dias_antes: data.notificarDiasAntes ?? 7,
        criado_por: context.userId,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCondicionanteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(COND_STATUS) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    if (data.status === "cumprida") {
      patch.concluida_em = new Date().toISOString();
      patch.concluida_por = context.userId;
    }
    const { error } = await context.supabase
      .from("condicionantes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCondicionante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("condicionantes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   NOTIFICAÇÕES (Fase C)
============================================================ */

export const listNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, lida, criado_em, requerimento_id, condicionante_id")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const marcarNotificacaoLida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), lida: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notificacoes").update({ lida: data.lida ?? true })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const marcarTodasLidas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notificacoes").update({ lida: true })
      .eq("user_id", context.userId).eq("lida", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Empreendimentos com coordenadas para o mapa */
export const listEmpreendimentosGeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("empreendimentos")
      .select("id, nome, latitude, longitude, endereco, empresas(nome_fantasia, pessoas_juridicas(razao_social)), cidades(nome, uf)")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* Membros do tenant ativo (para seletor de responsável) */
export const listTenantMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getActiveTenantId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("tenant_users")
      .select("user_id, profiles!inner(user_id, nome_completo, email)")
      .eq("tenant_id", tenantId).eq("ativo", true);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.user_id,
      label: r.profiles?.nome_completo || r.profiles?.email,
    }));
  });

/* ============================================================
   DELETE — Empresa / Empreendimento / Requerimento
============================================================ */

export const deleteEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("empresas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEmpreendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("empreendimentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRequerimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("requerimentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });