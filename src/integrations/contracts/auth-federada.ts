/** Contrato para login federado (ex.: Gov.br / Conecta). */
export interface AuthFederadaProvider {
  readonly key: string;
  startLogin(params: { redirectUri: string; state?: string }): Promise<{ url: string }>;
  handleCallback(params: { code: string; state?: string }): Promise<{
    sub: string;
    nome: string;
    cpf?: string;
    email?: string;
    nivel?: string;
    raw: unknown;
  }>;
}