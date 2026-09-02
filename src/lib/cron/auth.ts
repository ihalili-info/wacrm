import { timingSafeEqual } from 'node:crypto'

/**
 * Shared authorization for the scheduled endpoints
 * (`GET /api/automations/cron`, `GET /api/flows/cron`).
 *
 * Two kinds of caller are accepted:
 *
 *   - **Vercel Cron** — sends `Authorization: Bearer ${CRON_SECRET}`.
 *     Vercel injects `CRON_SECRET` into every deployment once it's set
 *     in Project Settings → Environment Variables, and signs its own
 *     cron invocations with it. Nothing else in this app reads it.
 *   - **Any external scheduler** — GitHub Actions, cron-job.org, a
 *     plain VPS crontab, etc. Sends the shared secret in the
 *     `x-cron-secret` header, matched against `AUTOMATION_CRON_SECRET`.
 *
 * Either header satisfies the check. If neither `CRON_SECRET` nor
 * `AUTOMATION_CRON_SECRET` is configured the caller gets a 503 so the
 * feature fails loud rather than running wide open.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  // Length pre-check is required by timingSafeEqual (it throws on a
  // mismatch) and leaks only the length, which isn't sensitive.
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

export function authorizeCronRequest(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET
  const sharedSecret = process.env.AUTOMATION_CRON_SECRET

  if (!cronSecret && !sharedSecret) {
    return { ok: false, status: 503, error: 'cron not configured' }
  }

  const authHeader = request.headers.get('authorization') ?? ''
  if (cronSecret && safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return { ok: true }
  }

  const supplied = request.headers.get('x-cron-secret') ?? ''
  if (sharedSecret && safeEqual(supplied, sharedSecret)) {
    return { ok: true }
  }

  return { ok: false, status: 401, error: 'Unauthorized' }
}
