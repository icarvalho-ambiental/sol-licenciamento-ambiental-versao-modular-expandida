
DO $$ BEGIN
  CREATE TYPE public.requerimento_status AS ENUM (
    'rascunho','enviado','em_analise','pendente_documentos',
    'aprovado','indeferido','arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.tenant_has_permission(
  _user_id uuid, _tenant_id uuid, _permission_key text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    JOIN public.role_permissions rp ON rp.role_id = tu.role_id
    JOIN public.profiles p ON p.user_id = tu.user_id
    WHERE tu.user_id = _user_id
      AND tu.tenant_id = _tenant_id
      AND tu.ativo
      AND rp.permission_key = _permission_key
      AND p.email_validado = true
  )
  OR public.is_host_admin(_user_id);
$$;

-- 1) empresas
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pessoa_juridica_id uuid NOT NULL REFERENCES public.pessoas_juridicas(id) ON DELETE RESTRICT,
  nome_fantasia text,
  consultor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, pessoa_juridica_id)
);
CREATE INDEX empresas_tenant_idx ON public.empresas(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresas_select ON public.empresas FOR SELECT TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empresa.ver'));
CREATE POLICY empresas_insert ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'empresa.criar'));
CREATE POLICY empresas_update ON public.empresas FOR UPDATE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empresa.editar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'empresa.editar'));
CREATE POLICY empresas_delete ON public.empresas FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empresa.excluir'));
CREATE TRIGGER empresas_touch BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- 2) empresa_socios
CREATE TABLE public.empresa_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  pessoa_fisica_id uuid NOT NULL REFERENCES public.pessoas_fisicas(id) ON DELETE RESTRICT,
  participacao numeric(5,2),
  eh_representante_legal boolean NOT NULL DEFAULT false,
  eh_procurador boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, pessoa_fisica_id)
);
CREATE INDEX empresa_socios_empresa_idx ON public.empresa_socios(empresa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_socios TO authenticated;
GRANT ALL ON public.empresa_socios TO service_role;
ALTER TABLE public.empresa_socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY socios_select ON public.empresa_socios FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id
    AND public.tenant_has_permission(auth.uid(), e.tenant_id, 'empresa.ver')));
CREATE POLICY socios_insert ON public.empresa_socios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id
    AND public.tenant_has_permission(auth.uid(), e.tenant_id, 'empresa.editar')));
CREATE POLICY socios_update ON public.empresa_socios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id
    AND public.tenant_has_permission(auth.uid(), e.tenant_id, 'empresa.editar')));
CREATE POLICY socios_delete ON public.empresa_socios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id
    AND public.tenant_has_permission(auth.uid(), e.tenant_id, 'empresa.editar')));

-- 3) empreendimentos
CREATE TABLE public.empreendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cidade_id uuid REFERENCES public.cidades(id) ON DELETE SET NULL,
  endereco text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  consultor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX empreendimentos_tenant_idx ON public.empreendimentos(tenant_id);
CREATE INDEX empreendimentos_empresa_idx ON public.empreendimentos(empresa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empreendimentos TO authenticated;
GRANT ALL ON public.empreendimentos TO service_role;
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY emp_select ON public.empreendimentos FOR SELECT TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empreendimento.ver'));
CREATE POLICY emp_insert ON public.empreendimentos FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'empreendimento.criar'));
CREATE POLICY emp_update ON public.empreendimentos FOR UPDATE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empreendimento.editar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'empreendimento.editar'));
CREATE POLICY emp_delete ON public.empreendimentos FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'empreendimento.excluir'));
CREATE TRIGGER emp_touch BEFORE UPDATE ON public.empreendimentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- 4) requerimentos
CREATE TABLE public.requerimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  empreendimento_id uuid NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  numero_processo text,
  titulo text NOT NULL,
  descricao text,
  status public.requerimento_status NOT NULL DEFAULT 'rascunho',
  prazo_em date,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dados_dinamicos jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX req_tenant_idx ON public.requerimentos(tenant_id);
CREATE INDEX req_emp_idx ON public.requerimentos(empreendimento_id);
CREATE INDEX req_status_idx ON public.requerimentos(status);
CREATE INDEX req_dados_gin ON public.requerimentos USING gin (dados_dinamicos);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimentos TO authenticated;
GRANT ALL ON public.requerimentos TO service_role;
ALTER TABLE public.requerimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_select ON public.requerimentos FOR SELECT TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento.ver'));
CREATE POLICY req_insert ON public.requerimentos FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento.criar'));
CREATE POLICY req_update ON public.requerimentos FOR UPDATE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento.editar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento.editar'));
CREATE POLICY req_delete ON public.requerimentos FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'requerimento.excluir'));
CREATE TRIGGER req_touch BEFORE UPDATE ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- 5) status histórico + máquina
CREATE TABLE public.requerimento_status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimento_id uuid NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  status_anterior public.requerimento_status,
  status_novo public.requerimento_status NOT NULL,
  motivo text,
  mudado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mudado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rsh_req_idx ON public.requerimento_status_historico(requerimento_id);
GRANT SELECT, INSERT ON public.requerimento_status_historico TO authenticated;
GRANT ALL ON public.requerimento_status_historico TO service_role;
ALTER TABLE public.requerimento_status_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsh_select ON public.requerimento_status_historico FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.ver')));
CREATE POLICY rsh_insert ON public.requerimento_status_historico FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.ver')));

