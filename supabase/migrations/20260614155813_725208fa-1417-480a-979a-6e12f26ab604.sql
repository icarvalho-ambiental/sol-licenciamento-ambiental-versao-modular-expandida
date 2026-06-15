
ALTER TABLE public.requerimentos
  ADD COLUMN IF NOT EXISTS publico boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS req_publico_idx ON public.requerimentos(publico) WHERE publico;

CREATE OR REPLACE FUNCTION public.consulta_publica_requerimentos(
  _q text DEFAULT NULL,
  _municipio text DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  numero_processo text,
  titulo text,
  tipo text,
  status requerimento_status,
  municipio text,
  empresa_nome text,
  empreendimento_nome text,
  atualizado_em timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.numero_processo, r.titulo, r.tipo, r.status,
         c.nome AS municipio,
         pj.razao_social AS empresa_nome,
         e.nome AS empreendimento_nome,
         r.atualizado_em
  FROM public.requerimentos r
  JOIN public.empreendimentos e ON e.id = r.empreendimento_id
  LEFT JOIN public.empresas emp ON emp.id = e.empresa_id
  LEFT JOIN public.pessoas_juridicas pj ON pj.id = emp.pessoa_juridica_id
  LEFT JOIN public.cidades c ON c.id = e.cidade_id
  WHERE r.publico = true
    AND (_municipio IS NULL OR c.nome ILIKE _municipio)
    AND (_q IS NULL OR _q = '' OR
         r.numero_processo ILIKE '%'||_q||'%' OR
         r.titulo ILIKE '%'||_q||'%' OR
         pj.razao_social ILIKE '%'||_q||'%' OR
         pj.cnpj ILIKE '%'||_q||'%' OR
         e.nome ILIKE '%'||_q||'%')
  ORDER BY r.atualizado_em DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

REVOKE EXECUTE ON FUNCTION public.consulta_publica_requerimentos(text,text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consulta_publica_requerimentos(text,text,int) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.documentos_biblioteca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text,
  descricao text,
  storage_path text NOT NULL,
  tamanho_bytes bigint,
  mime_type text,
  recurso text,
  recurso_id uuid,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_biblioteca TO authenticated;
GRANT ALL ON public.documentos_biblioteca TO service_role;

ALTER TABLE public.documentos_biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docbib_select" ON public.documentos_biblioteca
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "docbib_insert" ON public.documentos_biblioteca
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "docbib_update" ON public.documentos_biblioteca
  FOR UPDATE TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "docbib_delete" ON public.documentos_biblioteca
  FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'documento.excluir'));

CREATE INDEX IF NOT EXISTS docbib_tenant_idx ON public.documentos_biblioteca(tenant_id);
CREATE INDEX IF NOT EXISTS docbib_recurso_idx ON public.documentos_biblioteca(recurso, recurso_id);

CREATE TRIGGER trg_docbib_touch BEFORE UPDATE ON public.documentos_biblioteca
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE TRIGGER trg_docbib_audit AFTER INSERT OR UPDATE OR DELETE ON public.documentos_biblioteca
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

INSERT INTO public.permissions(key, modulo, descricao)
VALUES ('documento.excluir','documento','Excluir documentos da biblioteca')
ON CONFLICT (key) DO NOTHING;
