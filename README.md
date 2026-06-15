# SOL — Sistema de Licenciamento Ambiental

Plataforma SaaS multi-tenant para licenciamento ambiental municipal, construída com TanStack Start, React 19, Tailwind, shadcn/ui e Supabase (Postgres + Storage + Auth).

## Stack

- **Frontend / SSR:** TanStack Start v1, React 19, Vite 7
- **UI:** Tailwind v4 + shadcn/ui
- **Backend:** Supabase (Postgres + Storage + Auth) com `createServerFn` e server routes (`src/routes/api/`)
- **Estado de dados:** TanStack Query (loaders + suspense)
- **Runtime:** Cloudflare Workers (workerd) com `nodejs_compat`

## Pré-requisitos

- [Bun](https://bun.sh/) ≥ 1.1
- Node 20+ (apenas para tooling)

## Setup local

```bash
bun install
bun run dev
