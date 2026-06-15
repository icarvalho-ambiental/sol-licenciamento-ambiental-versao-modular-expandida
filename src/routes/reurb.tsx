import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { ModuleStub } from "@/components/sol/ModuleStub";

export const Route = createFileRoute("/reurb")({
  head: () => ({ meta: [{ title: "REURB" }] }),
  component: () => (
    <ModuleStub
      title="REURB"
      descricao="Regularização fundiária urbana: perímetros, glebas, quadras, lotes e ocupantes."
      icon={<Map className="text-emerald-600" />}
    />
  ),
});