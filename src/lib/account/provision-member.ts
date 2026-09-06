import { randomBytes } from "node:crypto";

// ============================================================
// Direct member provisioning (no email, no self-service signup).
//
// This deployment runs with Supabase Auth's "allow new users to
// sign up" turned OFF, so an invite link alone can never work for
// someone who has no login yet — /join/<token> can only attach a
// role to an account that already exists. And with no custom SMTP
// configured (Supabase's built-in sender is capped at a couple of
// mails an hour and is meant for testing), `inviteUserByEmail` is
// not a dependable path either.
//
// So an admin creates the login here, server-side, with the
// service-role key, and hands the credentials over out-of-band.
// ============================================================

/** Unambiguous alphabet — no O/0, I/l/1, so a spoken or typed
 *  hand-off doesn't get transcribed wrong. */
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Generate a temporary password for a newly provisioned member.
 *
 * `randomBytes` + rejection-free modulo over a 55-char alphabet:
 * 55 does not divide 256 evenly, so a plain `% 55` would bias the
 * first 36 symbols slightly. At 16 characters the bias is
 * irrelevant to guessability (~91 bits), but we mask to a power of
 * two and resample instead — it costs nothing and keeps the
 * distribution honest.
 */
export function generateTempPassword(length = 16): string {
  const out: string[] = [];
  // 55 symbols → 6 bits covers 0..63; resample anything ≥ 55.
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      const idx = byte & 0b0011_1111;
      if (idx >= PASSWORD_ALPHABET.length) continue;
      out.push(PASSWORD_ALPHABET[idx]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

/** Minimum we accept for an admin-supplied password. Supabase's own
 *  floor is 6; we ask for a bit more since this is handed over. */
export const MIN_MEMBER_PASSWORD = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

export const MAX_FULL_NAME_LEN = 120;
