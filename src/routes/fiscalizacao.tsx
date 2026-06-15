import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { ModuleStub } from "@/components/sol/ModuleStub";

export const Route = createFileRoute("/fiscalizacao")({
  head: () => ({ meta: [{ title: "Fiscalização" }] }),
  component: () => (
    <ModuleStub
      title="Fiscalização"
      descricao="Autos de infração, denúncias e vistorias ambientais."
      icon={<ShieldAlert className="text-rose-600" />}
    />
  ),
});