
-- Catálogo de módulos da plataforma
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  icone text,
  core boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 100,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.modules TO authenticated, anon;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_read_all" ON public.modules FOR SELECT USING (true);
CREATE POLICY "modules_host_admin_write" ON public.modules FOR ALL
  USING (public.is_host_admin(auth.uid()))
  WITH CHECK (public.is_host_admin(auth.uid()));

-- Habilitação por locatário
CREATE TABLE public.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  habilitado boolean NOT NULL DEFAULT true,
  habilitado_em timestamptz NOT NULL DEFAULT now(),
  habilitado_por uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_modules TO authenticated;
GRANT ALL ON public.tenant_modules TO service_role;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_modules_member_read" ON public.tenant_modules FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY "tenant_modules_host_admin_write" ON public.tenant_modules FOR ALL
  USING (public.is_host_admin(auth.uid()))
  WITH CHECK (public.is_host_admin(auth.uid()));

-- Helper p/ uso futuro pelo client
CREATE OR REPLACE FUNCTION public.tenant_has_module(_tenant_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_modules tm
    JOIN public.modules m ON m.id = tm.module_id
    WHERE tm.tenant_id = _tenant_id AND m.chave = _module_key AND tm.habilitado
  ) OR EXISTS (SELECT 1 FROM public.modules WHERE chave = _module_key AND core);
$$;

-- Seed dos módulos
INSERT INTO public.modules (chave, nome, descricao, icone, core, ordem) VALUES
  ('core',           'Núcleo da Plataforma',     'Recursos transversais',                    'Settings',  true,  0),
  ('licenciamento',  'Licenciamento Ambiental',  'Empresas, empreendimentos e requerimentos','FileText',  false, 10),
  ('fiscalizacao',   'Fiscalização Ambiental',   'Autos, vistorias e infrações',             'ShieldCheck', false, 20),
  ('reurb',          'REURB',                    'Regularização fundiária urbana',           'MapPin',    false, 30),
  ('sim',            'SIM',                      'Serviço de Inspeção Municipal',            'Award',     false, 40),
  ('ater',           'ATER',                     'Assistência Técnica e Extensão Rural',     'Leaf',      false, 50),
  ('gis',            'Web SIG / GIS',            'Mapas e camadas georreferenciadas',        'Map',       false, 60);

-- Habilita Licenciamento por padrão para todos os tenants existentes
INSERT INTO public.tenant_modules (tenant_id, module_id)
SELECT t.id, m.id FROM public.tenants t CROSS JOIN public.modules m
WHERE m.chave = 'licenciamento'
ON CONFLICT DO NOTHING;
