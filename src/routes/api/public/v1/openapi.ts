import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function buildSpec(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "SOL — API Pública v1",
      version: "1.0.0",
      description:
        "API REST do SOL (Sistema de Licenciamento Ambiental). Todas as rotas exigem header `Authorization: Bearer <token>` gerado em `/admin/api-tokens` com escopo apropriado. Escopos disponíveis: `empresas:read`, `empreendimentos:read`, `requerimentos:read` (ou `*` para acesso total). Limite: 120 requisições por token a cada 60 segundos (HTTP 429 ao exceder). HTTP 403 ao chamar rota sem escopo.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "opaque" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
        },
        Empresa: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nome_fantasia: { type: "string", nullable: true },
            ativo: { type: "boolean" },
            criado_em: { type: "string", format: "date-time" },
            pessoas_juridicas: {
              type: "object", nullable: true,
              properties: { cnpj: { type: "string" }, razao_social: { type: "string" }, email: { type: "string" } },
            },
          },
        },
        Empreendimento: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nome: { type: "string" },
            endereco: { type: "string", nullable: true },
            latitude: { type: "number", nullable: true },
            longitude: { type: "number", nullable: true },
            ativo: { type: "boolean" },
            criado_em: { type: "string", format: "date-time" },
            cidades: { type: "object", nullable: true, properties: { nome: { type: "string" }, uf: { type: "string" } } },
          },
        },
        Requerimento: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            titulo: { type: "string" },
            tipo: { type: "string" },
            status: {
              type: "string",
              enum: ["rascunho","enviado","em_analise","pendente_documentos","aprovado","indeferido","arquivado"],
            },
            numero_processo: { type: "string", nullable: true },
            criado_em: { type: "string", format: "date-time" },
            prazo_em: { type: "string", format: "date-time", nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/public/v1/empresas": {
        get: {
          summary: "Lista empresas do locatário",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } }],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Empresa" } } } } } } },
            "401": { description: "Token ausente ou inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit excedido (120/min)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/public/v1/empreendimentos": {
        get: {
          summary: "Lista empreendimentos do locatário",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } }],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Empreendimento" } } } } } } },
            "401": { description: "Token ausente ou inválido" },
            "429": { description: "Rate limit excedido" },
          },
        },
      },
      "/api/public/v1/requerimentos": {
        get: {
          summary: "Lista requerimentos do locatário",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Requerimento" } } } } } } },
            "401": { description: "Token ausente ou inválido" },
            "429": { description: "Rate limit excedido" },
          },
        },
      },
    },
  };
}

export const Route = createFileRoute("/api/public/v1/openapi")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const spec = buildSpec(`${url.protocol}//${url.host}`);
        return new Response(JSON.stringify(spec, null, 2), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8", ...CORS },
        });
      },
    },
  },
});