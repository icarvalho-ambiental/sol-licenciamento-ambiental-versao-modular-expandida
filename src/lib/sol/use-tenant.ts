import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listMyTenants, listTenantModules, listModules } from "./modules-functions";
import { listMyTenantPermissions } from "./rbac-functions";
import { useAuth } from "./auth";

const STORAGE_KEY = "sol.activeTenantId";

export function useActiveTenant() {
  const { user } = useAuth();
  const fetchTenants = useServerFn(listMyTenants);
  const fetchTenantModules = useServerFn(listTenantModules);
  const fetchModules = useServerFn(listModules);

  const tenantsQ = useQuery({
    queryKey: ["my", "tenants", user?.id],
    queryFn: () => fetchTenants(),
    enabled: !!user,
  });

  const allModulesQ = useQuery({
    queryKey: ["modules", "all"],
    queryFn: () => fetchModules(),
    enabled: !!user,
  });

  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    const list = tenantsQ.data ?? [];
    if (!list.length) return;
    if (!activeId || !list.find((t: any) => t.id === activeId)) {
      const first = list[0].id;
      setActiveIdState(first);
      window.localStorage.setItem(STORAGE_KEY, first);
    }
  }, [tenantsQ.data, activeId]);

  const setActive = (id: string) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  const enabledQ = useQuery({
    queryKey: ["tenant", "modules", activeId],
    queryFn: () => fetchTenantModules({ data: { tenantId: activeId! } }),
    enabled: !!activeId,
  });

  const enabledKeys = new Set<string>([
    "core",
    ...((enabledQ.data ?? [])
      .filter((r: any) => r.habilitado)
      .map((r: any) => r.modules?.chave)
      .filter(Boolean) as string[]),
    ...((allModulesQ.data ?? []).filter((m: any) => m.core).map((m: any) => m.chave) as string[]),
  ]);

  return {
    tenants: tenantsQ.data ?? [],
    activeId,
    activeTenant: (tenantsQ.data ?? []).find((t: any) => t.id === activeId) ?? null,
    setActive,
    enabledModuleKeys: enabledKeys,
    allModules: allModulesQ.data ?? [],
    loading: tenantsQ.isLoading || enabledQ.isLoading,
  };
}

/**
 * Permissões do usuário no tenant ativo. "*" = host admin (libera tudo).
 * Retorna um Set + helper `can(key)`.
 */
export function useTenantPermissions() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("sol.activeTenantId"),
  );
  useEffect(() => {
    const onChange = () =>
      setActiveId(window.localStorage.getItem("sol.activeTenantId"));
    window.addEventListener("storage", onChange);
    const t = setInterval(onChange, 1000);
    return () => {
      window.removeEventListener("storage", onChange);
      clearInterval(t);
    };
  }, []);

  const fetchPerms = useServerFn(listMyTenantPermissions);
  const q = useQuery({
    queryKey: ["tenant", "permissions", activeId, user?.id],
    queryFn: () => fetchPerms({ data: {} }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const set = new Set(q.data ?? []);
  const isHost = set.has("*");
  return {
    permissions: set,
    isHost,
    can: (key: string) => isHost || set.has(key),
    loading: q.isLoading,
  };
}

/** Atalho: useCan("modulo.recurso.acao") → boolean */
export function useCan(key: string) {
  return useTenantPermissions().can(key);
}