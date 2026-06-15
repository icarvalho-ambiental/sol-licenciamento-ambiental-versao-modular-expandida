import type { AssinaturaDigitalProvider } from "../contracts/assinatura-digital";

/** Stub estrutural ICP-Brasil. Integração real implementada depois. */
export const icpBrasilAdapter: AssinaturaDigitalProvider = {
  key: "icp_brasil",
  async assinar() { throw new Error("[icp_brasil] assinar: not implemented"); },
  async validar() { throw new Error("[icp_brasil] validar: not implemented"); },
};