import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Several `"use client"` pages call this at render, and Next statically
  // prerenders those at build time. If the public env vars aren't present
  // for that build (a preview deploy, or a build that races the Supabase
  // integration's env sync), `createBrowserClient` throws and the whole
  // build fails on one page. The client is only ever *used* from event
  // handlers / effects that run in the browser, where the inlined values
  // are present — so during prerender without env, hand back a throwaway
  // placeholder (never cached) instead of exploding.
  if (!url || !anonKey) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    )
  }

  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
