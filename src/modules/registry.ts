import type { ModuleDescriptor } from "./types";

/**
 * Registry central de módulos. Fonte única para:
 * - seed em `public.modules`
 * - menu (merge aditivo no AppShell)
 * - permissões por módulo
 * - camadas GIS por módulo
 *
 * Adicionar um módulo aqui NÃO altera a habilitação por tenant
 * (continua em `public.tenant_modules`).
 */
export const MODULE_REGISTRY: ModuleDescriptor[] = [
  {
    key: "licenciamento",
    label: "Licenciamento Ambiental",
    descricao: "Processos de licenciamento ambiental",
    icon: "FileCheck2",
    categoria: "ambiental",
    ordem: 10,
    implemented: true,
    routes: [{ path: "/requerimentos", label: "Requerimentos", permission: "requerimento.ver" }],
    permissions: [
      { key: "licenciamento.ver", descricao: "Visualizar licenciamentos" },
      { key: "licenciamento.editar", descricao: "Editar licenciamentos" },
    ],
    gisLayers: [{ key: "licenciamento.areas", nome: "Áreas licenciadas", tipoGeom: "polygon" }],
  },
  {
    key: "fiscalizacao",
    label: "Fiscalização Ambiental",
    descricao: "Ações fiscalizatórias",
    icon: "ShieldAlert",
    categoria: "ambiental",
    ordem: 20,
    implemented: false,
    permissions: [{ key: "fiscalizacao.ver", descricao: "Visualizar fiscalizações" }],
    gisLayers: [{ key: "fiscalizacao.autos", nome: "Autos de infração", tipoGeom: "point" }],
  },
  {
    key: "reurb",
    label: "REURB",
    descricao: "Regularização Fundiária Urbana",
    icon: "Home",
    categoria: "urbano",
    ordem: 30,
    implemented: false,
    permissions: [{ key: "reurb.ver", descricao: "Visualizar processos REURB" }],
    gisLayers: [{ key: "reurb.lotes", nome: "Lotes REURB", tipoGeom: "polygon" }],
  },
  {
    key: "sim",
    label: "SIM",
    descricao: "Serviço de Inspeção Municipal",
    icon: "ClipboardCheck",
    categoria: "agro",
    ordem: 40,
    implemented: false,
    permissions: [{ key: "sim.ver", descricao: "Visualizar SIM" }],
  },
  {
    key: "ater",
    label: "ATER",
    descricao: "Assistência Técnica e Extensão Rural",
    icon: "Tractor",
    categoria: "agro",
    ordem: 50,
    implemented: false,
    permissions: [{ key: "ater.ver", descricao: "Visualizar ATER" }],
  },
  {
    key: "notificacoes",
    label: "Notificações",
    descricao: "Notificações ambientais e denúncias",
    icon: "Megaphone",
    categoria: "ambiental",
    ordem: 60,
    implemented: false,
    permissions: [{ key: "notificacoes.ver", descricao: "Visualizar notificações" }],
  },
  {
    key: "vistorias",
    label: "Vistorias",
    descricao: "Vistorias técnicas",
    icon: "Binoculars",
    categoria: "tecnico",
    ordem: 70,
    implemented: false,
    permissions: [{ key: "vistorias.ver", descricao: "Visualizar vistorias" }],
    gisLayers: [{ key: "vistorias.pontos", nome: "Pontos de vistoria", tipoGeom: "point" }],
  },
  {
    key: "pericias",
    label: "Perícias",
    descricao: "Perícias ambientais",
    icon: "Microscope",
    categoria: "tecnico",
    ordem: 80,
    implemented: false,
    permissions: [{ key: "pericias.ver", descricao: "Visualizar perícias" }],
  },
  {
    key: "sigweb",
    label: "SIGWeb / GIS",
    descricao: "Mapa e camadas geoespaciais",
    icon: "Map",
    categoria: "gis",
    ordem: 90,
    implemented: true,
    routes: [{ path: "/gis", label: "Mapa", permission: "gis.ver" }],
    permissions: [{ key: "gis.ver", descricao: "Visualizar mapa GIS" }],
  },
];

export function getModuleByKey(key: string): ModuleDescriptor | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key);
}