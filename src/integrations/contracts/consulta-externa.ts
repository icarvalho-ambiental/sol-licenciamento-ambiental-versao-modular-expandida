/** Contrato para consulta de dados externos (CEP, IBGE, bases governamentais). */
export interface ConsultaExternaProvider {
  readonly key: string;
  consultar<T = unknown>(recurso: string, params?: Record<string, unknown>): Promise<T>;
}