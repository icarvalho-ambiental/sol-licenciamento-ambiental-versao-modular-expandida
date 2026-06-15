
-- RELATORIOS
CREATE TABLE public.relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  entidade text NOT NULL CHECK (entidade IN ('empresas','empreendimentos','requerimentos','condicionantes')),
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios TO authenticated;
GRANT ALL ON public.relatorios TO service_role;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY rel_sel ON public.relatorios FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY rel_ins ON public.relatorios FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY rel_upd ON public.relatorios FOR UPDATE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY rel_del ON public.relatorios FOR DELETE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE TRIGGER trg_rel_touch BEFORE UPDATE ON public.relatorios FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- PAINEIS
CREATE TABLE public.paineis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paineis TO authenticated;
GRANT ALL ON public.paineis TO service_role;
ALTER TABLE public.paineis ENABLE ROW LEVEL SECURITY;
CREATE POLICY pai_sel ON public.paineis FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY pai_ins ON public.paineis FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY pai_upd ON public.paineis FOR UPDATE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY pai_del ON public.paineis FOR DELETE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE TRIGGER trg_pai_touch BEFORE UPDATE ON public.paineis FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- PDF TEMPLATES
CREATE TABLE public.pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'requerimento',
  html text NOT NULL,
  css text DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_templates TO authenticated;
GRANT ALL ON public.pdf_templates TO service_role;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdf_sel ON public.pdf_templates FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));
CREATE POLICY pdf_ins ON public.pdf_templates FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY pdf_upd ON public.pdf_templates FOR UPDATE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY pdf_del ON public.pdf_templates FOR DELETE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE TRIGGER trg_pdf_touch BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- API TOKENS (somente hash armazenado)
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  prefixo text NOT NULL,
  escopos text[] NOT NULL DEFAULT ARRAY['read']::text[],
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ultimo_uso_em timestamptz,
  expira_em timestamptz,
  revogado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tok_sel ON public.api_tokens FOR SELECT TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY tok_ins ON public.api_tokens FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY tok_upd ON public.api_tokens FOR UPDATE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY tok_del ON public.api_tokens FOR DELETE TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- TELEGRAM BINDINGS
CREATE TABLE public.telegram_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  username text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chat_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_bindings TO authenticated;
GRANT ALL ON public.telegram_bindings TO service_role;
ALTER TABLE public.telegram_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tg_sel ON public.telegram_bindings FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY tg_mod ON public.telegram_bindings FOR ALL TO authenticated USING (public.is_tenant_admin(auth.uid(), tenant_id)) WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- Função helper: validar token de API (chamada via supabaseAdmin nas rotas /api/v1)
CREATE OR REPLACE FUNCTION public.api_token_validate(_token_hash text)
RETURNS TABLE(tenant_id uuid, escopos text[], token_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id, escopos, id
  FROM public.api_tokens
  WHERE token_hash = _token_hash
    AND revogado = false
    AND (expira_em IS NULL OR expira_em > now())
  LIMIT 1;
$$;
