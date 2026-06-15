
-- ============================================================
-- FASE 1: Profiles, Roles, Permissions, Email verification
-- ============================================================

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo text NOT NULL DEFAULT '',
  cpf text UNIQUE,
  telefone text,
  email text NOT NULL,
  email_validado boolean NOT NULL DEFAULT false,
  perfil_completo boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX idx_profiles_email ON public.profiles(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- roles ----------
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  sistema boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.roles (nome, descricao, sistema) VALUES
  ('admin', 'Administrador do Sistema', true),
  ('externo', 'Usuário Externo (padrão de cadastro)', true);

-- ---------- permissions (catalog) ----------
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  descricao text NOT NULL,
  modulo text NOT NULL
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_read_all" ON public.permissions FOR SELECT TO authenticated USING (true);

INSERT INTO public.permissions (key, descricao, modulo) VALUES
  ('empresas.criar', 'Cadastrar empresas', 'Empresas'),
  ('empresas.editar', 'Editar empresas', 'Empresas'),
  ('empresas.vincular_pessoas', 'Vincular sócio/procurador/gerente', 'Empresas'),
  ('empreendimentos.criar', 'Cadastrar empreendimentos', 'Empreendimentos'),
  ('empreendimentos.editar', 'Editar empreendimentos', 'Empreendimentos'),
  ('empreendimentos.vincular_consultor', 'Associar consultor ambiental', 'Empreendimentos'),
  ('requerimentos.criar', 'Abrir requerimentos', 'Requerimentos'),
  ('requerimentos.associar_cnpj_cpf', 'Associar CNPJ/CPF a requerimento', 'Requerimentos'),
  ('requerimentos.acompanhar', 'Acompanhar requerimentos', 'Requerimentos'),
  ('pessoas.pesquisar', 'Pesquisar pessoas físicas e jurídicas', 'Cadastros'),
  ('admin.gerenciar_papeis', 'Gerenciar papéis e permissões', 'Administração'),
  ('admin.atribuir_papel', 'Atribuir papéis a usuários', 'Administração'),
  ('admin.ver_usuarios', 'Visualizar todos os usuários', 'Administração');

-- ---------- role_permissions ----------
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- admin recebe todas as permissões
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p WHERE r.nome = 'admin';

-- ---------- user_roles ----------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  atribuido_por uuid REFERENCES auth.users(id),
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------- email_verification_codes ----------
CREATE TABLE public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  expira_em timestamptz NOT NULL,
  usado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evc_user ON public.email_verification_codes(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verification_codes TO authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- ---------- pessoas_fisicas / pessoas_juridicas ----------
CREATE TABLE public.pessoas_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL UNIQUE,
  nome text NOT NULL,
  email text,
  telefone text,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pessoas_fisicas TO authenticated;
GRANT ALL ON public.pessoas_fisicas TO service_role;
ALTER TABLE public.pessoas_fisicas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pessoas_juridicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  nome_fantasia text,
  email text,
  telefone text,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pessoas_juridicas TO authenticated;
GRANT ALL ON public.pessoas_juridicas TO service_role;
ALTER TABLE public.pessoas_juridicas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Funções SECURITY DEFINER (evitam recursão de RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_nome text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.nome = _role_nome
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND p.email_validado = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_email_validado(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT email_validado FROM public.profiles WHERE user_id = _user_id), false);
$$;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- profiles: usuário lê/edita o seu; admin lê/edita todos
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- roles: todos autenticados leem; admin gerencia
CREATE POLICY "roles_read_all" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_insert" ON public.roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_update" ON public.roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_delete" ON public.roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND sistema = false);

-- role_permissions: leitura para autenticados; escrita só admin
CREATE POLICY "rp_read_all" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp_admin_insert" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rp_admin_delete" ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: usuário vê os seus; admin vê/gerencia todos
CREATE POLICY "ur_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ur_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ur_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- email_verification_codes: usuário só os seus
CREATE POLICY "evc_self_all" ON public.email_verification_codes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pessoas: autenticados validados leem; criar/editar livre p/ validados
CREATE POLICY "pf_read" ON public.pessoas_fisicas FOR SELECT TO authenticated
  USING (public.is_email_validado(auth.uid()));
CREATE POLICY "pf_insert" ON public.pessoas_fisicas FOR INSERT TO authenticated
  WITH CHECK (public.is_email_validado(auth.uid()) AND criado_por = auth.uid());
CREATE POLICY "pf_update" ON public.pessoas_fisicas FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "pj_read" ON public.pessoas_juridicas FOR SELECT TO authenticated
  USING (public.is_email_validado(auth.uid()));
CREATE POLICY "pj_insert" ON public.pessoas_juridicas FOR INSERT TO authenticated
  WITH CHECK (public.is_email_validado(auth.uid()) AND criado_por = auth.uid());
CREATE POLICY "pj_update" ON public.pessoas_juridicas FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============================================================
-- Trigger: garantir email validado em user_roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_email_validado_on_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_nome text;
BEGIN
  SELECT nome INTO v_role_nome FROM public.roles WHERE id = NEW.role_id;
  -- 'externo' é o papel padrão atribuído automaticamente; não exige validação prévia.
  -- Demais papéis exigem e-mail validado.
  IF v_role_nome <> 'externo' AND NOT public.is_email_validado(NEW.user_id) THEN
    RAISE EXCEPTION 'Usuário precisa ter e-mail validado para receber este papel.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_email_validado
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_email_validado_on_role();

-- ============================================================
-- Trigger: ao criar usuário no auth, criar profile + papel padrão
-- Primeiro usuário cadastrado vira ADMIN automaticamente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_first boolean;
  v_role_externo uuid;
  v_role_admin uuid;
  v_nome text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (NEW.id, v_nome, NEW.email);

  SELECT (count(*) = 0) INTO v_is_first FROM public.user_roles;
  SELECT id INTO v_role_externo FROM public.roles WHERE nome = 'externo';
  SELECT id INTO v_role_admin   FROM public.roles WHERE nome = 'admin';

  IF v_is_first THEN
    -- Primeiro usuário: marca como validado e promove a admin
    UPDATE public.profiles SET email_validado = true, perfil_completo = true WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_role_admin);
  ELSE
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_role_externo);
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at no profiles
CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_touch
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
