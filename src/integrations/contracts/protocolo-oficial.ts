/** Contrato para protocolo oficial / emissão e validação de documentos. */
export interface ProtocoloOficialProvider {
  readonly key: string;
  emitirProtocolo(params: { documentoId: string; metadados?: Record<string, unknown> }): Promise<{
    numeroProtocolo: string;
    emitidoEm: string;
  }>;
  consultarProtocolo(numero: string): Promise<{ status: string; raw: unknown }>;
}