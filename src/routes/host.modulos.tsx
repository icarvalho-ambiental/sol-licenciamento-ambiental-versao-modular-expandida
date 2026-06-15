import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/sol/auth";
import { listTenants } from "@/lib/sol/tenant-functions";
import { listModules, listTenantModules, setTenantModule } from "@/lib/sol/modules-functions";
import { toast } from "sonner";
import { Grid3x3 } from "lucide-react";

export const Route = createFileRoute("/host/modulos")({ component: HostModulos });

function HostModulos() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!user.isHostAdmin) navigate({ to: "/" });
  }, [user, loading, navigate]);
  if (loading || !user || !user.isHostAdmin) return null;

  const qc = useQueryClient();
  const fetchTenants = useServerFn(listTenants);
  const fetchModules = useServerFn(listModules);
  const fetchTM = useServerFn(listTenantModules);
  const doSet = useServerFn(setTenantModule);

  const tenantsQ = useQuery({ queryKey: ["host", "tenants"], queryFn: () => fetchTenants() });
  const modulesQ = useQuery({ queryKey: ["modules", "all"], queryFn: () => fetchModules() });

  const [tenantId, setTenantId] = useState<string | null>(null);
  useEffect(() => {
    if (!tenantId && tenantsQ.data?.length) setTenantId(tenantsQ.data[0].id);
  }, [tenantsQ.data, tenantId]);

  const tmQ = useQuery({
    queryKey: ["tenant", "modules", tenantId],
    queryFn: () => fetchTM({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { moduleId: string; habilitado: boolean }) =>
      doSet({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => {
      toast.success("Módulo atualizado.");
      qc.invalidateQueries({ queryKey: ["tenant", "modules", tenantId] });
    },
    onError: (e: any) => toast.error(e.message || "Falha ao atualizar."),
  });

  const enabledMap = new Map<string, boolean>(
    (tmQ.data ?? []).map((r: any) => [r.module_id, r.habilitado]),
  );

  return (
    <AppShell>
      <PageHeader
        title="Módulos por Cliente"
        subtitle="Habilite ou desabilite módulos para cada cliente da plataforma."
        breadcrumb={["Host", "Módulos"]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Grid3x3 size={18} /> Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md">
            <Label className="mb-2 block">Cliente</Label>
            <Select value={tenantId ?? ""} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {(tenantsQ.data ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y rounded-md border">
            {(modulesQ.data ?? []).map((m: any) => {
              const isCore = m.core;
              const enabled = isCore ? true : !!enabledMap.get(m.id);
              return (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {m.nome}
                      {isCore && <Badge variant="secondary">Núcleo</Badge>}
                    </div>
                    {m.descricao && <div className="text-xs text-muted-foreground">{m.descricao}</div>}
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={isCore || !tenantId || toggleMut.isPending}
                    onCheckedChange={(v) => toggleMut.mutate({ moduleId: m.id, habilitado: v })}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}