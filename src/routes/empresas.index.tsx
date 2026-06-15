import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListPage } from "@/components/sol/ListPage";
import { deleteEmpresa, listEmpresas } from "@/lib/sol/sol-functions";
import { useCan } from "@/lib/sol/use-tenant";

export const Route = createFileRoute("/empresas/")({ component: EmpresasPage });

function EmpresasPage() {
  const listFn = useServerFn(listEmpresas);
  const delFn = useServerFn(deleteEmpresa);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["empresas"], queryFn: () => listFn() });
  const canCreate = useCan("empresa.criar");
  const canEdit = useCan("empresa.editar");
  const canDelete = useCan("empresa.excluir");

  return (
    <ListPage
      title="Empresas"
      subtitle="Pessoas jurídicas vinculadas ao locatário."
      newAction={{ to: "/empresas/nova", label: "Nova empresa", visible: canCreate }}
      data={data}
      isLoading={isLoading}
      error={error as Error | null}
      searchPlaceholder="Buscar por razão social, fantasia ou CNPJ..."
      filter={(e, q) => {
        const n = q.toLowerCase();
        return [e.razaoSocial, e.nomeFantasia, e.cnpj].some((s) => (s ?? "").toLowerCase().includes(n));
      }}
      rowKey={(e) => e.id}
      emptyMessage="Nenhuma empresa cadastrada."
      columns={[
        {
          key: "razao",
          header: "Razão Social",
          render: (e) => (
            <div>
              <div className="font-medium">{e.razaoSocial}</div>
              {e.nomeFantasia && <div className="text-xs text-muted-foreground">{e.nomeFantasia}</div>}
            </div>
          ),
        },
        { key: "cnpj", header: "CNPJ", className: "font-mono text-xs", render: (e) => e.cnpj },
        {
          key: "contato",
          header: "Contato",
          className: "text-xs",
          render: (e) => (<>{e.email || "—"}<br />{e.telefone || ""}</>),
        },
        {
          key: "verif",
          header: "Verificada",
          render: (e) =>
            e.verificado ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <ShieldCheck size={14} /> verificada
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
        },
      ]}
      actions={{
        view: (e) => ({ to: "/empresas/$id/editar", params: { id: e.id } }),
        edit: canEdit ? (e) => ({ to: "/empresas/$id/editar", params: { id: e.id } }) : undefined,
        delete: canDelete
          ? {
              label: (e) => `Excluir empresa "${e.razaoSocial}"? Esta ação não pode ser desfeita.`,
              onConfirm: async (e) => {
                try {
                  await delFn({ data: { id: e.id } });
                  toast.success("Empresa excluída.");
                  qc.invalidateQueries({ queryKey: ["empresas"] });
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