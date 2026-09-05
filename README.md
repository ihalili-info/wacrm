# Balkania WA CRM

> WhatsApp CRM — shared inbox, contacts, sales pipelines, broadcasts,
> and no-code automations. Built on Next.js + Supabase, deployed on
> Vercel.

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-ready-000?logo=vercel)](./docs/deployment-vercel.md)

Clone or fork this repo to run your own CRM. Self-host docs are in
[`docs/`](./docs).

## What you get out of the box

- **Shared inbox** on the official WhatsApp Business API — multiple
  agents working one number, per-conversation assignment, status, and
  notes.
- **Contacts + tags + custom fields**, CSV import, deduplication.
- **Sales pipelines** (Kanban) with deals linked to conversations.
- **Broadcasts** with Meta-approved templates, delivery + read
  tracking, per-recipient variable substitution.
- **No-code automations** — triggers on inbound messages, new
  contacts, keywords, or schedule; conditional branches, waits,
  tags, webhooks. Visual builder.
- **AI reply assistant** — bring your own OpenAI or Anthropic key
  (stored encrypted; no per-seat AI fee, your data stays yours).
  One-click AI-drafted replies in the inbox, plus an optional
  auto-reply bot with a per-conversation cap and clean human handoff.
  Add a **knowledge base** (FAQs, policies, product docs) and it
  answers from your own content — hybrid retrieval (Postgres full-text,
  or semantic pgvector when an embeddings key is set).
- **Real-time dashboard** — response times, daily volume, pipeline
  value, cross-module activity feed.
- **Team accounts** — invite teammates by link, role-based access
  (owner / admin / agent / viewer), ownership transfer. Every install
  is account-scoped, so one shared inbox can be staffed by a whole
  team. Solo use stays single-user with zero setup.
- **Account management** — email, password, avatar, global sign-out.
- **Public REST API** (`/api/v1`) with scoped, revocable API keys —
  build your own automations on top of your CRM. See
  [docs/public-api.md](./docs/public-api.md).
- **MCP server** — drive your CRM from Claude, Cursor, and other AI
  assistants over the [Model Context Protocol](https://modelcontextprotocol.io).
  Read-only by default, opt-in writes. See [docs/mcp.md](./docs/mcp.md)
  (server in [`mcp-server/`](./mcp-server)).

## Why fork this?

This is a **template**, not a product. Forking means you get:

- **Full ownership** — your code, your Supabase project, your domain,
  your data. No SaaS lock-in, no seat pricing, no trust dance.
- **Full customisation** — add the fields your team needs, remove the
  modules you don't, redesign anything. The stack is boring on
  purpose (Next.js + Supabase + Tailwind) so the learning curve is
  short.
- **Zero ops to start** — [Vercel](https://vercel.com) builds and
  ships your fork on every push to `main`, and its
  [Supabase integration](https://vercel.com/marketplace/supabase)
  provisions the database and wires the env vars for you. No servers
  to manage, no infra team needed.
  ([See below ↓](#-deploy-on-vercel-recommended))
- **Real security primitives** — token encryption (AES-256-GCM), RLS
  on every table, HMAC-verified webhooks, CSP, rate limiting,
  `typecheck` / `lint` / `test` scripts ready to wire into CI.

Not a framework. Not an SDK. A concrete, working CRM you can stand up
in an afternoon and make yours.

## Quick start

```bash
git clone https://github.com/<your-org>/wacrm.git
cd wacrm
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta creds
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

## 🚀 Deploy on Vercel (recommended)

**Balkania WA CRM runs on [Vercel](https://vercel.com) with a
[Supabase](https://supabase.com) database.** Push your fork to a
GitHub account that has the Vercel app installed, import it as a new
project, and Vercel builds and ships it on every push to `main` — no
VPS and no Kubernetes cluster to own.

### Why Vercel + Supabase?

| | |
|---|---|
| **Git-native deploys** | Connect your fork; every push to `main` builds and ships, every PR gets a preview URL. No SSH, no build server to wire up. |
| **Next.js 16, zero config** | App Router, server actions, ISR, and streaming run as-shipped — Vercel builds this framework. You don't manage Node versions, processes, or a reverse proxy. |
| **Native Supabase integration** | Add it from the [Vercel Marketplace](https://vercel.com/marketplace/supabase) and it creates (or links) a Supabase project and sets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` on the project — nothing to copy-paste. |
| **Cron built in** | `vercel.json` already declares the two scheduled jobs (automation Wait steps, flow stale-run sweep). Set `CRON_SECRET` and Vercel runs and authenticates them. |
| **HTTPS + custom domains** | Automatic TLS on `*.vercel.app` and any domain you add — required for the WhatsApp Business webhook. |
| **Edge network + caching** | Static assets and prerendered pages served from the edge; per-user dashboard routes stay dynamic. |
| **Secrets + logs in the dashboard** | Set `ENCRYPTION_KEY`, `META_APP_SECRET`, and the rest per-environment; runtime logs and errors in the same UI. |

### The 2-minute version

1. In Vercel, **New Project → Import** your fork.
2. In the import flow, add the **Supabase** integration — pick an
   existing project or let it create one. The Supabase env vars are
   set for you.
3. Add the remaining env vars: `ENCRYPTION_KEY`, `META_APP_SECRET`,
   `CRON_SECRET` (see [`.env.local.example`](./.env.local.example)).
4. Deploy. Then apply the database migrations under `supabase/` with
   the Supabase CLI, and point your Meta webhook at
   `https://<your-domain>/api/whatsapp/webhook`.

Full walkthrough: **[docs/deployment-vercel.md](./docs/deployment-vercel.md)**.

> _Note: this app is MIT-licensed and runs anywhere Node.js 20+ does
> (`npm run build && npm run start`) — Railway, Fly.io, a VPS, your
> own hardware. Vercel is recommended, not required._

## Documentation

Self-host docs live in [`docs/`](./docs):

- [Deploy on Vercel](./docs/deployment-vercel.md)
- [Automations & scheduled jobs](./docs/automations-and-cron.md)
- [Public REST API](./docs/public-api.md)
- [MCP server](./docs/mcp.md)

Environment variables are documented inline in
[`.env.local.example`](./.env.local.example); database migrations are
in [`supabase/migrations/`](./supabase/migrations).

## Stack

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).
- **Hosting** — Vercel (functions + cron), via the native Supabase
  integration. Also runs anywhere Node.js 20+ does.

## License

[MIT](./LICENSE). Fork it, brand it, host it.
