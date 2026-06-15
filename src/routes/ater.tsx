import { createFileRoute } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { ModuleStub } from "@/components/sol/ModuleStub";

export const Route = createFileRoute("/ater")({
  head: () => ({ meta: [{ title: "ATER" }] }),
  component: () => (
    <ModuleStub
      title="ATER — Assistência Técnica e Extensão Rural"
      descricao="Produtores, propriedades, visitas e planos."
      icon={<Sprout className="text-green-600" />}
    />
  ),
});