
-- ===== Tipos de requerimento dinâmicos por tenant =====
CREATE TABLE public.requerimento_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimento_tipos TO authenticated;
GRANT ALL ON public.requerimento_tipos TO service_role;
ALTER TABLE public.requerimento_tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_tipos_select ON public.requerimento_tipos FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY req_tipos_manage ON public.requerimento_tipos FOR ALL TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento_tipo.gerenciar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento_tipo.gerenciar'));
CREATE TRIGGER trg_req_tipos_touch BEFORE UPDATE ON public.requerimento_tipos
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE TABLE public.requerimento_tipo_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id uuid NOT NULL REFERENCES public.requerimento_tipos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimento_tipo_documentos TO authenticated;
GRANT ALL ON public.requerimento_tipo_documentos TO service_role;
ALTER TABLE public.requerimento_tipo_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_tipo_doc_select ON public.requerimento_tipo_documentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimento_tipos t WHERE t.id = tipo_id
    AND (public.is_tenant_member(auth.uid(), t.tenant_id) OR public.is_host_admin(auth.uid()))));
CREATE POLICY req_tipo_doc_manage ON public.requerimento_tipo_documentos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimento_tipos t WHERE t.id = tipo_id
    AND public.tenant_has_permission(auth.uid(), t.tenant_id, 'requerimento_tipo.gerenciar')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimento_tipos t WHERE t.id = tipo_id
    AND public.tenant_has_permission(auth.uid(), t.tenant_id, 'requerimento_tipo.gerenciar')));

-- ===== Aceite de termos no profile =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz,
  ADD COLUMN IF NOT EXISTS termos_versao text;

-- ===== Permissões novas =====
INSERT INTO public.permissions(key, descricao, modulo) VALUES
  ('requerimento_tipo.gerenciar', 'Gerenciar tipos de requerimento e documentos exigidos', 'core'),
  ('tenant.bootstrap', 'Criar locatário inicial', 'core'),
  ('tenant.convidar_usuario', 'Convidar usuário para o locatário', 'core')
ON CONFLICT (key) DO NOTHING;

-- Concede ao papel admin/tenant_admin
INSERT INTO public.role_permissions(role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r CROSS JOIN public.permissions p
WHERE r.nome IN ('admin','tenant_admin','host_admin')
  AND p.key IN ('requerimento_tipo.gerenciar','tenant.bootstrap','tenant.convidar_usuario')
ON CONFLICT DO NOTHING;

-- ===== Auto-ativar módulos core ao criar tenant =====
CREATE OR REPLACE FUNCTION public.tenant_enable_core_modules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, habilitado)
  SELECT NEW.id, m.id, true FROM public.modules m WHERE m.core = true
  ON CONFLICT DO NOTHING;
  -- também já habilita licenciamento como módulo MVP default
  INSERT INTO public.tenant_modules (tenant_id, module_id, habilitado)
  SELECT NEW.id, m.id, true FROM public.modules m WHERE m.chave = 'licenciamento'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tenant_enable_core ON public.tenants;
CREATE TRIGGER trg_tenant_enable_core AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenant_enable_core_modules();

-- Backfill: para tenants existentes (caso haja), ativar módulos core
INSERT INTO public.tenant_modules (tenant_id, module_id, habilitado)
SELECT t.id, m.id, true FROM public.tenants t CROSS JOIN public.modules m
WHERE m.core = true OR m.chave = 'licenciamento'
ON CONFLICT DO NOTHING;

-- ===== Endurecer RLS gis_features (restringir ao role authenticated) =====
DROP POLICY IF EXISTS gis_features_insert ON public.gis_features;
DROP POLICY IF EXISTS gis_features_update ON public.gis_features;
DROP POLICY IF EXISTS gis_features_delete ON public.gis_features;
DROP POLICY IF EXISTS gis_features_select ON public.gis_features;

CREATE POLICY gis_features_select ON public.gis_features FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gis_layers l WHERE l.id = layer_id AND l.publico = true)
    OR public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_host_admin(auth.uid())
  );
CREATE POLICY gis_features_insert ON public.gis_features FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
CREATE POLICY gis_features_update ON public.gis_features FOR UPDATE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
CREATE POLICY gis_features_delete ON public.gis_features FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
