import { govbrAdapter } from "../adapters/govbr.adapter";
import { icpBrasilAdapter } from "../adapters/icp-brasil.adapter";

/**
 * Registro central de adapters de integração externa.
 * Regra de negócio NUNCA importa adapter direto — sempre via contrato.
 */
export const INTEGRATION_PROVIDERS = {
  govbr: govbrAdapter,
  icp_brasil: icpBrasilAdapter,
} as const;

export type IntegrationProviderKey = keyof typeof INTEGRATION_PROVIDERS;

export function getProvider<K extends IntegrationProviderKey>(key: K) {
  return INTEGRATION_PROVIDERS[key];
}