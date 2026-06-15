/** Contrato para assinatura eletrônica/digital (ex.: ICP-Brasil). */
export interface AssinaturaDigitalProvider {
  readonly key: string;
  assinar(params: {
    documentoId: string;
    pdfBase64: string;
    signatarioCpf: string;
    motivo?: string;
  }): Promise<{ pdfAssinadoBase64: string; hash: string; assinadoEm: string }>;
  validar(params: { pdfBase64: string }): Promise<{
    valido: boolean;
    signatarios: Array<{ nome: string; cpf?: string; emitidoPor?: string; assinadoEm?: string }>;
    erros?: string[];
  }>;
}