# wacrm — CRM Template for WhatsApp

> Self-hostable CRM template for WhatsApp® — shared inbox, contacts,
> sales pipelines, broadcasts, and no-code automations. Fork it, brand
> it, host it.

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArnasDon%2Fwacrm&project-name=wacrm&repository-name=wacrm&env=ENCRYPTION_KEY,META_APP_SECRET,CRON_SECRET&envDescription=Token%20encryption%20key%2C%20Meta%20app%20secret%2C%20and%20a%20cron%20secret.%20Add%20the%20Supabase%20integration%20in%20the%20same%20flow%20for%20the%20database%20vars.&envLink=https%3A%2F%2Fgithub.com%2FArnasDon%2Fwacrm%2Fblob%2Fmain%2F.env.local.example">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" height="36">
  </a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-ready-000?logo=vercel)](./docs/deployment-vercel.md)
[![Stars](https://img.shields.io/github/stars/ArnasDon/wacrm?style=social)](https://github.com/ArnasDon/wacrm/stargazers)

The marketing site and self-host docs live in a separate repo:
[ArnasDon/wacrm-site](https://github.com/ArnasDon/wacrm-site)
([wacrm.tech](https://wacrm.tech)). This repo is the product —
clone or fork it to run your own CRM.

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
# Fork on GitHub first: https://github.com/ArnasDon/wacrm → Fork
git clone https://github.com/<your-username>/wacrm.git
cd wacrm
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta creds
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

## 🚀 Deploy on Vercel (recommended)

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArnasDon%2Fwacrm&project-name=wacrm&repository-name=wacrm&env=ENCRYPTION_KEY,META_APP_SECRET,CRON_SECRET&envDescription=Token%20encryption%20key%2C%20Meta%20app%20secret%2C%20and%20a%20cron%20secret.%20Add%20the%20Supabase%20integration%20in%20the%20same%20flow%20for%20the%20database%20vars.&envLink=https%3A%2F%2Fgithub.com%2FArnasDon%2Fwacrm%2Fblob%2Fmain%2F.env.local.example">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" height="40">
  </a>
</p>

**wacrm runs on [Vercel](https://vercel.com) with a
[Supabase](https://supabase.com) database.** It's the path we test,
document, and recommend — push to `main` and Vercel builds and ships
it, no VPS and no Kubernetes cluster to own.

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

1. Click **Deploy with Vercel** above (or **New Project → Import** your
   own fork).
2. In the import flow, add the **Supabase** integration — pick an
   existing project or let it create one. The Supabase env vars are
   set for you.
3. Add the remaining env vars: `ENCRYPTION_KEY`, `META_APP_SECRET`,
   `CRON_SECRET` (see [`.env.local.example`](./.env.local.example)).
4. Deploy. Then apply the database migrations under `supabase/` with
   the Supabase CLI, and point your Meta webhook at
   `https://<your-domain>/api/whatsapp/webhook`.

Full walkthrough: **[docs/deployment-vercel.md](./docs/deployment-vercel.md)**.

> _Note: wacrm is MIT-licensed and runs anywhere Node.js 20+ does
> (`npm run build && npm run start`) — Railway, Fly.io, a VPS, your
> own hardware. Vercel is recommended, not required._

## Documentation

Full self-host documentation — Supabase migrations, WhatsApp Business
API config, and production deploy — lives at
**[wacrm.tech/docs](https://wacrm.tech/docs)**
(source: [ArnasDon/wacrm-site](https://github.com/ArnasDon/wacrm-site)).

Key pages:
- [Getting started](https://wacrm.tech/docs/getting-started)
- [Supabase setup](https://wacrm.tech/docs/supabase-setup)
- [WhatsApp setup](https://wacrm.tech/docs/whatsapp-setup)
- [Environment variables](https://wacrm.tech/docs/environment-variables)
- [Deploy on Vercel](./docs/deployment-vercel.md)
- [Architecture](https://wacrm.tech/docs/architecture)
- [Troubleshooting](https://wacrm.tech/docs/troubleshooting)

## Stack

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).
- **Hosting** — Vercel (functions + cron), via the native Supabase
  integration. Also runs anywhere Node.js 20+ does.

## Contributing

This is a template, not a collaborative product — the expected flow is
fork → customise → deploy, **not** upstream contribution. Feature PRs
often belong in your fork rather than here. Details in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

[MIT](./LICENSE). Fork it, brand it, host it.
