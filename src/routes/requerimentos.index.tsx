import { createFileRoute } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListPage } from "@/components/sol/ListPage";
import { deleteRequerimento, listRequerimentos } from "@/lib/sol/sol-functions";
import { useCan } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/requerimentos/")({ component: List });

const STATUS_OPTS = [
  "rascunho","enviado","em_analise","pendente_documentos","aprovado","indeferido","arquivado",
];
const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", em_analise: "Em análise",
  pendente_documentos: "Pend. docs", aprovado: "Aprovado",
  indeferido: "Indeferido", arquivado: "Arquivado",
};

function List() {
  const [s, setS] = useState("todos");
  const listFn = useServerFn(listRequerimentos);
  const delFn = useServerFn(deleteRequerimento);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["requerimentos"], queryFn: () => listFn() });
  const canCreate = useCan("requerimento.criar");
  const canEdit = useCan("requerimento.editar");
  const canDelete = useCan("requerimento.excluir");

  const filtered = ((data ?? []) as any[]).filter((r) => s === "todos" || r.status === s);

  return (
    <ListPage<any>
      title="Requerimentos"
      subtitle="Protocolos e acompanhamento."
      newAction={{ to: "/requerimentos/novo", label: "Novo requerimento", visible: canCreate }}
      extraActions={
        <Select value={s} onValueChange={setS}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTS.map((x) => <SelectItem key={x} value={x}>{STATUS_LABEL[x]}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      data={filtered}
      isLoading={isLoading}
      error={error as Error | null}
      searchPlaceholder="Buscar título, tipo, protocolo..."
      filter={(r, q) => `${r.titulo} ${r.tipo} ${r.numero_processo ?? ""}`.toLowerCase().includes(q.toLowerCase())}
      rowKey={(r) => r.id}
      emptyMessage="Nenhum requerimento."
      columns={[
        { key: "titulo", header: "Título", className: "font-medium", render: (r) => r.titulo },
        { key: "tipo", header: "Tipo", render: (r) => r.tipo },
        { key: "emp", header: "Empreendimento", render: (r) => r.empreendimentos?.nome ?? "—" },
        { key: "proto", header: "Protocolo", className: "font-mono text-xs", render: (r) => r.numero_processo ?? "—" },
        { key: "data", header: "Criado", className: "text-muted-foreground", render: (r) => new Date(r.criado_em).toLocaleDateString("pt-BR") },
        {
          key: "status",
          header: "Status",
          render: (r) => <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{STATUS_LABEL[r.status] ?? r.status}</span>,
        },
      ]}
      actions={{
        view: (r) => ({ to: "/requerimentos/$id", params: { id: r.id } }),
        edit: canEdit ? (r) => ({ to: "/requerimentos/$id/editar", params: { id: r.id } }) : undefined,
        delete: canDelete
          ? {
              label: (r) => `Excluir requerimento "${r.titulo}"? Esta ação não pode ser desfeita.`,
              onConfirm: async (r) => {
                try {
                  await delFn({ data: { id: r.id } });
                  toast.success("Requerimento excluído.");
                  qc.invalidateQueries({ queryKey: ["requerimentos"] });
                } catch (err) {
                  toast.error((err as Error).message);
                  throw err;
                }
              },
            }
          : undefined,
      }}
    />
  );
}