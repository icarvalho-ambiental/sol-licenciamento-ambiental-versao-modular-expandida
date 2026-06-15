/**
 * Contrato de descritor de módulo. Cada módulo do SOL declara aqui o que
 * ele oferece à plataforma (rotas, menu, permissões, dashboards, GIS).
 * O registry permite expansão sem refatoração da base atual.
 */
export type ModuleCategory = "ambiental" | "urbano" | "agro" | "tecnico" | "gis" | "core";

export interface ModuleRoute {
  path: string;
  label: string;
  /** Permissão necessária para exibir no menu (formato `<modulo>.<acao>`). */
  permission?: string;
}

export interface ModulePermissionSeed {
  key: string;
  descricao: string;
}

export interface ModuleDashboardSeed {
  key: string;
  titulo: string;
}

export interface ModuleDocumentSeed {
  key: string;
  titulo: string;
}

export interface ModuleGisLayerSeed {
  key: string;
  nome: string;
  tipoGeom: "point" | "line" | "polygon" | "multipolygon";
  srid?: number; // default 4674
}

export interface ModuleDescriptor {
  key: string;
  label: string;
  descricao?: string;
  icon?: string; // nome do ícone lucide
  categoria: ModuleCategory;
  ordem: number;
  /** Implementação completa pronta? Quando false, módulo aparece como stub. */
  implemented: boolean;
  routes?: ModuleRoute[];
  permissions?: ModulePermissionSeed[];
  dashboards?: ModuleDashboardSeed[];
  documents?: ModuleDocumentSeed[];
  apiNamespace?: string;
  gisLayers?: ModuleGisLayerSeed[];
}