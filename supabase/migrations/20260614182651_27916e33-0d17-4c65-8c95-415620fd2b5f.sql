
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_first boolean;
  v_role_externo uuid;
  v_role_admin uuid;
  v_nome text;
  v_aceite boolean;
  v_versao text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1));
  v_aceite := COALESCE((NEW.raw_user_meta_data->>'termos_aceitos')::boolean, false);
  v_versao := NEW.raw_user_meta_data->>'termos_versao';

  INSERT INTO public.profiles (user_id, nome_completo, email, termos_aceitos_em, termos_versao)
  VALUES (NEW.id, v_nome, NEW.email,
    CASE WHEN v_aceite THEN now() ELSE NULL END,
    CASE WHEN v_aceite THEN COALESCE(v_versao, '1.0') ELSE NULL END);

  SELECT (count(*) = 0) INTO v_is_first FROM public.user_roles;
  SELECT id INTO v_role_externo FROM public.roles WHERE nome = 'externo';
  SELECT id INTO v_role_admin   FROM public.roles WHERE nome = 'admin';

  IF v_is_first THEN
    UPDATE public.profiles SET email_validado = true, perfil_completo = true WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_role_admin);
  ELSE
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_role_externo);
  END IF;

  RETURN NEW;
END $$;
