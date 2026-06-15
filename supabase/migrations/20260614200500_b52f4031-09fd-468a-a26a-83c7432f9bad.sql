-- TENANTS
alter table public.tenants
  add column if not exists municipio_id bigint references public.municipios(id);
create index if not exists idx_tenants_municipio_id on public.tenants(municipio_id);

-- CIDADES → MUNICIPIOS (compat)
alter table public.cidades add column if not exists municipio_id bigint references public.municipios(id);
update public.cidades c
  set municipio_id = m.id
  from public.municipios m
  where c.municipio_id is null
    and upper(c.uf) = m.uf
    and lower(c.nome) = lower(m.nome);
create or replace view public.cidades_compat as
  select m.id as municipio_id,
         m.codigo_ibge,
         coalesce(c.nome, m.nome) as nome,
         coalesce(c.uf, m.uf) as uf,
         c.id as cidade_legacy_id
  from public.municipios m
  left join public.cidades c on c.municipio_id = m.id;
grant select on public.cidades_compat to authenticated, anon;

-- EMPRESAS / EMPREENDIMENTOS
alter table public.empresas add column if not exists municipio_id bigint references public.municipios(id);
alter table public.empreendimentos add column if not exists municipio_id bigint references public.municipios(id);
create index if not exists idx_empresas_municipio_id on public.empresas(municipio_id);
create index if not exists idx_empreendimentos_municipio_id on public.empreendimentos(municipio_id);

-- MODULES — coluna auxiliar
alter table public.modules add column if not exists categoria text;

-- INTEGRATION_PROVIDERS
create table if not exists public.integration_providers (
  key text primary key,
  nome text not null,
  categoria text not null check (categoria in ('auth','assinatura','validacao','consulta','protocolo','outro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.integration_providers to authenticated;
grant all on public.integration_providers to service_role;
alter table public.integration_providers enable row level security;
drop policy if exists "ip_select_auth" on public.integration_providers;
create policy "ip_select_auth" on public.integration_providers for select to authenticated using (true);
drop policy if exists "ip_host_admin_write" on public.integration_providers;
create policy "ip_host_admin_write" on public.integration_providers for all to authenticated
  using (public.is_host_admin(auth.uid())) with check (public.is_host_admin(auth.uid()));

-- INTEGRATION_CONFIGS
create table if not exists public.integration_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_key text not null references public.integration_providers(key),
  habilitado boolean not null default false,
  params jsonb not null default '{}'::jsonb,
  secret_ref text,
  feature_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider_key)
);
grant select, insert, update, delete on public.integration_configs to authenticated;
grant all on public.integration_configs to service_role;
alter table public.integration_configs enable row level security;
drop policy if exists "ic_tenant_admin_all" on public.integration_configs;
create policy "ic_tenant_admin_all" on public.integration_configs for all to authenticated
  using (public.is_host_admin(auth.uid()) or public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_host_admin(auth.uid()) or public.is_tenant_admin(auth.uid(), tenant_id));

create or replace function public.touch_integration_configs() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_integration_configs on public.integration_configs;
create trigger trg_touch_integration_configs before update on public.integration_configs
  for each row execute function public.touch_integration_configs();

-- INTEGRATION_LOGS
create table if not exists public.integration_logs (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  provider_key text not null,
  operacao text not null,
  status text not null check (status in ('ok','erro','timeout')),
  duracao_ms int,
  request jsonb,
  response jsonb,
  erro text,
  criado_em timestamptz not null default now()
);
grant select on public.integration_logs to authenticated;
grant all on public.integration_logs to service_role;
alter table public.integration_logs enable row level security;
drop policy if exists "il_tenant_admin_read" on public.integration_logs;
create policy "il_tenant_admin_read" on public.integration_logs for select to authenticated
  using (public.is_host_admin(auth.uid()) or (tenant_id is not null and public.is_tenant_admin(auth.uid(), tenant_id)));
create index if not exists idx_integration_logs_tenant on public.integration_logs(tenant_id, criado_em desc);
create index if not exists idx_integration_logs_provider on public.integration_logs(provider_key, criado_em desc);

-- GIS
alter table public.gis_layers add column if not exists module_key text;
alter table public.gis_layers add column if not exists srid int not null default 4674;
alter table public.gis_features add column if not exists tipo_geom text
  check (tipo_geom in ('point','line','polygon','multipolygon'));
create index if not exists idx_gis_layers_module_key on public.gis_layers(module_key);

-- Seed providers
insert into public.integration_providers (key, nome, categoria) values
  ('govbr', 'Gov.br (Conecta)', 'auth'),
  ('icp_brasil', 'ICP-Brasil', 'assinatura')
on conflict (key) do nothing;

-- Seed módulos estruturais (sem tocar nas habilitações por tenant)
insert into public.modules (chave, nome, descricao, core, categoria, ordem) values
  ('licenciamento','Licenciamento Ambiental','Processos de licenciamento ambiental', false, 'ambiental', 10),
  ('fiscalizacao','Fiscalização Ambiental','Ações fiscalizatórias', false, 'ambiental', 20),
  ('reurb','REURB','Regularização Fundiária Urbana', false, 'urbano', 30),
  ('sim','SIM','Serviço de Inspeção Municipal', false, 'agro', 40),
  ('ater','ATER','Assistência Técnica e Extensão Rural', false, 'agro', 50),
  ('notificacoes','Notificações','Notificações ambientais e denúncias', false, 'ambiental', 60),
  ('vistorias','Vistorias','Vistorias técnicas', false, 'tecnico', 70),
  ('pericias','Perícias','Perícias ambientais', false, 'tecnico', 80),
  ('sigweb','SIGWeb / GIS','Mapa e camadas geoespaciais', false, 'gis', 90)
on conflict (chave) do update set
  nome = excluded.nome,
  categoria = coalesce(excluded.categoria, public.modules.categoria),
  ordem = coalesce(excluded.ordem, public.modules.ordem);