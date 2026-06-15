export type Role =
  | "admin"
  | "gac"
  | "analista"
  | "externo"
  | "empresa"
  | "publico";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador do Sistema",
  gac: "Equipe Técnica / GAC",
  analista: "Analista",
  externo: "Usuário Externo",
  empresa: "Empresa / Representante Legal",
  publico: "Consulta Pública",
};

export const MUNICIPIOS = [
  "Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari",
  "Itabuna", "Juazeiro", "Ilhéus", "Lauro de Freitas", "Jequié",
  "Teixeira de Freitas", "Barreiras", "Alagoinhas", "Porto Seguro",
  "Simões Filho", "Paulo Afonso",
];

export const STATUS_REQUERIMENTO = [
  "Em Análise", "Aguardando Documentos", "Deferido", "Indeferido",
  "Em Notificação", "Arquivado", "Em Cadastro",
] as const;
export type StatusRequerimento = typeof STATUS_REQUERIMENTO[number];

export const TIPOS_REQUERIMENTO = [
  "Licença Prévia (LP)",
  "Licença de Instalação (LI)",
  "Licença de Operação (LO)",
  "Licença Unificada (LU)",
  "Autorização Ambiental",
  "Renovação de Licença",
  "Dispensa de Licenciamento",
];

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  municipio: string;
  endereco: string;
  email: string;
  telefone: string;
  responsavel: string;
  situacao: "Ativa" | "Pendente" | "Suspensa";
}

export interface Empreendimento {
  id: string;
  nome: string;
  empresaId: string;
  municipio: string;
  atividade: string;
  porte: "Pequeno" | "Médio" | "Grande";
  coordenadas: string;
  situacao: "Regular" | "Em regularização" | "Irregular";
}

export interface Requerimento {
  id: string;
  protocolo: string;
  tipo: string;
  empresaId: string;
  empreendimentoId: string;
  municipio: string;
  status: StatusRequerimento;
  criadoEm: string;
  observacoes: string;
  historico: { data: string; evento: string; autor: string }[];
  documentos: { nome: string; tipo: string; data: string }[];
}

export interface Notificacao {
  id: string;
  requerimentoId: string;
  titulo: string;
  mensagem: string;
  prazo: string;
  status: "Pendente" | "Respondida" | "Vencida";
  criadaEm: string;
}

export interface DocumentoBib {
  id: string;
  nome: string;
  tipo: string;
  vinculo: string;
  tamanho: string;
  data: string;
}

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: readonly T[]) => arr[rnd(0, arr.length - 1)];

const NOMES_EMPRESAS = [
  "Verde Bahia Agroindústria", "EcoMineração Recôncavo", "Petroquímica Atlântico",
  "Construtora Sertão Norte", "Energias Renováveis BA", "Indústria Têxtil Camaçari",
  "Logística Portuária Salvador", "Cerâmica Vale do São Francisco", "AgroBahia Cooperativa",
  "Mineradora Chapada Diamantina", "Bioenergia Litoral Sul", "Pesca Sustentável Ilhéus",
];

const ATIVIDADES = [
  "Extração mineral", "Indústria química", "Agroindústria", "Logística e transporte",
  "Construção civil", "Geração de energia", "Tratamento de resíduos", "Pesca e aquicultura",
];

export const empresas: Empresa[] = NOMES_EMPRESAS.map((nome, i) => ({
  id: `EMP-${1000 + i}`,
  razaoSocial: `${nome} LTDA`,
  nomeFantasia: nome,
  cnpj: `${rnd(10,99)}.${rnd(100,999)}.${rnd(100,999)}/0001-${rnd(10,99)}`,
  municipio: pick(MUNICIPIOS),
  endereco: `Rua das Acácias, ${rnd(10,9999)}`,
  email: `contato@${nome.toLowerCase().split(" ")[0]}.com.br`,
  telefone: `(71) 9${rnd(1000,9999)}-${rnd(1000,9999)}`,
  responsavel: ["Carlos Souza","Mariana Alves","João Pereira","Ana Beatriz","Roberto Lima"][i % 5],
  situacao: (["Ativa","Ativa","Ativa","Pendente","Suspensa"] as const)[i % 5],
}));

export const empreendimentos: Empreendimento[] = Array.from({ length: 18 }).map((_, i) => {
  const e = empresas[i % empresas.length];
  return {
    id: `EPR-${2000 + i}`,
    nome: `Unidade ${["Norte","Sul","Leste","Oeste","Central"][i % 5]} – ${e.nomeFantasia.split(" ")[0]}`,
    empresaId: e.id,
    municipio: e.municipio,
    atividade: pick(ATIVIDADES),
    porte: (["Pequeno","Médio","Grande"] as const)[i % 3],
    coordenadas: `-${(12 + Math.random() * 3).toFixed(4)}, -${(38 + Math.random() * 3).toFixed(4)}`,
    situacao: (["Regular","Em regularização","Irregular"] as const)[i % 3],
  };
});

