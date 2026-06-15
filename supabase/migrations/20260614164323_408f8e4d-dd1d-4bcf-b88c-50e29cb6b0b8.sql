
INSERT INTO public.permissions (key, descricao, modulo) VALUES
  ('documento.ver',       'Visualizar documentos emitidos',     'documentos'),
  ('documento.gerenciar', 'Criar/editar/excluir documentos',    'documentos'),
  ('documento.assinar',   'Assinar eletronicamente documentos', 'documentos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome IN ('admin','tenant_admin')
  AND p.key IN ('documento.ver','documento.gerenciar','documento.assinar')
ON CONFLICT DO NOTHING;

INSERT INTO public.modules (chave, nome, descricao, core)
VALUES ('documentos', 'Documentos & Assinatura', 'Emissão, QR Code e assinatura eletrônica de documentos', true)
ON CONFLICT (chave) DO NOTHING;

-- ============ documentos ============
CREATE TABLE IF NOT EXISTS public.documentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requerimento_id uuid REFERENCES public.requerimentos(id) ON DELETE SET NULL,
  tipo            text NOT NULL DEFAULT 'generico',
  titulo          text NOT NULL,
  descricao       text,
  bucket          text NOT NULL DEFAULT 'tenant-docs',
  path            text NOT NULL,
  mime            text,
  tamanho_bytes   bigint,
  paginas         int,
  hash_sha256     text,
  status          text NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','emitido','assinado','revogado')),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documentos_tenant_idx       ON public.documentos(tenant_id);
CREATE INDEX IF NOT EXISTS documentos_requerimento_idx ON public.documentos(requerimento_id);
CREATE INDEX IF NOT EXISTS documentos_status_idx       ON public.documentos(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.ver'));
CREATE POLICY "documentos_insert" ON public.documentos FOR INSERT TO authenticated
WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'));
CREATE POLICY "documentos_update" ON public.documentos FOR UPDATE TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'))
WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'));
CREATE POLICY "documentos_delete" ON public.documentos FOR DELETE TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'));

CREATE TRIGGER documentos_touch BEFORE UPDATE ON public.documentos
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER documentos_audit AFTER INSERT OR UPDATE OR DELETE ON public.documentos
FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- ============ qr_tokens ============
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  documento_id  uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  expira_em     timestamptz,
  acessos       int  NOT NULL DEFAULT 0,
  ultimo_acesso timestamptz,
  revogado      boolean NOT NULL DEFAULT false,
  criado_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_tokens_documento_idx ON public.qr_tokens(documento_id);
CREATE INDEX IF NOT EXISTS qr_tokens_tenant_idx    ON public.qr_tokens(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_tokens TO authenticated;
GRANT ALL ON public.qr_tokens TO service_role;

ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_tokens_select" ON public.qr_tokens FOR SELECT TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.ver'));
CREATE POLICY "qr_tokens_manage" ON public.qr_tokens FOR ALL TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'))
WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.gerenciar'));

CREATE TRIGGER qr_tokens_touch BEFORE UPDATE ON public.qr_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ============ assinaturas ============
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  documento_id     uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  signatario_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signatario_nome  text NOT NULL,
  signatario_email text,
  papel            text,
  hash_sha256      text NOT NULL,
  ip               inet,
  user_agent       text,
  assinado_em      timestamptz NOT NULL DEFAULT now(),
  criado_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assinaturas_documento_idx ON public.assinaturas(documento_id);
CREATE INDEX IF NOT EXISTS assinaturas_tenant_idx    ON public.assinaturas(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assinaturas_select" ON public.assinaturas FOR SELECT TO authenticated
USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.ver'));
CREATE POLICY "assinaturas_insert" ON public.assinaturas FOR INSERT TO authenticated
WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.assinar'));

-- ============ validar_qr_token (rota pública) ============
CREATE OR REPLACE FUNCTION public.validar_qr_token(_token text)
RETURNS TABLE (
  documento_id uuid, titulo text, tipo text, status text, hash_sha256 text,
  emitido_em timestamptz, tenant_nome text, assinaturas jsonb,
  expirado boolean, revogado boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_qr public.qr_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_qr FROM public.qr_tokens WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.qr_tokens SET acessos = acessos + 1, ultimo_acesso = now() WHERE id = v_qr.id;

  RETURN QUERY
  SELECT d.id, d.titulo, d.tipo, d.status, d.hash_sha256, d.criado_em, t.nome,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'nome', a.signatario_nome, 'papel', a.papel, 'assinado_em', a.assinado_em
           ) ORDER BY a.assinado_em)
           FROM public.assinaturas a WHERE a.documento_id = d.id
         ), '[]'::jsonb),
         (v_qr.expira_em IS NOT NULL AND v_qr.expira_em < now()),
         v_qr.revogado
  FROM public.documentos d
  JOIN public.tenants t ON t.id = d.tenant_id
  WHERE d.id = v_qr.documento_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.validar_qr_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validar_qr_token(text) TO anon, authenticated, service_role;
