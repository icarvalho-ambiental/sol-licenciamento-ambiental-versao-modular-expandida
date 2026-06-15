/**
 * Módulo: Licenciamento Ambiental
 *
 * Reúne os recursos do núcleo de licenciamento (empresas, empreendimentos,
 * requerimentos, condicionantes, documentos). As rotas continuam em
 * `src/routes/` por imposição do file-based routing do TanStack, mas toda a
 * lógica de negócio é re-exportada por este barrel para servir de fronteira
 * lógica do módulo.
 */
export {
  listEmpresas,
  getEmpresa,
  createEmpresa,
  listEmpresasSimple,
  listEmpreendimentos,
  listEmpreendimentosSimple,
  listEmpreendimentosGeo,
  createEmpreendimento,
  listRequerimentos,
  getRequerimento,
  createRequerimento,
  updateRequerimentoStatus,
  addComentario,
  listCondicionantesByRequerimento,
  listCondicionantesTodas,
  createCondicionante,
  updateCondicionanteStatus,
  deleteCondicionante,
} from "@/lib/sol/sol-functions";

export {
  uploadDocumentoBiblioteca,
  listDocumentosBiblioteca,
  signDocumentoBibliotecaUrl,
  deleteDocumentoBiblioteca,
} from "@/lib/sol/documentos-functions";

export const LICENCIAMENTO_PERMISSIONS = [
  "empresa.ver", "empresa.criar", "empresa.editar", "empresa.excluir",
  "empreendimento.ver", "empreendimento.criar", "empreendimento.editar", "empreendimento.excluir",
  "requerimento.ver", "requerimento.criar", "requerimento.editar", "requerimento.excluir",
  "requerimento.enviar", "requerimento.analisar", "requerimento.aprovar",
  "requerimento.indeferir", "requerimento.arquivar", "requerimento.comentar",
  "requerimento.anexar_documento", "requerimento.solicitar_documentos",
  "condicionante.ver", "condicionante.criar", "condicionante.editar",
  "condicionante.excluir", "condicionante.concluir",
  "documento.excluir",
] as const;

export const LICENCIAMENTO_MODULE_KEY = "licenciamento" as const;