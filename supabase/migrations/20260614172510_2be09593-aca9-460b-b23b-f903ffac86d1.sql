
CREATE TABLE public.api_request_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.api_tokens(id) ON DELETE SET NULL,
  rota text NOT NULL,
  metodo text NOT NULL,
  status int NOT NULL,
  latencia_ms int,
  ip text,
  user_agent text,
  escopos text[],
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins do tenant visualizam logs"
  ON public.api_request_log FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_host_admin(auth.uid()));

CREATE INDEX api_request_log_token_time ON public.api_request_log (token_id, criado_em DESC);
CREATE INDEX api_request_log_tenant_time ON public.api_request_log (tenant_id, criado_em DESC);

CREATE OR REPLACE FUNCTION public.api_rate_check(_token_id uuid, _window_seconds int DEFAULT 60)
RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.api_request_log
  WHERE token_id = _token_id
    AND criado_em > now() - make_interval(secs => _window_seconds);
$$;

REVOKE EXECUTE ON FUNCTION public.api_rate_check(uuid, int) FROM anon;
