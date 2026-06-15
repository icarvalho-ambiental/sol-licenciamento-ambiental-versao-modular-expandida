import { createFileRoute } from "@tanstack/react-router";
import { Beef } from "lucide-react";
import { ModuleStub } from "@/components/sol/ModuleStub";

export const Route = createFileRoute("/sim")({
  head: () => ({ meta: [{ title: "SIM" }] }),
  component: () => (
    <ModuleStub
      title="SIM — Serviço de Inspeção Municipal"
      descricao="Estabelecimentos, produtos e inspeções."
      icon={<Beef className="text-amber-600" />}
    />
  ),
});