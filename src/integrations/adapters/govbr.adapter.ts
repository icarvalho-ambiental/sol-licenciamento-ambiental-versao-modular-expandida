import type { AuthFederadaProvider } from "../contracts/auth-federada";

/** Stub estrutural Gov.br (Conecta). Integração real implementada depois. */
export const govbrAdapter: AuthFederadaProvider = {
  key: "govbr",
  async startLogin() { throw new Error("[govbr] startLogin: not implemented"); },
  async handleCallback() { throw new Error("[govbr] handleCallback: not implemented"); },
};