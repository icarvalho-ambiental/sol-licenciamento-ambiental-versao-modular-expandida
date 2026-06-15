INSERT INTO public.permissions(key, descricao, modulo) VALUES
  ('gis.ver', 'Visualizar camadas e feições GIS', 'gis'),
  ('gis.gerenciar', 'Criar/editar/excluir camadas GIS', 'gis'),
  ('gis.feature.editar', 'Criar/editar/excluir feições GIS', 'gis')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_key)
SELECT r.id, p.k
FROM public.roles r
CROSS JOIN (VALUES ('gis.ver'),('gis.gerenciar'),('gis.feature.editar')) AS p(k)
WHERE r.nome IN ('admin','tenant_admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_key)
SELECT r.id, 'gis.ver' FROM public.roles r WHERE r.nome IN ('gac','analista','externo','empresa')
ON CONFLICT DO NOTHING;

INSERT INTO public.modules(chave, nome, descricao, core)
VALUES ('gis', 'GIS / Web SIG', 'Mapas, camadas e feições geográficas (MapLibre + OSM).', false)
ON CONFLICT (chave) DO NOTHING;

CREATE TABLE public.gis_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('ponto','linha','poligono','misto')),
  estilo jsonb NOT NULL DEFAULT '{}'::jsonb,
  publico boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gis_layers TO authenticated;
GRANT SELECT ON public.gis_layers TO anon;
GRANT ALL ON public.gis_layers TO service_role;
ALTER TABLE public.gis_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gis_layers_select" ON public.gis_layers FOR SELECT
  USING (publico = true OR public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY "gis_layers_insert" ON public.gis_layers FOR INSERT
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.gerenciar'));
CREATE POLICY "gis_layers_update" ON public.gis_layers FOR UPDATE
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.gerenciar'));
CREATE POLICY "gis_layers_delete" ON public.gis_layers FOR DELETE
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.gerenciar'));
CREATE TRIGGER trg_gis_layers_touch BEFORE UPDATE ON public.gis_layers
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE TABLE public.gis_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  layer_id uuid NOT NULL REFERENCES public.gis_layers(id) ON DELETE CASCADE,
  geometria jsonb NOT NULL,
  propriedades jsonb NOT NULL DEFAULT '{}'::jsonb,
  recurso text,
  recurso_id uuid,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gis_features TO authenticated;
GRANT SELECT ON public.gis_features TO anon;
GRANT ALL ON public.gis_features TO service_role;
ALTER TABLE public.gis_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gis_features_select" ON public.gis_features FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.gis_layers l WHERE l.id = layer_id AND l.publico = true)
    OR public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_host_admin(auth.uid())
  );
CREATE POLICY "gis_features_insert" ON public.gis_features FOR INSERT
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
CREATE POLICY "gis_features_update" ON public.gis_features FOR UPDATE
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
CREATE POLICY "gis_features_delete" ON public.gis_features FOR DELETE
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'gis.feature.editar'));
CREATE TRIGGER trg_gis_features_touch BEFORE UPDATE ON public.gis_features
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE INDEX idx_gis_features_layer ON public.gis_features(layer_id);
CREATE INDEX idx_gis_features_tenant ON public.gis_features(tenant_id);
CREATE INDEX idx_gis_features_recurso ON public.gis_features(recurso, recurso_id);
CREATE INDEX idx_gis_features_props_gin ON public.gis_features USING GIN (propriedades);
CREATE INDEX idx_gis_features_geom_gin ON public.gis_features USING GIN (geometria);

CREATE OR REPLACE FUNCTION public.gis_public_features(_layer_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, layer_id uuid, layer_nome text, geometria jsonb, propriedades jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id, f.layer_id, l.nome, f.geometria, f.propriedades
  FROM public.gis_features f
  JOIN public.gis_layers l ON l.id = f.layer_id
  WHERE l.publico = true AND l.ativo = true
    AND (_layer_id IS NULL OR f.layer_id = _layer_id)
  LIMIT 5000;
$$;
REVOKE EXECUTE ON FUNCTION public.gis_public_features(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gis_public_features(uuid) TO anon, authenticated;