CREATE OR REPLACE FUNCTION public.requerimento_check_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_perm text;
  v_uid uuid := auth.uid();
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  v_perm := CASE
    WHEN OLD.status = 'rascunho'            AND NEW.status = 'enviado'             THEN 'requerimento.enviar'
    WHEN OLD.status = 'enviado'             AND NEW.status = 'em_analise'          THEN 'requerimento.analisar'
    WHEN OLD.status = 'em_analise'          AND NEW.status = 'pendente_documentos' THEN 'requerimento.solicitar_documentos'
    WHEN OLD.status = 'pendente_documentos' AND NEW.status = 'em_analise'          THEN 'requerimento.analisar'
    WHEN OLD.status = 'em_analise'          AND NEW.status = 'aprovado'            THEN 'requerimento.aprovar'
    WHEN OLD.status = 'em_analise'          AND NEW.status = 'indeferido'          THEN 'requerimento.indeferir'
    WHEN NEW.status = 'arquivado'                                                  THEN 'requerimento.arquivar'
    ELSE NULL
  END;
  IF v_perm IS NULL THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
  END IF;
  IF v_uid IS NOT NULL AND NOT public.tenant_has_permission(v_uid, NEW.tenant_id, v_perm) THEN
    RAISE EXCEPTION 'Sem permissão (%) para esta transição.', v_perm;
  END IF;
  INSERT INTO public.requerimento_status_historico
    (requerimento_id, status_anterior, status_novo, mudado_por)
  VALUES (NEW.id, OLD.status, NEW.status, v_uid);
  RETURN NEW;
END $$;

CREATE TRIGGER req_status_machine
  BEFORE UPDATE OF status ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.requerimento_check_transition();

-- 6) documentos
CREATE TABLE public.requerimento_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimento_id uuid NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  enviado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rd_req_idx ON public.requerimento_documentos(requerimento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimento_documentos TO authenticated;
GRANT ALL ON public.requerimento_documentos TO service_role;
ALTER TABLE public.requerimento_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY rd_select ON public.requerimento_documentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.ver')));
CREATE POLICY rd_insert ON public.requerimento_documentos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.anexar_documento')));
CREATE POLICY rd_delete ON public.requerimento_documentos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.anexar_documento')));

-- 7) comentarios
CREATE TABLE public.requerimento_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimento_id uuid NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  autor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rc_req_idx ON public.requerimento_comentarios(requerimento_id);
GRANT SELECT, INSERT, DELETE ON public.requerimento_comentarios TO authenticated;
GRANT ALL ON public.requerimento_comentarios TO service_role;
ALTER TABLE public.requerimento_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_select ON public.requerimento_comentarios FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.ver')));
CREATE POLICY rc_insert ON public.requerimento_comentarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimentos r WHERE r.id = requerimento_id
    AND public.tenant_has_permission(auth.uid(), r.tenant_id, 'requerimento.comentar')));
CREATE POLICY rc_delete ON public.requerimento_comentarios FOR DELETE TO authenticated
  USING (autor_user_id = auth.uid());

-- 8) auditoria
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  dados_antes jsonb,
  dados_depois jsonb,
  em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aud_tenant_idx ON public.auditoria(tenant_id);
CREATE INDEX aud_tabela_idx ON public.auditoria(tabela);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY aud_select ON public.auditoria FOR SELECT TO authenticated
  USING (tenant_id IS NULL
    OR public.tenant_has_permission(auth.uid(), tenant_id, 'auditoria.ver'));
CREATE POLICY aud_insert ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant := OLD.tenant_id; v_id := OLD.id;
  ELSE
    v_tenant := NEW.tenant_id; v_id := NEW.id;
  END IF;
  INSERT INTO public.auditoria(tenant_id, user_id, tabela, registro_id, acao, dados_antes, dados_depois)
  VALUES (
    v_tenant, auth.uid(), TG_TABLE_NAME, v_id, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER audit_empresas AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_empreendimentos AFTER INSERT OR UPDATE OR DELETE ON public.empreendimentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_requerimentos AFTER INSERT OR UPDATE OR DELETE ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- 9) Permissões catalogadas
INSERT INTO public.permissions (key, descricao, modulo) VALUES
  ('empresa.ver','Visualizar empresas','empresa'),
  ('empresa.criar','Criar empresas','empresa'),
  ('empresa.editar','Editar empresas','empresa'),
  ('empresa.excluir','Excluir empresas','empresa'),
  ('empreendimento.ver','Visualizar empreendimentos','empreendimento'),
  ('empreendimento.criar','Criar empreendimentos','empreendimento'),
  ('empreendimento.editar','Editar empreendimentos','empreendimento'),
  ('empreendimento.excluir','Excluir empreendimentos','empreendimento'),
  ('requerimento.ver','Visualizar requerimentos','requerimento'),
  ('requerimento.criar','Criar requerimentos','requerimento'),
  ('requerimento.editar','Editar requerimentos','requerimento'),
  ('requerimento.excluir','Excluir requerimentos','requerimento'),
  ('requerimento.enviar','Enviar requerimento','requerimento'),
  ('requerimento.analisar','Analisar requerimento','requerimento'),
  ('requerimento.solicitar_documentos','Solicitar documentos pendentes','requerimento'),
  ('requerimento.aprovar','Aprovar requerimento','requerimento'),
  ('requerimento.indeferir','Indeferir requerimento','requerimento'),
  ('requerimento.arquivar','Arquivar requerimento','requerimento'),
  ('requerimento.comentar','Comentar em requerimentos','requerimento'),
  ('requerimento.anexar_documento','Anexar/remover documentos','requerimento'),
  ('auditoria.ver','Visualizar log de auditoria','auditoria')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome = 'admin'
  AND p.modulo IN ('empresa','empreendimento','requerimento','auditoria')
ON CONFLICT DO NOTHING;
