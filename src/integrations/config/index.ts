/**
 * Carregamento de configuração de integração por tenant.
 * O segredo NÃO é lido aqui — apenas a referência (`secret_ref`),
 * que aponta para um secret armazenado no Lovable Cloud.
 */
export interface IntegrationConfig {
  tenantId: string;
  providerKey: string;
  habilitado: boolean;
  params: Record<string, unknown>;
  secretRef?: string | null;
  featureFlags: Record<string, unknown>;
}
// Implementação concreta vive em src/lib/sol/integrations-functions.ts.