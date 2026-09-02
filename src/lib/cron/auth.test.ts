import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { authorizeCronRequest } from './auth'

const ORIGINAL = {
  CRON_SECRET: process.env.CRON_SECRET,
  AUTOMATION_CRON_SECRET: process.env.AUTOMATION_CRON_SECRET,
}

function req(headers: Record<string, string>): Request {
  return new Request('https://crm.example.com/api/automations/cron', { headers })
}

beforeEach(() => {
  delete process.env.CRON_SECRET
  delete process.env.AUTOMATION_CRON_SECRET
})

afterEach(() => {
  for (const [k, v] of Object.entries(ORIGINAL)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('authorizeCronRequest', () => {
  it('503s when neither secret is configured', () => {
    expect(authorizeCronRequest(req({}))).toEqual({
      ok: false,
      status: 503,
      error: 'cron not configured',
    })
  })

  it('accepts Vercel Cron Bearer token matching CRON_SECRET', () => {
    process.env.CRON_SECRET = 'vercel-secret'
    expect(
      authorizeCronRequest(req({ authorization: 'Bearer vercel-secret' })),
    ).toEqual({ ok: true })
  })

  it('rejects a wrong Bearer token', () => {
    process.env.CRON_SECRET = 'vercel-secret'
    expect(
      authorizeCronRequest(req({ authorization: 'Bearer nope' })),
    ).toEqual({ ok: false, status: 401, error: 'Unauthorized' })
  })

  it('accepts x-cron-secret matching AUTOMATION_CRON_SECRET', () => {
    process.env.AUTOMATION_CRON_SECRET = 'shared-secret'
    expect(
      authorizeCronRequest(req({ 'x-cron-secret': 'shared-secret' })),
    ).toEqual({ ok: true })
  })

  it('rejects a wrong x-cron-secret', () => {
    process.env.AUTOMATION_CRON_SECRET = 'shared-secret'
    expect(authorizeCronRequest(req({ 'x-cron-secret': 'nope' }))).toEqual({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    })
  })

  it('accepts either header when both secrets are set', () => {
    process.env.CRON_SECRET = 'vercel-secret'
    process.env.AUTOMATION_CRON_SECRET = 'shared-secret'
    expect(
      authorizeCronRequest(req({ authorization: 'Bearer vercel-secret' })),
    ).toEqual({ ok: true })
    expect(
      authorizeCronRequest(req({ 'x-cron-secret': 'shared-secret' })),
    ).toEqual({ ok: true })
  })

  it('does not accept the Vercel token in the x-cron-secret header', () => {
    process.env.CRON_SECRET = 'vercel-secret'
    expect(
      authorizeCronRequest(req({ 'x-cron-secret': 'vercel-secret' })),
    ).toEqual({ ok: false, status: 401, error: 'Unauthorized' })
  })
})
