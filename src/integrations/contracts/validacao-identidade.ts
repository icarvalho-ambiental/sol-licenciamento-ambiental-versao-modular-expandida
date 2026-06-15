/** Contrato para validação de identidade (CPF/CNPJ/biometria). */
export interface ValidacaoIdentidadeProvider {
  readonly key: string;
  validarCpf(cpf: string): Promise<{ valido: boolean; nome?: string; situacao?: string }>;
  validarCnpj(cnpj: string): Promise<{ valido: boolean; razaoSocial?: string; situacao?: string }>;
}