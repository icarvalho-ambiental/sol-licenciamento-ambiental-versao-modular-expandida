
CREATE OR REPLACE FUNCTION public.has_empreendimento_vinculo(_user_id uuid, _empreendimento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empreendimento_vinculos
    WHERE empreendimento_id = _empreendimento_id
      AND user_id = _user_id
      AND ativo
  );
$$;

DROP POLICY IF EXISTS emp_read_vinculados ON public.empreendimentos;
CREATE POLICY emp_read_vinculados ON public.empreendimentos
FOR SELECT TO authenticated
USING (public.has_empreendimento_vinculo(auth.uid(), id));
