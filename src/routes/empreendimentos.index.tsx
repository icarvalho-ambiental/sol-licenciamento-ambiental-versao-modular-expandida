import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Map as MapIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListPage } from "@/components/sol/ListPage";
import { deleteEmpreendimento, listEmpreendimentos } from "@/lib/sol/sol-functions";
import { useCan } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/empreendimentos/")({ component: List });

function List() {
  const listFn = useServerFn(listEmpreendimentos);
  const delFn = useServerFn(deleteEmpreendimento);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["empreendimentos"], queryFn: () => listFn() });
  const canCreate = useCan("empreendimento.criar");
  const canEdit = useCan("empreendimento.editar");
  const canDelete = useCan("empreendimento.excluir");

  return (
    <ListPage<any>
      title="Empreendimentos"
      subtitle="Unidades vinculadas às empresas."
      newAction={{ to: "/empreendimentos/novo", label: "Novo empreendimento", visible: canCreate }}
      extraActions={
        <Link to="/empreendimentos/mapa">
          <Button variant="outline" className="gap-2"><MapIcon size={16} /> Ver mapa</Button>
        </Link>
      }
      data={data as any[]}
      isLoading={isLoading}
      error={error as Error | null}
      searchPlaceholder="Buscar por nome..."
      filter={(e, q) => (e.nome ?? "").toLowerCase().includes(q.toLowerCase())}
      rowKey={(e) => e.id}
      emptyMessage="Nenhum empreendimento cadastrado."
      columns={[
        { key: "nome", header: "Nome", className: "font-medium", render: (e) => e.nome },
        {
          key: "empresa",
          header: "Empresa",
          render: (e) => e.empresas?.nome_fantasia || e.empresas?.pessoas_juridicas?.razao_social || "—",
        },
        { key: "cidade", header: "Cidade", render: (e) => (e.cidades ? `${e.cidades.nome}/${e.cidades.uf}` : "—") },
        { key: "end", header: "Endereço", className: "text-xs", render: (e) => e.endereco || "—" },
      ]}
      actions={{
        view: (e) => ({ to: "/empreendimentos/$id/editar", params: { id: e.id } }),
        edit: canEdit ? (e) => ({ to: "/empreendimentos/$id/editar", params: { id: e.id } }) : undefined,
        delete: canDelete
          ? {
              label: (e) => `Excluir empreendimento "${e.nome}"? Esta ação não pode ser desfeita.`,
              onConfirm: async (e) => {
                try {
                  await delFn({ data: { id: e.id } });
                  toast.success("Empreendimento excluído.");
                  qc.invalidateQueries({ queryKey: ["empreendimentos"] });
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