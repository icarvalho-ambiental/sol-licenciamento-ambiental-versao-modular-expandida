/**
 * Lookup de CEP via BrasilAPI (grátis, sem chave).
 * Roda no browser; sem CORS issues.
 */
export type CepInfo = {
  cep: string;
  state: string;       // UF
  city: string;        // município
  neighborhood: string;
  street: string;
};

export async function lookupCep(cepRaw: string): Promise<CepInfo> {
  const cep = cepRaw.replace(/\D/g, "");
  if (cep.length !== 8) throw new Error("CEP inválido (use 8 dígitos).");
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (!res.ok) throw new Error("CEP não encontrado.");
  const j: any = await res.json();
  return {
    cep: j.cep ?? cep,
    state: j.state ?? "",
    city: j.city ?? "",
    neighborhood: j.neighborhood ?? "",
    street: j.street ?? "",
  };
}