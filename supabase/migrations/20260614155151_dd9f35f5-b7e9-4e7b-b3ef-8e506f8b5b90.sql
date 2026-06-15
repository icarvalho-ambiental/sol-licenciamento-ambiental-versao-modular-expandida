
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'has_permission(uuid,text)',
    'has_role(uuid,text)',
    'is_email_validado(uuid)',
    'is_tenant_member(uuid,uuid)',
    'is_tenant_admin(uuid,uuid)',
    'is_host_admin(uuid)',
    'tenant_has_permission(uuid,uuid,text)',
    'tenant_has_module(uuid,text)',
    'enforce_email_validado_on_role()',
    'handle_new_user()',
    'notify_cond_assigned()',
    'condicionantes_marcar_vencidas()',
    'audit_row()',
    'api_token_validate(text)',
    'requerimento_check_transition()',
    'notify_req_status_change()'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, public', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;
