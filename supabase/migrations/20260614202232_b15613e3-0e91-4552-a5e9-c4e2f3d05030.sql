-- CEPRAM 4579 classification + empreendimento vínculos + GIS/CEPRAM fields

create table if not exists public.cepram_divisoes (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nome text not null unique,
  ordem int default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.cepram_divisoes to authenticated;
grant all on public.cepram_divisoes to service_role;
alter table public.cepram_divisoes enable row level security;
drop policy if exists "cepram_div_read" on public.cepram_divisoes;
create policy "cepram_div_read" on public.cepram_divisoes for select to authenticated using (true);
drop policy if exists "cepram_div_admin_write" on public.cepram_divisoes;
create policy "cepram_div_admin_write" on public.cepram_divisoes for all to authenticated
  using (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'));

create table if not exists public.cepram_grupos (
  id uuid primary key default gen_random_uuid(),
  divisao_id uuid not null references public.cepram_divisoes(id) on delete cascade,
  codigo text,
  nome text not null,
  ordem int default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (divisao_id, nome)
);
grant select on public.cepram_grupos to authenticated;
grant all on public.cepram_grupos to service_role;
alter table public.cepram_grupos enable row level security;
drop policy if exists "cepram_grp_read" on public.cepram_grupos;
create policy "cepram_grp_read" on public.cepram_grupos for select to authenticated using (true);
drop policy if exists "cepram_grp_admin_write" on public.cepram_grupos;
create policy "cepram_grp_admin_write" on public.cepram_grupos for all to authenticated
  using (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'));

create table if not exists public.cepram_tipologias (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.cepram_grupos(id) on delete cascade,
  nome text not null,
  unidade_medida_default text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo_id, nome)
);
grant select on public.cepram_tipologias to authenticated;
grant all on public.cepram_tipologias to service_role;
alter table public.cepram_tipologias enable row level security;
drop policy if exists "cepram_tip_read" on public.cepram_tipologias;
create policy "cepram_tip_read" on public.cepram_tipologias for select to authenticated using (true);
drop policy if exists "cepram_tip_admin_write" on public.cepram_tipologias;
create policy "cepram_tip_admin_write" on public.cepram_tipologias for all to authenticated
  using (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'));

do $$ begin
  create type public.potencial_poluidor as enum ('baixo','medio','alto');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.porte_empreendimento as enum ('pequeno','medio','grande','excepcional');
exception when duplicate_object then null; end $$;

create table if not exists public.cepram_enquadramentos (
  id uuid primary key default gen_random_uuid(),
  tipologia_id uuid not null references public.cepram_tipologias(id) on delete cascade,
  faixa_min numeric not null default 0,
  faixa_max numeric,
  unidade_medida text not null,
  potencial_poluidor public.potencial_poluidor not null,
  porte public.porte_empreendimento not null,
  classe int not null check (classe between 1 and 6),
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cepram_enq_tip on public.cepram_enquadramentos(tipologia_id);
grant select on public.cepram_enquadramentos to authenticated;
grant all on public.cepram_enquadramentos to service_role;
alter table public.cepram_enquadramentos enable row level security;
drop policy if exists "cepram_enq_read" on public.cepram_enquadramentos;
create policy "cepram_enq_read" on public.cepram_enquadramentos for select to authenticated using (true);
drop policy if exists "cepram_enq_admin_write" on public.cepram_enquadramentos;
create policy "cepram_enq_admin_write" on public.cepram_enquadramentos for all to authenticated
  using (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_host_admin(auth.uid()) or public.has_role(auth.uid(),'admin'));

drop trigger if exists trg_touch_cepram_div on public.cepram_divisoes;
create trigger trg_touch_cepram_div before update on public.cepram_divisoes for each row execute function public.set_updated_at_municipios();
drop trigger if exists trg_touch_cepram_grp on public.cepram_grupos;
create trigger trg_touch_cepram_grp before update on public.cepram_grupos for each row execute function public.set_updated_at_municipios();
drop trigger if exists trg_touch_cepram_tip on public.cepram_tipologias;
create trigger trg_touch_cepram_tip before update on public.cepram_tipologias for each row execute function public.set_updated_at_municipios();
drop trigger if exists trg_touch_cepram_enq on public.cepram_enquadramentos;
create trigger trg_touch_cepram_enq before update on public.cepram_enquadramentos for each row execute function public.set_updated_at_municipios();

do $$ begin
  create type public.vinculo_papel as enum ('administrador','consultor','procurador','gerente','responsavel_tecnico');
exception when duplicate_object then null; end $$;

create table if not exists public.empreendimento_vinculos (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  cpf text not null,
  nome text,
  papel public.vinculo_papel not null,
  user_id uuid,
  ativo boolean not null default true,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  aceito_em timestamptz,
  unique (empreendimento_id, cpf, papel)
);
create index if not exists idx_emp_vinc_cpf on public.empreendimento_vinculos(cpf);
create index if not exists idx_emp_vinc_user on public.empreendimento_vinculos(user_id);
grant select, insert, update, delete on public.empreendimento_vinculos to authenticated;
grant all on public.empreendimento_vinculos to service_role;
alter table public.empreendimento_vinculos enable row level security;

drop policy if exists "emp_vinc_read" on public.empreendimento_vinculos;
create policy "emp_vinc_read" on public.empreendimento_vinculos for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.empreendimentos e
      where e.id = empreendimento_id
        and (e.criado_por = auth.uid() or public.is_tenant_member(auth.uid(), e.tenant_id))
    )
  );
drop policy if exists "emp_vinc_write" on public.empreendimento_vinculos;
create policy "emp_vinc_write" on public.empreendimento_vinculos for all to authenticated
  using (
    exists (select 1 from public.empreendimentos e
      where e.id = empreendimento_id and (e.criado_por = auth.uid() or public.is_tenant_admin(auth.uid(), e.tenant_id)))
  )
  with check (
    exists (select 1 from public.empreendimentos e
      where e.id = empreendimento_id and (e.criado_por = auth.uid() or public.is_tenant_admin(auth.uid(), e.tenant_id)))
  );

alter table public.empreendimentos
  add column if not exists tipo_cadastro text,
  add column if not exists tipo_imovel text,
  add column if not exists area_conservacao text,
  add column if not exists cpf_administrador text,
  add column if not exists cpf_consultor text,
  add column if not exists telefone text,
  add column if not exists email text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cep text,
  add column if not exists uf text,
  add column if not exists tipologia_id uuid references public.cepram_tipologias(id) on delete set null,
  add column if not exists valor_medida numeric,
  add column if not exists unidade_medida text,
  add column if not exists potencial_poluidor public.potencial_poluidor,
  add column if not exists porte public.porte_empreendimento,
  add column if not exists classe int,
  add column if not exists utm_zona text,
  add column if not exists utm_easting numeric,
  add column if not exists utm_northing numeric;

drop policy if exists "emp_read_vinculados" on public.empreendimentos;
create policy "emp_read_vinculados" on public.empreendimentos for select to authenticated
  using (
    exists (
      select 1 from public.empreendimento_vinculos v
      where v.empreendimento_id = empreendimentos.id
        and v.ativo
        and v.user_id = auth.uid()
    )
  );

create temporary table _tmp_cepram_seed (
  divisao text, grupo text, tipologia text, unidade text
) on commit drop;

insert into _tmp_cepram_seed (divisao, grupo, tipologia, unidade) values
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Criação de Bovinos Bovinos, Bubalinos, Muares e Equinos |CONFINADOS',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Aves e Pequenos Mamíferos |CONFINADOS',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Caprinos e Ovinos |CONFINADOS',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Suínos |CONFINADOS',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Creche de Suínos |CONFINADOS',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Piscicultura em Viveiros Escavados |PSICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Piscicultura Continental em Tanques-Rede, Raceway ou Similar |PSICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Piscicultura Marinha em Tanques-Rede, Raceway ou Similar |PSICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Carcinicultura em Viveiros Escavados |CARCINICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Ranicultura |CARCINICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Algicultura |CARCINICULTURA',''),
  ('DIVISÃO A: AGRICULTURA E FLORESTAS','Grupo A2: Criação de Animais','Malacocultura |CARCINICULTURA',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Areias, Arenoso, Cascalhos. Filitos e Saibro',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Areias em Recursos Hídricos',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Caulim',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Hídricos',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Basalto, Calários, Gnaisses, Granitos, Ganulitos, Metarenitos, Quartzitos, Sienitos, dentre outras utilizadas para a produção de Agregados e Beneficiamento Associado (Britamento)',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B3: Minerais Utilizados na Construção Civil, Ornamentos e Outros','Ardósia, Dioritos, Granitos, Mármores, Quartzos, Sienitos, dentre outras utilizadas para Revestimentos',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B4: Minerais Utilizados na Indústria','Argilas, Caulinita, Diatomita, Ilita, Caulim dentre outros',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B4: Minerais Utilizados na Indústria','Cianita, Feldspato, Moscovita, Nefelina, Quartzo e Turmalina, dentre outros para manufatura de vidro/Vitrificação, Esmaltação e Indústria e Indústria Óptica, Eletrônica, etc.',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B4: Minerais Utilizados na Indústria','Apatita, Calcário Dolomítico, Calcita, Carnalita, Dolomita, Fosfatos, Minerais de Borato, Potássio, Salgema, Salitre, Silvita e Sódio, dentre outros, para Produção de Fertilizantes e Corretivos Agrícolas, etc.',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B4: Minerais Utilizados na Indústria','Andalusita, Anfibólios, Caulinita, Coríndon, Feldspato, Grafita, Moscovita, Pegmatito, Quartzito, Serpentinito, Silex, Vermiculita, Wollastonita, Xisto e Zirconita, dentre outros para uso Industrial não especificados anteriormente',''),
  ('DIVISÃO B: MINERAÇÃO','Grupo B4: Minerais Utilizados na Indústria','Anidrita, Barita, Bentonita, Calcário Conchífero, Calcário Calcitico, Calcita, Diatomita, Gipsita, Magnesita e Talco',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Frigorífico e/ou Abate de Bovinos, Equinos, Muares |CARNES E DERIVADOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Frigorífico e/ou Abate de Caprinos, Suínos |CARNES E DERIVADOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Abate de Aves |CARNES E DERIVADOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Beneficiamento de Carnes |CARNES E DERIVADOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Pasteurização e derivados do leite |LATICÍNIOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Industrialização de Frutas, Verduras e Legumes (Compotas, Geléias, Polpas, Doces, etc)  |CONSERVA, ENLATADOS E CONGELADOS DE FRUTAS E VEGETAIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Fabricação de Farinhas, Amidos, Féculas de Cereais, Macarrão, Biscoitos e Assemelhados | CEREAIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Industrialização da Mandioca | CEREAIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Fabricação de Óleos, Margarina e Outras Gorduras Vegetais |ÓLEOS E GORDURAS VEGETAIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Destiladas (Aguardente, Whisky e Outros) |PRODUÇÃO E ENVASE DE BEBIDAS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Fermentadas (Vinhos, Cervejas e Outros) |PRODUÇÃO E ENVASE DE BEBIDAS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Não Alcoólicas (Refrigerantes, Chá, Sucos e Assemelhados) |PRODUÇÃO E ENVASE DE BEBIDAS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Água Mineral |PRODUÇÃO E ENVASE DE BEBIDAS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C1: Produtos Alimentícios e Assemelhados','Fabricação de Ração Animal |ALIMENTOS DIVERSOS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C2: Produtos do Fumo','Processamento e Fabricação de Cigarros, Cigarrilhas, Charutos e Assemelhados',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C3: Produtos Têxteis','Beneficiamento, Fiação ou Tecelagem de Fibras Têxteis',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C3: Produtos Têxteis','Fabricação de Artigos Têxteis com Lavagem e/ou Pintura |FABRICAÇÃO DE ARTIGOS TÊXTEIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C3: Produtos Têxteis','Fabricação de Absorventes e Fraldas descartáveis |FABRICAÇÃO DE ARTIGOS TÊXTEIS',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C4: Madeira e Mobiliário','Desdobramento Pranchas, Dormentes e Pranchões',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C4: Madeira e Mobiliário','Fabricação de Madeira Compensada, Folheada e Laminada',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C4: Madeira e Mobiliário','Fabricação de Artefatos de Madeira com Tratamento (Pintura, Verniz, Cola e Assemelhados) |FABRICAÇÃO DE ARTEFATOS DE MADEIRA',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C5: Papel e Produtos Semelhantes','Fabricação de Papel',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C5: Papel e Produtos Semelhantes','Fabricação de Produtos de Papel Ondulado, Cartolina, Papelão, Papel Cartão ou Semelhantes, Papel Higiênico, Produtos para uso doméstico, bem como Embalagens',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C6: Fabricação de Produtos Químicos','Fabricação e Mistura de Produtos de Limpeza, Polimento e Para Uso Sanitário | Produtos de Limpeza, Polimento e Para Uso Sanitário',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C6: Fabricação de Produtos Químicos','Fabricação e Mistura de Perfumes, Cosméticos e Preparados para Higiene Pessoal | Perfumes, Cosméticos e Preparados para Higiene Pessoal',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C6: Fabricação de Produtos Químicos','Velas | Perfumes, Cosméticos e Preparados para Higiene Pessoal',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C7: Refino do Petróleo, Produção de Biodiesel e Produtos Relacionados','Usina de Asfalto e Emulsão Asfáltica',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C7: Refino do Petróleo, Produção de Biodiesel e Produtos Relacionados','Óleos e Graxas Lubrificantes',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C7: Refino do Petróleo, Produção de Biodiesel e Produtos Relacionados','Biocombustível',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Beneficiamento de borracha natural',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Fabricação de Pneus e Câmaras de Ar | Fabricação e Recondicionamento de Pneus e Câmaras de Ar',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Recondicionamento de Pneus | Fabricação e Recondicionamento de Pneus e Câmaras de Ar',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Fabricação de Artefatos de Borracha ou Plástico (Baldes, PET, Elástico e Assemelhados)',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Fabricação de Calçados, Bolsas, Acessórios e Semelhantes',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C8: Materiais de Borracha, de Plástico ou Sintéticos','Fabricação de Equipamentos e Acessórios para Segurança e Proteção Pessoal e Profissional',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C9: Couro e Produtos de Couro','Beneficiamento de Couros e Peles sem uso de produto químico (salgadeira)',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C9: Couro e Produtos de Couro','Fabricação de Artigos de Couro',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C10: Vidro, Pedra, Argila, Gesso, Mármore e Concreto','Fabricação do Vidro',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C10: Vidro, Pedra, Argila, Gesso, Mármore e Concreto','Fabricação de Artefatos de Cimento, Pó de Mármore e Concreto | Fabricação de Artefatos de Cimento, Fibroamianto, Fibra de vidro, Pó de Mármore e Concreto',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C10: Vidro, Pedra, Argila, Gesso, Mármore e Concreto','Fabricação de Cerâmicas e Refratários',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C10: Vidro, Pedra, Argila, Gesso, Mármore e Concreto','Fabricação de Cimento, Cal e Gesso',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C10: Vidro, Pedra, Argila, Gesso, Mármore e Concreto','Beneficiamento de Mármores, Granitos, Ardósias e Pedras Ornamentais',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C11: Metalurgia','Beneficiamento e Fabricação de Produtos Metalúrgicos',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C12: Mecânica','Fabricação, Manutenção e Reparo de Máquinas e Equipamentos',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C13: Materiais Elétricos, Eletrônicos e de Comunicação','Fabricação de Componentes Elétricos, Eletrônicos e de Comunicação',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C14: Material de Transporte','Fabricação, Manutenção e Reparo de Veículos e Componentes',''),
  ('DIVISÃO C: INDÚSTRIAS','Grupo C15: Diversos','Fabricação de Móveis, Brinquedos, Instrumentos e Outros Produtos Diversos',''),
  ('DIVISÃO D: TRANSPORTE','Grupo D1: Terminais e Garagens','Terminais Rodoviários, Garagens de Ônibus e Pátios de Estacionamento',''),
  ('DIVISÃO D: TRANSPORTE','Grupo D2: Aeroportos','Aeródromos, Aeroportos e Heliportos',''),
  ('DIVISÃO D: TRANSPORTE','Grupo D3: Portos e Hidrovias','Portos, Atracadouros, Marinas e Hidrovias',''),
  ('DIVISÃO D: TRANSPORTE','Grupo D4: Dutos e Faixas','Dutos para Transporte de Combustíveis, Gases e Produtos Químicos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E1: Comércio e Armazenagem','Postos de Combustíveis, Lavagem e Lubrificação de Veículos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E1: Comércio e Armazenagem','Armazenagem e Distribuição de Combustíveis, Gases e Produtos Químicos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E1: Comércio e Armazenagem','Centros Comerciais, Shoppings e Hipermercados',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E2: Saúde e Educação','Hospitais, Clínicas, Laboratórios e Estabelecimentos de Ensino',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E3: Tratamento de Resíduos','Aterro Sanitário, Aterro Industrial e Aterro de Resíduos Inertes',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E3: Tratamento de Resíduos','Estação de Transbordo e Triagem de Resíduos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E3: Tratamento de Resíduos','Compostagem e Reciclagem de Resíduos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E3: Tratamento de Resíduos','Coprocessamento e Incineração de Resíduos',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E3: Tratamento de Resíduos','Tratamento de Resíduos de Serviços de Saúde',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E4: Saneamento Básico','Estação de Tratamento de Água (ETA)',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E4: Saneamento Básico','Estação de Tratamento de Esgoto (ETE)',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E4: Saneamento Básico','Sistema de Coleta e Adução de Água',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E4: Saneamento Básico','Sistema de Coleta e Afastamento de Esgoto',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E5: Energia','Geração e Transmissão de Energia Elétrica',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E5: Energia','Subestações e Linhas de Transmissão',''),
  ('DIVISÃO E: SERVIÇOS','Grupo E5: Energia','Parques Eólicos e Solares',''),
  ('DIVISÃO F: OBRAS CIVIS','Grupo F1: Obras Lineares','Rodovias, Ferrovias e Obras de Arte Especiais',''),
  ('DIVISÃO F: OBRAS CIVIS','Grupo F2: Obras Hidráulicas','Barragens, Açudes e Reservatórios',''),
  ('DIVISÃO F: OBRAS CIVIS','Grupo F2: Obras Hidráulicas','Canais, Diques e Obras de Drenagem',''),
  ('DIVISÃO F: OBRAS CIVIS','Grupo F2: Obras Hidráulicas','Dragagem e Desassoreamento',''),
  ('DIVISÃO G: EMPREENDIMENTOS URBANÍSTICOS, TURÍSTICOS E DE LAZER','Grupo G1: Empreendimentos de Lazer e Recreação','Estádios de Futebol, Parques Temáticos, de Diversão e de Exposição, Jardins Botânicos',''),
  ('DIVISÃO G: EMPREENDIMENTOS URBANÍSTICOS, TURÍSTICOS E DE LAZER','Grupo G2: Empreendimentos Urbanísticos','Complexos Turísticos e Empreendimentos Hoteleiros',''),
  ('DIVISÃO G: EMPREENDIMENTOS URBANÍSTICOS, TURÍSTICOS E DE LAZER','Grupo G2: Empreendimentos Urbanísticos','Parcelamento do Solo (Loteamentos, Desmembramentos)',''),
  ('DIVISÃO G: EMPREENDIMENTOS URBANÍSTICOS, TURÍSTICOS E DE LAZER','Grupo G2: Empreendimentos Urbanísticos','Conjuntos Habitacionais',''),
  ('DIVISÃO G: EMPREENDIMENTOS URBANÍSTICOS, TURÍSTICOS E DE LAZER','Grupo G2: Empreendimentos Urbanísticos','Habitação de Interesse Social',''),
  ('OUTROS','Outros','Outros','');

insert into public.cepram_divisoes (nome)
  select distinct divisao from _tmp_cepram_seed
on conflict (nome) do nothing;

insert into public.cepram_grupos (divisao_id, nome)
  select d.id, s.grupo
  from (select distinct divisao, grupo from _tmp_cepram_seed) s
  join public.cepram_divisoes d on d.nome = s.divisao
on conflict (divisao_id, nome) do nothing;

insert into public.cepram_tipologias (grupo_id, nome, unidade_medida_default)
  select g.id, s.tipologia, nullif(s.unidade,'')
  from _tmp_cepram_seed s
  join public.cepram_divisoes d on d.nome = s.divisao
  join public.cepram_grupos g on g.divisao_id = d.id and g.nome = s.grupo
on conflict (grupo_id, nome) do update set unidade_medida_default = excluded.unidade_medida_default;