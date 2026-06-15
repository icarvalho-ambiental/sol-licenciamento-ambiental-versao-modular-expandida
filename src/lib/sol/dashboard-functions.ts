import { createServerFn } from "@tanstack/react-start";
import { withTenant } from "./tenant-middleware";

/**
 * Resumo do dashboard para o tenant ativo. Substitui os mocks.
 */
export const dashboardSummary = createServerFn({ method: "GET" })
  .middleware([withTenant])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const tenantId = context.tenantId;

    const [empresas, empreendimentos, requerimentos, notificacoes, statusRows, muniRows, condRows] = await Promise.all([
      sb.from("empresas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      sb.from("empreendimentos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      sb.from("requerimentos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      sb.from("notificacoes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      sb.from("requerimentos").select("status").eq("tenant_id", tenantId),
      sb.from("empreendimentos").select("cidade_id, cidades(nome)").eq("tenant_id", tenantId),
      sb.from("condicionantes")
        .select("id, titulo, prazo, status, requerimentos(numero_processo, titulo)")
        .eq("tenant_id", tenantId)
        .order("prazo", { ascending: true, nullsFirst: false })
        .limit(8),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const r of statusRows.data ?? []) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    }

    const byCidade: Record<string, { municipio: string; empreendimentos: number }> = {};
    for (const e of (muniRows.data ?? []) as any[]) {
      const nome = e.cidades?.nome ?? "Sem município";
      byCidade[nome] ??= { municipio: nome, empreendimentos: 0 };
      byCidade[nome].empreendimentos += 1;
    }

    return {
      totals: {
        empresas: empresas.count ?? 0,
        empreendimentos: empreendimentos.count ?? 0,
        requerimentos: requerimentos.count ?? 0,
        notificacoes: notificacoes.count ?? 0,
      },
      statusCounts: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      porMunicipio: Object.values(byCidade).sort((a, b) => b.empreendimentos - a.empreendimentos),
      condicionantes: (condRows.data ?? []).map((c: any) => ({
        id: c.id,
        processo: c.requerimentos?.numero_processo ?? c.requerimentos?.titulo ?? "—",
        descricao: c.titulo,
        prazo: c.prazo,
        status: c.status,
      })),
    };
  });