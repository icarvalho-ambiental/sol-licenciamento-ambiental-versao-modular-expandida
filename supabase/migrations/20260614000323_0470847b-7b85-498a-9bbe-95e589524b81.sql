
-- 1) TENANTS (tabela só) ---------------------------------------------------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_touch BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Papel host_admin
INSERT INTO public.roles (nome, descricao, sistema)
VALUES ('host_admin', 'Host Admin — gestor do SaaS, gerencia locatários', true)
ON CONFLICT (nome) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_host_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.nome = 'host_admin'
  );
$$;

-- 2) TENANT_USERS ---------------------------------------------------------
CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_users TO authenticated;
GRANT ALL ON public.tenant_users TO service_role;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND ativo);
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_users tu
    JOIN public.roles r ON r.id = tu.role_id
    WHERE tu.user_id = _user_id AND tu.tenant_id = _tenant_id AND tu.ativo
      AND r.nome IN ('admin','tenant_admin'));
$$;

-- 3) POLICIES (agora que ambas as tabelas existem) -----------------------
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
USING (public.is_host_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), id));
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.is_host_admin(auth.uid()));
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
USING (public.is_host_admin(auth.uid())) WITH CHECK (public.is_host_admin(auth.uid()));
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE TO authenticated
USING (public.is_host_admin(auth.uid()));

CREATE POLICY "tu_select" ON public.tenant_users FOR SELECT TO authenticated
USING (public.is_host_admin(auth.uid()) OR user_id = auth.uid()
       OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tu_insert" ON public.tenant_users FOR INSERT TO authenticated
WITH CHECK (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tu_update" ON public.tenant_users FOR UPDATE TO authenticated
USING (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
WITH CHECK (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tu_delete" ON public.tenant_users FOR DELETE TO authenticated
USING (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- 4) CIDADES -------------------------------------------------------------
CREATE TABLE public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf char(2) NOT NULL,
  ibge_codigo text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, uf)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cidades TO authenticated;
GRANT ALL ON public.cidades TO service_role;
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cid_read" ON public.cidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "cid_insert" ON public.cidades FOR INSERT TO authenticated
WITH CHECK (public.is_host_admin(auth.uid()));
CREATE POLICY "cid_update" ON public.cidades FOR UPDATE TO authenticated
USING (public.is_host_admin(auth.uid())) WITH CHECK (public.is_host_admin(auth.uid()));
CREATE POLICY "cid_delete" ON public.cidades FOR DELETE TO authenticated
USING (public.is_host_admin(auth.uid()));

-- 5) TENANT_CIDADES ------------------------------------------------------
CREATE TABLE public.tenant_cidades (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cidade_id uuid NOT NULL REFERENCES public.cidades(id) ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, cidade_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_cidades TO authenticated;
GRANT ALL ON public.tenant_cidades TO service_role;
ALTER TABLE public.tenant_cidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tc_select" ON public.tenant_cidades FOR SELECT TO authenticated
USING (public.is_host_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "tc_insert" ON public.tenant_cidades FOR INSERT TO authenticated
WITH CHECK (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tc_delete" ON public.tenant_cidades FOR DELETE TO authenticated
USING (public.is_host_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- 6) SELOS DE VERIFICADO -------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz;
ALTER TABLE public.pessoas_juridicas
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz;
ALTER TABLE public.pessoas_fisicas
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz;

-- 7) Promove admin existente também a host_admin
INSERT INTO public.user_roles (user_id, role_id)
SELECT ur.user_id, (SELECT id FROM public.roles WHERE nome = 'host_admin')
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.nome = 'admin'
ON CONFLICT DO NOTHING;
