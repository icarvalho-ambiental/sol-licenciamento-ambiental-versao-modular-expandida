import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/sol/ListPage";

export const Route = createFileRoute("/denuncias/")({ component: DenunciasPage });

type Denuncia = { id: string; protocolo: string; assunto: string; status: string; criadoEm: string };

function DenunciasPage() {
  return (
    <ListPage<Denuncia>
      title="Denúncias"
      subtitle="Registro e acompanhamento de denúncias ambientais."
      newAction={{ to: "/denuncias/nova", label: "Nova denúncia" }}
      data={[]}
      isLoading={false}
      rowKey={(d) => d.id}
      emptyMessage="Nenhuma denúncia registrada. O módulo entrará em operação em breve."
      columns={[
        { key: "proto", header: "Protocolo", className: "font-mono text-xs", render: (d) => d.protocolo },
        { key: "assunto", header: "Assunto", className: "font-medium", render: (d) => d.assunto },
        { key: "status", header: "Status", render: (d) => d.status },
        { key: "data", header: "Registrada em", render: (d) => d.criadoEm },
      ]}
      actions={{
        view: (d) => ({ to: "/denuncias/$id/editar", params: { id: d.id } }),
        edit: (d) => ({ to: "/denuncias/$id/editar", params: { id: d.id } }),
        delete: { onConfirm: () => Promise.resolve() },
      }}
    />
  );
}