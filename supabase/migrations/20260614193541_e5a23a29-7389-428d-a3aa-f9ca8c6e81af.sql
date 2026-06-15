
-- 1) Expand tenants (clientes)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS tipo_cliente text NOT NULL DEFAULT 'municipio',
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS uf char(2),
  ADD COLUMN IF NOT EXISTS codigo_ibge text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_email text,
  ADD COLUMN IF NOT EXISTS responsavel_telefone text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS razao_social text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tenants_tipo_cliente_chk') THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_tipo_cliente_chk
      CHECK (tipo_cliente IN ('municipio','consorcio_publico'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tenants_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.uf IS NOT NULL THEN NEW.uf := upper(NEW.uf); END IF;
  IF NEW.cnpj IS NOT NULL THEN NEW.cnpj := regexp_replace(NEW.cnpj, '\D', '', 'g'); END IF;
  IF NEW.responsavel_email IS NOT NULL
     AND NEW.responsavel_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'responsavel_email invalido: %', NEW.responsavel_email;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo_cliente = 'municipio' THEN
      IF NEW.cnpj IS NULL OR NEW.uf IS NULL OR NEW.codigo_ibge IS NULL THEN
        RAISE EXCEPTION 'Cliente do tipo municipio exige cnpj, uf e codigo_ibge.';
      END IF;
    ELSIF NEW.tipo_cliente = 'consorcio_publico' THEN
      IF NEW.cnpj IS NULL THEN
        RAISE EXCEPTION 'Cliente do tipo consorcio_publico exige cnpj.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tenants_validate ON public.tenants;
CREATE TRIGGER trg_tenants_validate
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_validate();

-- 2) Municipios (IBGE)
CREATE TABLE IF NOT EXISTS public.municipios (
  id           bigserial PRIMARY KEY,
  codigo_ibge  char(7) NOT NULL UNIQUE,
  nome         text NOT NULL,
  uf           char(2) NOT NULL,
  estado_nome  text NOT NULL,
  regiao       text NOT NULL,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT municipios_codigo_ibge_chk CHECK (codigo_ibge ~ '^[0-9]{7}$'),
  CONSTRAINT municipios_uf_chk          CHECK (uf ~ '^[A-Z]{2}$'),
  CONSTRAINT municipios_regiao_chk      CHECK (regiao IN ('Norte','Nordeste','Centro-Oeste','Sudeste','Sul'))
);

GRANT SELECT ON public.municipios TO anon, authenticated;
GRANT ALL    ON public.municipios TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.municipios_id_seq TO service_role;

ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "municipios_read_all" ON public.municipios;
CREATE POLICY "municipios_read_all" ON public.municipios FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_municipios_nome         ON public.municipios (nome);
CREATE INDEX IF NOT EXISTS idx_municipios_uf           ON public.municipios (uf);
CREATE INDEX IF NOT EXISTS idx_municipios_uf_nome      ON public.municipios (uf, nome);
CREATE INDEX IF NOT EXISTS idx_municipios_codigo_ibge  ON public.municipios (codigo_ibge);

CREATE OR REPLACE FUNCTION public.set_updated_at_municipios()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_set_updated_at_municipios ON public.municipios;
CREATE TRIGGER trg_set_updated_at_municipios
  BEFORE UPDATE ON public.municipios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_municipios();

INSERT INTO public.municipios (codigo_ibge, nome, uf, estado_nome, regiao, ativo)
VALUES
  ('1200013','Acrelândia','AC','Acre','Norte', true),
  ('1200054','Assis Brasil','AC','Acre','Norte', true)
ON CONFLICT (codigo_ibge) DO UPDATE SET
  nome        = EXCLUDED.nome,
  uf          = EXCLUDED.uf,
  estado_nome = EXCLUDED.estado_nome,
  regiao      = EXCLUDED.regiao,
  ativo       = EXCLUDED.ativo,
  updated_at  = now();
