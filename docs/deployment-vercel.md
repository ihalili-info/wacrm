# Deploying on Vercel

wacrm runs on [Vercel](https://vercel.com) as its recommended host:
Next.js 16 builds with zero config, the scheduled jobs run as Vercel
Cron, and the database is a [Supabase](https://supabase.com) project
wired up through Vercel's native Supabase integration.

This guide takes you from a fork to a running deployment with the
WhatsApp webhook connected.

---

## Before you start

You need:

- A **GitHub fork** of this repo (`Fork` on the repo page).
- A **Meta / WhatsApp Business** app — see
  [wacrm.tech/docs/whatsapp-setup](https://wacrm.tech/docs/whatsapp-setup).
  Have the **App Secret** and (for image-header templates) the
  **App ID** handy.
- The **[Supabase CLI](https://supabase.com/docs/guides/cli)**
  installed locally, to apply migrations.

You do **not** need to create the Supabase project up front — the
integration in step 2 can create one for you.

---

## 1. Import the project

Either click the **Deploy with Vercel** button in the README, or:

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
   → pick your fork.
2. Framework preset is detected as **Next.js**. Leave the build and
   output settings at their defaults — `vercel.json` in the repo
   already declares the cron jobs.
3. Don't deploy yet — add the integration and env vars first
   (steps 2–3). If you already deployed, that's fine; finish the
   setup and redeploy.

> **Region:** under **Settings → Functions**, pick a region close to
> your Supabase project's region to keep DB round-trips fast.

---

## 2. Add the Supabase integration

In the project: **Storage → Marketplace → Supabase → Add**
(or install from
[vercel.com/marketplace/supabase](https://vercel.com/marketplace/supabase)).

- Choose **Connect an existing Supabase project** or **Create a new
  one**.
- Select the wacrm project and the environments to link (Production +
  Preview is fine).

The integration sets these environment variables on the project — you
never copy-paste them:

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook, automation/flow engines, public API key auth |

(It also sets `POSTGRES_*` connection strings, which wacrm doesn't
use — harmless to leave.)

---

## 3. Set the remaining environment variables

**Settings → Environment Variables.** Required:

| Variable | How to generate / where to get it |
|---|---|
| `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — 64 hex chars. Rotating it later orphans stored WhatsApp tokens. |
| `META_APP_SECRET` | Meta for Developers → App Settings → Basic. Verifies the HMAC signature on every inbound webhook. |
| `CRON_SECRET` | `openssl rand -hex 32`. Vercel signs its cron calls with this; the cron routes reject anything else. |

Recommended:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your production URL, no trailing slash (e.g. `https://crm.example.com`). Set once you've added a domain — used for the sitemap, OG images, and links generated from cron. |
| `META_APP_ID` | Needed only to submit message templates with an image header. |

Optional AI-assistant tuning (`AI_REQUEST_TIMEOUT_MS`,
`AI_CONTEXT_MESSAGE_LIMIT`) and the other flags are documented in
[`.env.local.example`](../.env.local.example). The AI assistant is
bring-your-own-key per account — there is no global provider key.

> `NEXT_PUBLIC_*` values are inlined at **build time**. After changing
> one, trigger a fresh deploy (redeploy without build cache).

Now **deploy** (or redeploy).

---

## 4. Apply the database migrations

Vercel does not run the SQL in `supabase/` — do it once from your
machine, and again whenever you pull an update that adds a migration
(watch [`CHANGELOG.md`](../CHANGELOG.md) for **migration required**
notes):

```bash
supabase login
supabase link --project-ref <your-project-ref>   # from the Supabase dashboard URL
supabase db push
```

`supabase db push` applies every file in `supabase/migrations/` in
order. The migrations also create the Storage buckets (`avatars`,
`chat-media`) and enable the `pgvector` extension used by optional
semantic knowledge-base search.

---

## 5. Connect the WhatsApp webhook

In the Meta app dashboard → **WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://<your-domain>/api/whatsapp/webhook`
- **Verify token:** the value you set as the WhatsApp verify token in
  the app's **Settings → WhatsApp** page (configured per account,
  stored encrypted).
- Subscribe to the **messages** field (and **message_template_status_update**
  if you manage templates from wacrm).

Meta sends a `GET` to verify, then `POST`s events. The route rejects
any POST whose signature doesn't match `META_APP_SECRET`.

---

## 6. Verify the cron jobs

`vercel.json` declares two jobs:

| Path | Schedule | Job |
|---|---|---|
| `/api/automations/cron` | every 5 min | drains automation **Wait** steps |
| `/api/flows/cron` | every 10 min | sweeps abandoned flow runs past their timeout |

After a production deploy, check **Project → Cron Jobs** in the Vercel
dashboard — both should be listed. Hit **Run** once and confirm a
`200` with `{"processed":0}` / `{"swept":0}`.

> **Plan note:** Vercel's Hobby plan runs a limited number of cron
> jobs and may not honour sub-daily schedules. For the cadence above,
> use a **Pro** plan, or keep Hobby and drive the two endpoints from
> an external scheduler using `AUTOMATION_CRON_SECRET` + the
> `x-cron-secret` header instead (see
> [automations-and-cron.md](./automations-and-cron.md)).

---

## Function duration limits

Most routes finish in well under a second. Two run longer:

- `POST /api/whatsapp/broadcast/[id]/resume` — `maxDuration = 300`
- `POST /api/whatsapp/webhook` and `POST /api/v1/broadcasts` —
  `maxDuration = 60`

The 300-second ceiling requires a plan that allows it (Pro). On a plan
capped lower, a very large broadcast resume is cut short and picked up
on the next trigger — it's resumable by design — but provisioning
enough duration avoids the extra round-trips.

---

## Updating

Push to `main` (or merge upstream into your fork and push). Vercel
builds and promotes automatically; every PR gets a preview URL.
Remember to run `supabase db push` when an update ships a migration.
