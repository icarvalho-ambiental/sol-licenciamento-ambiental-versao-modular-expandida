import type { Role } from "./mock-data";

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

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador do Sistema",
  gac: "Equipe Técnica / GAC",
  analista: "Analista",
  externo: "Usuário Externo",
  empresa: "Empresa / Representante Legal",
  publico: "Consulta Pública",
};

export const TERMOS_VERSAO = "1.0";