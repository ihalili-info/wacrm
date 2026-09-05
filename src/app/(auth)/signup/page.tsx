import { redirect } from "next/navigation";

/**
 * Self-service signup is disabled for this deployment — accounts are
 * provisioned by an admin in Supabase Auth, then granted a role via an
 * invite link (Settings → Members).
 *
 * `middleware.ts` already intercepts every `/signup` request and
 * redirects to `/login`, carrying any `?invite` token so an invited
 * user still reaches the accept flow after signing in. This page is
 * the belt-and-braces fallback for the case the middleware matcher
 * ever misses.
 */
export default function SignupPage() {
  redirect("/login");
}
