import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";

export interface SolUser {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  role: Role;             // papel "principal" p/ compatibilidade com a sidebar antiga
  roleNames: string[];    // todos os papéis do usuário (nomes)
  permissions: Set<string>;
  emailValidado: boolean;
  perfilCompleto: boolean;
  isHostAdmin: boolean;
}

interface AuthCtx {
  user: SolUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role) => void; // mantido p/ compatibilidade (no-op em produção)
  hasPermission: (key: string) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

function mapPrimaryRole(roleNames: string[]): Role {
  if (roleNames.includes("admin")) return "admin";
  if (roleNames.includes("gac")) return "gac";
  if (roleNames.includes("analista")) return "analista";
  if (roleNames.includes("empresa")) return "empresa";
  return "externo";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SolUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const authUser = sess.session?.user;
      if (!authUser) { setUser(null); return; }

      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("nome_completo, cpf, email, email_validado, perfil_completo").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("roles(nome)").eq("user_id", authUser.id),
      ]);

      const roleNames = (roleRows ?? []).map((r: any) => r.roles?.nome).filter(Boolean) as string[];
      const roleIds = (roleRows ?? []).map((r: any) => r.role_id);

      let perms: string[] = [];
      if (roleIds.length || roleNames.length) {
        const { data: rids } = await supabase.from("user_roles").select("role_id").eq("user_id", authUser.id);
        const ids = (rids ?? []).map((r: any) => r.role_id);
        if (ids.length) {
          const { data: pr } = await supabase.from("role_permissions").select("permission_key").in("role_id", ids);
          perms = (pr ?? []).map((p: any) => p.permission_key);
        }
      }

      setUser({
        id: authUser.id,
        nome: profile?.nome_completo || authUser.email || "Usuário",
        email: profile?.email || authUser.email || "",
        cpf: profile?.cpf ?? null,
        role: mapPrimaryRole(roleNames),
        roleNames,
        permissions: new Set(profile?.email_validado ? perms : []),
        emailValidado: !!profile?.email_validado,
        perfilCompleto: !!profile?.perfil_completo,
        isHostAdmin: roleNames.includes("host_admin"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadUser(); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      refresh: loadUser,
      logout: async () => { await supabase.auth.signOut(); setUser(null); },
      setRole: () => {},
      hasPermission: (key: string) => !!user && user.permissions.has(key),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}

export function canSee(role: Role | undefined, allowed: Role[]) {
  return !!role && allowed.includes(role);
}