export const requerimentos: Requerimento[] = Array.from({ length: 24 }).map((_, i) => {
  const epr = empreendimentos[i % empreendimentos.length];
  const data = new Date(Date.now() - i * 86400000 * 3);
  return {
    id: `REQ-${3000 + i}`,
    protocolo: `${2025}.${String(i + 1).padStart(5, "0")}`,
    tipo: pick(TIPOS_REQUERIMENTO),
    empresaId: epr.empresaId,
    empreendimentoId: epr.id,
    municipio: epr.municipio,
    status: STATUS_REQUERIMENTO[i % STATUS_REQUERIMENTO.length],
    criadoEm: data.toISOString(),
    observacoes: "Processo iniciado pelo representante legal. Documentação inicial recebida.",
    historico: [
      { data: data.toISOString(), evento: "Protocolo criado", autor: "Sistema" },
      { data: new Date(data.getTime() + 86400000).toISOString(), evento: "Encaminhado à análise técnica", autor: "GAC" },
      { data: new Date(data.getTime() + 86400000 * 3).toISOString(), evento: "Análise iniciada", autor: "Analista responsável" },
    ],
    documentos: [
      { nome: "Requerimento_assinado.pdf", tipo: "Formulário", data: data.toISOString() },
      { nome: "RG_Representante.pdf", tipo: "Identificação", data: data.toISOString() },
      { nome: "Memorial_Descritivo.pdf", tipo: "Técnico", data: data.toISOString() },
    ],
  };
});

export const notificacoes: Notificacao[] = Array.from({ length: 8 }).map((_, i) => {
  const r = requerimentos[i];
  return {
    id: `NOT-${4000 + i}`,
    requerimentoId: r.id,
    titulo: `Solicitação de complementação – ${r.protocolo}`,
    mensagem: "Favor anexar documentação atualizada conforme checklist enviado. Prazo de resposta indicado abaixo.",
    prazo: new Date(Date.now() + (i + 5) * 86400000).toISOString(),
    status: (["Pendente","Pendente","Respondida","Vencida"] as const)[i % 4],
    criadaEm: new Date(Date.now() - i * 86400000).toISOString(),
  };
});

export const documentosBib: DocumentoBib[] = Array.from({ length: 14 }).map((_, i) => ({
  id: `DOC-${5000 + i}`,
  nome: ["Memorial Descritivo","RG do Representante","Certidão de Uso do Solo","ART","Estudo de Impacto","Plano de Controle Ambiental","Cadastro Técnico Federal"][i % 7] + ".pdf",
  tipo: ["Técnico","Identificação","Certidão","Responsabilidade","Estudo","Plano","Cadastro"][i % 7],
  vinculo: pick(requerimentos).protocolo,
  tamanho: `${rnd(120, 4800)} KB`,
  data: new Date(Date.now() - i * 86400000).toISOString(),
}));

export function resumoPorMunicipio() {
  return MUNICIPIOS.map((m) => ({
    municipio: m,
    requerimentos: requerimentos.filter((r) => r.municipio === m).length,
    empreendimentos: empreendimentos.filter((e) => e.municipio === m).length,
    empresas: empresas.filter((e) => e.municipio === m).length,
  }));
}

export function statusCounts() {
  return STATUS_REQUERIMENTO.map((s) => ({
    name: s,
    value: requerimentos.filter((r) => r.status === s).length,
  }));
}

export const STATUS_COLORS: Record<string, string> = {
  "Em Análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando Documentos": "bg-orange-100 text-orange-800 border-orange-200",
  "Deferido": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Indeferido": "bg-red-100 text-red-800 border-red-200",
  "Em Notificação": "bg-blue-100 text-blue-800 border-blue-200",
  "Arquivado": "bg-slate-100 text-slate-700 border-slate-200",
  "Em Cadastro": "bg-violet-100 text-violet-800 border-violet-200",
  "Pendente": "bg-amber-100 text-amber-800 border-amber-200",
  "Respondida": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Vencida": "bg-red-100 text-red-800 border-red-200",
  "Ativa": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Suspensa": "bg-red-100 text-red-800 border-red-200",
  "Regular": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Em regularização": "bg-amber-100 text-amber-800 border-amber-200",
  "Irregular": "bg-red-100 text-red-800 border-red-200",
};