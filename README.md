# SOL — Sistema de Licenciamento Ambiental

Plataforma SaaS multi-tenant para licenciamento ambiental municipal, construída com TanStack Start, React 19, Tailwind, shadcn/ui e Lovable Cloud (Postgres + Storage + Auth).

## Stack

- **Frontend / SSR:** TanStack Start v1, React 19, Vite 7
- **UI:** Tailwind v4 + shadcn/ui
- **Backend:** Lovable Cloud (Postgres + Storage + Auth) via `createServerFn` e server routes (`src/routes/api/`)
- **Estado de dados:** TanStack Query (loaders + suspense)
- **Runtime serverless:** Cloudflare Workers (workerd) com nodejs_compat

## Pré-requisitos

- [Bun](https://bun.sh/) ≥ 1.1
- Node 20+ (apenas para tooling)

## Setup local

```bash
bun install
bun run dev
```

A aplicação sobe em `http://localhost:8080`.

### Variáveis de ambiente

O arquivo `.env` da raiz contém **apenas chaves públicas** (URL e *publishable key* do Lovable Cloud) — pode ser commitado com segurança. Para uso em ambientes externos basta replicar:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_PROJECT_ID=...
```

Chaves sensíveis (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) são *runtime secrets* gerenciadas no painel Lovable — **nunca** devem ir para o repositório.

Para sobrescrever localmente, crie `.env.local` (já ignorado pelo Git).

## Estrutura

```
src/
├── routes/              # rotas (file-based: TanStack Router)
│   ├── api/public/v1/   # API REST pública (token Bearer)
│   └── ...
├── modules/             # módulos de negócio (licenciamento, etc.)
├── components/sol/      # AppShell, layout, navegação
├── lib/sol/             # server functions (`*.functions.ts`) e helpers
└── integrations/supabase/ # cliente, middlewares (auto-gerado pelo Lovable)
supabase/
└── migrations/          # migrações SQL versionadas
```

## Comandos

| Comando         | Descrição                                |
| --------------- | ---------------------------------------- |
| `bun run dev`   | Servidor de desenvolvimento (porta 8080) |
| `bun run build` | Build de produção                        |

## Sincronização Lovable ⇄ GitHub

Este projeto suporta sincronização bidirecional com o Lovable. Mudanças aqui no GitHub são puxadas automaticamente para o editor Lovable, e vice-versa. Não use `git push --force` em `main` — quebra o histórico do Lovable.

Para detalhes de arquitetura e backlog, veja `.lovable/plan.md`.

## Licença

Proprietária. Todos os direitos reservados.