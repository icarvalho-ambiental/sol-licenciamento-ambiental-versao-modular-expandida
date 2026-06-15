INSERT INTO public.permissions (key, modulo, descricao) VALUES
  ('design.gerenciar', 'core', 'Acessar área de Design (campos, formulários, tipos)'),
  ('tabelas.gerenciar', 'core', 'Acessar tabelas auxiliares do sistema'),
  ('tabelas.ver', 'core', 'Visualizar tabelas auxiliares do sistema'),
  ('relatorios.ver', 'core', 'Visualizar relatórios e painéis'),
  ('relatorios.emails.gerenciar', 'core', 'Gerenciar modelos de e-mail'),
  ('painel.ver', 'core', 'Visualizar painéis de controle'),
  ('admin.api_tokens.gerenciar', 'core', 'Gerenciar tokens de API'),
  ('admin.pdf_templates.gerenciar', 'core', 'Gerenciar modelos de PDF'),
  ('host.gerenciar', 'core', 'Gerenciar locatários (host SaaS)'),
  ('host.modulos.gerenciar', 'core', 'Gerenciar módulos por locatário'),
  ('maquina_estados.gerenciar', 'licenciamento', 'Configurar máquina de estados de requerimentos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE lower(r.nome) IN ('admin','administrador')
  AND p.key IN (
    'design.gerenciar','tabelas.gerenciar','tabelas.ver','relatorios.ver',
    'relatorios.emails.gerenciar','painel.ver','admin.api_tokens.gerenciar',
    'admin.pdf_templates.gerenciar','host.gerenciar','host.modulos.gerenciar',
    'maquina_estados.gerenciar'
  )
ON CONFLICT DO NOTHING;