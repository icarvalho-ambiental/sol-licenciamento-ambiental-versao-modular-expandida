
CREATE TYPE public.condicionante_status AS ENUM ('pendente','em_andamento','cumprida','vencida','cancelada');

CREATE TABLE public.condicionantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requerimento_id uuid NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  prazo date,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.condicionante_status NOT NULL DEFAULT 'pendente',
  notificar_dias_antes int NOT NULL DEFAULT 7,
  concluida_em timestamptz,
  concluida_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cond_tenant_idx ON public.condicionantes(tenant_id);
CREATE INDEX cond_req_idx ON public.condicionantes(requerimento_id);
CREATE INDEX cond_prazo_idx ON public.condicionantes(prazo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condicionantes TO authenticated;
GRANT ALL ON public.condicionantes TO service_role;
ALTER TABLE public.condicionantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cond_select ON public.condicionantes FOR SELECT TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'condicionante.ver'));
CREATE POLICY cond_insert ON public.condicionantes FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'condicionante.criar'));
CREATE POLICY cond_update ON public.condicionantes FOR UPDATE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'condicionante.editar'))
  WITH CHECK (public.tenant_has_permission(auth.uid(), tenant_id, 'condicionante.editar'));
CREATE POLICY cond_delete ON public.condicionantes FOR DELETE TO authenticated
  USING (public.tenant_has_permission(auth.uid(), tenant_id, 'condicionante.excluir'));

CREATE TRIGGER cond_touch BEFORE UPDATE ON public.condicionantes
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER audit_cond AFTER INSERT OR UPDATE OR DELETE ON public.condicionantes
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  requerimento_id uuid REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  condicionante_id uuid REFERENCES public.condicionantes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text,
  tipo text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notificacoes(user_id, lida);
CREATE INDEX notif_tenant_idx ON public.notificacoes(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select ON public.notificacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY notif_update ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notif_insert ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY notif_delete ON public.notificacoes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.permissions(key, modulo, descricao) VALUES
  ('condicionante.ver','condicionante','Visualizar condicionantes'),
  ('condicionante.criar','condicionante','Criar condicionantes'),
  ('condicionante.editar','condicionante','Editar condicionantes'),
  ('condicionante.excluir','condicionante','Excluir condicionantes'),
  ('condicionante.concluir','condicionante','Marcar condicionante como cumprida')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome IN ('admin','tenant_admin')
  AND p.key LIKE 'condicionante.%'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_req_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.responsavel_user_id IS NOT NULL THEN
    INSERT INTO public.notificacoes(tenant_id, user_id, requerimento_id, titulo, mensagem, tipo)
    VALUES (NEW.tenant_id, NEW.responsavel_user_id, NEW.id,
      'Status do requerimento atualizado',
      format('"%s" mudou de %s para %s.', NEW.titulo, OLD.status, NEW.status),
      'status');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER req_notify_status AFTER UPDATE OF status ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_req_status_change();

CREATE OR REPLACE FUNCTION public.notify_cond_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.responsavel_user_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW.responsavel_user_id IS DISTINCT FROM OLD.responsavel_user_id) THEN
    INSERT INTO public.notificacoes(tenant_id, user_id, requerimento_id, condicionante_id, titulo, mensagem, tipo)
    VALUES (NEW.tenant_id, NEW.responsavel_user_id, NEW.requerimento_id, NEW.id,
      'Nova condicionante atribuída',
      format('"%s"%s', NEW.titulo, COALESCE(' • Prazo: '||NEW.prazo::text,'')),
      'condicionante');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cond_notify_assign AFTER INSERT OR UPDATE OF responsavel_user_id ON public.condicionantes
  FOR EACH ROW EXECUTE FUNCTION public.notify_cond_assigned();

CREATE OR REPLACE FUNCTION public.condicionantes_marcar_vencidas()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH upd AS (
    UPDATE public.condicionantes
    SET status = 'vencida'
    WHERE status IN ('pendente','em_andamento') AND prazo IS NOT NULL AND prazo < current_date
    RETURNING id, tenant_id, responsavel_user_id, requerimento_id, titulo
  )
  INSERT INTO public.notificacoes(tenant_id, user_id, requerimento_id, condicionante_id, titulo, mensagem, tipo)
  SELECT tenant_id, responsavel_user_id, requerimento_id, id, 'Condicionante vencida', titulo, 'vencimento'
  FROM upd WHERE responsavel_user_id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
