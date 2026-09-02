# Automations, flows & the scheduled jobs

Two endpoints have to be hit on a schedule for time-based behaviour to
work. Without a scheduler pointed at them:

- automation **Wait** steps never resume, and
- abandoned **flow** runs never time out — which permanently blocks
  new triggers for that contact (a partial unique index only allows
  one active run per contact).

| Endpoint | What it does | Suggested interval |
|---|---|---|
| `GET /api/automations/cron` | Claims and runs due `automation_pending_executions` rows (Wait-step resumes). Processes up to 50 per call. | every 5 min |
| `GET /api/flows/cron` | Marks active flow runs older than their `fallback_policy.on_timeout_hours` (default 24h) as `timed_out` and writes an audit event. | every 10 min |

Both are safe to call more often, and safe to overlap — each claims
rows with a guarded `UPDATE` so two concurrent calls don't
double-process.

## Authorization

Each request must carry **one** of these secrets. Set whichever your
scheduler uses; you can set both.

### `CRON_SECRET` — for Vercel Cron

Sent by Vercel as `Authorization: Bearer <CRON_SECRET>`. Set it in
**Project Settings → Environment Variables**; Vercel signs its own
cron invocations with it automatically. The schedules live in
[`vercel.json`](../vercel.json):

```json
{
  "crons": [
    { "path": "/api/automations/cron", "schedule": "*/5 * * * *" },
    { "path": "/api/flows/cron", "schedule": "*/10 * * * *" }
  ]
}
```

Generate: `openssl rand -hex 32`. Don't set `CRON_SECRET` in local
`.env.local` — it's a production concern.

> Vercel's **Hobby** plan limits cron quantity and frequency and may
> coerce the schedules above to run less often. Use a **Pro** plan for
> the intended cadence, or use an external scheduler (below) on Hobby.

### `AUTOMATION_CRON_SECRET` — for any external scheduler

Sent by you in the `x-cron-secret` header. Use this from GitHub
Actions, [cron-job.org](https://cron-job.org), a VPS `crontab`, a
systemd timer — anything that can make an HTTP request on a schedule.

```bash
curl -fsS -H "x-cron-secret: $AUTOMATION_CRON_SECRET" \
  https://<your-domain>/api/automations/cron

curl -fsS -H "x-cron-secret: $AUTOMATION_CRON_SECRET" \
  https://<your-domain>/api/flows/cron
```

Example GitHub Actions workflow:

```yaml
name: wacrm cron
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -H "x-cron-secret: ${{ secrets.WACRM_CRON_SECRET }}" \
            https://<your-domain>/api/automations/cron
      - run: |
          curl -fsS -H "x-cron-secret: ${{ secrets.WACRM_CRON_SECRET }}" \
            https://<your-domain>/api/flows/cron
```

## Responses

| Status | Meaning |
|---|---|
| `200 {"processed":N}` / `{"swept":N}` | ran; `N` items handled |
| `401 {"error":"Unauthorized"}` | secret missing or wrong |
| `503 {"error":"cron not configured"}` | neither `CRON_SECRET` nor `AUTOMATION_CRON_SECRET` is set |

## Local development

Neither job runs on its own with `npm run dev`. To exercise a Wait
step, set `AUTOMATION_CRON_SECRET` in `.env.local` and curl the
endpoint by hand (command above, against `http://localhost:3000`).
