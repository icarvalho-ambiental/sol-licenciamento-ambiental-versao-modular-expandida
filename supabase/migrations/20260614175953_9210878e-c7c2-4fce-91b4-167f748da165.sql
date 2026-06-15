
INSERT INTO public.modules (chave, nome, descricao, core, icone, ordem) VALUES
  ('fiscalizacao', 'Fiscalização', 'Autos de infração, denúncias e vistorias ambientais.', false, 'shield-alert', 30),
  ('reurb',        'REURB',        'Regularização fundiária urbana com GIS forte.',        false, 'map',          40),
  ('sim',          'SIM',          'Serviço de Inspeção Municipal.',                       false, 'beef',         50),
  ('ater',         'ATER',         'Assistência Técnica e Extensão Rural.',                false, 'sprout',       60)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.permissions (key, descricao, modulo) VALUES
  ('fiscalizacao.ver',       'Visualizar módulo de Fiscalização',                  'fiscalizacao'),
  ('fiscalizacao.gerenciar', 'Gerenciar autos, denúncias e vistorias',             'fiscalizacao'),
  ('reurb.ver',              'Visualizar módulo REURB',                            'reurb'),
  ('reurb.gerenciar',        'Gerenciar perímetros, lotes e ocupantes (REURB)',    'reurb'),
  ('sim.ver',                'Visualizar módulo SIM',                              'sim'),
  ('sim.gerenciar',          'Gerenciar estabelecimentos, produtos e inspeções',   'sim'),
  ('ater.ver',               'Visualizar módulo ATER',                             'ater'),
  ('ater.gerenciar',         'Gerenciar produtores, propriedades e visitas',       'ater'),
  ('documento.gerar_pdf',    'Gerar PDF assinado de documento',                    'core')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome = 'admin'
  AND p.key IN (
    'fiscalizacao.ver','fiscalizacao.gerenciar',
    'reurb.ver','reurb.gerenciar',
    'sim.ver','sim.gerenciar',
    'ater.ver','ater.gerenciar',
    'documento.gerar_pdf'
  )
ON CONFLICT DO NOTHING;
