import crypto from 'crypto'

/**
 * WhatsApp token encryption.
 *
 * Format — GCM (current):
 *   `<iv-hex>:<ciphertext-hex>:<authTag-hex>`      (three colons)
 *
 * Format — CBC (legacy, decrypt-only):
 *   `<iv-hex>:<ciphertext-hex>`                    (one colon)
 *
 * Why GCM instead of CBC:
 *   CBC without a MAC is unauthenticated — an attacker who can write
 *   rows to `whatsapp_config` (directly, through a future RLS bug, or
 *   via a DB backup being modified) can flip bits in the ciphertext
 *   without the decrypt throwing. You'd silently get garbled tokens;
 *   worst case, if the mutated bytes happen to form a valid access
 *   token, messages go out under a spoofed account. GCM appends a
 *   16-byte authentication tag; any tampering fails the decrypt hard.
 *
 * Backward compatibility:
 *   `decrypt()` auto-detects the format by counting parts, so legacy
 *   rows keep working. New `encrypt()` output is always GCM.
 *   Existing rows can be upgraded in place by call sites that hold a
 *   Supabase client — see the `isLegacyFormat` / `encrypt` pattern in
 *   `src/app/api/whatsapp/send/route.ts`.
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!
// 12 bytes is the NIST-recommended IV length for GCM — keeps the
// counter block well below 2^32 and matches the default web-crypto
// behaviour, so any future port is straightforward.
const GCM_IV_LENGTH = 12
const CBC_IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/** AES-256 needs a 32-byte key, i.e. exactly 64 hex characters. */
const REQUIRED_KEY_BYTES = 32
const REQUIRED_KEY_CHARS = REQUIRED_KEY_BYTES * 2

/**
 * Explain what is wrong with `ENCRYPTION_KEY`, without ever revealing
 * it.
 *
 * Why this exists: `Buffer.from(value, 'hex')` does not throw on bad
 * input — it stops at the first character that isn't a hex digit and
 * silently returns a short buffer. `createCipheriv` then fails with a
 * bare "Invalid key length", which tells an operator nothing about
 * *why*: a trailing newline from a copy-paste, a `0x` prefix, a
 * base64 value, or simply a 32-character key all produce the exact
 * same message. Diagnosing it meant guessing.
 *
 * Returns `null` when the key is usable. Otherwise a message naming
 * the observed character count and decoded byte count — enough to
 * identify the mistake, never enough to reconstruct the key.
 */
export function describeEncryptionKeyProblem(
  value: string | undefined = process.env.ENCRYPTION_KEY,
): string | null {
  if (value === undefined || value === '') {
    return 'ENCRYPTION_KEY is not set in this environment.'
  }

  // Compare against the raw value so whitespace is reported, not
  // quietly tolerated — a trailing newline is the single most common
  // cause and the operator needs to be told it is there.
  const trimmed = value.trim()
  if (trimmed !== value) {
    return `ENCRYPTION_KEY has leading or trailing whitespace (${value.length} characters, ${trimmed.length} after trimming). Re-paste it without the stray space or newline.`
  }

  if (/^0x/i.test(value)) {
    return 'ENCRYPTION_KEY starts with "0x". Paste the bare hex digits, with no prefix.';
  }

  if (!/^[0-9a-fA-F]*$/.test(value)) {
    const firstBad = value.split('').findIndex((c) => !/[0-9a-fA-F]/.test(c))
    return `ENCRYPTION_KEY contains a non-hex character at position ${firstBad + 1} (expected only 0-9 and a-f). A base64 or passphrase value will not work — generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  }

  if (value.length !== REQUIRED_KEY_CHARS) {
    return `ENCRYPTION_KEY is ${value.length} hex characters (${Math.floor(value.length / 2)} bytes); AES-256 needs exactly ${REQUIRED_KEY_CHARS} characters (${REQUIRED_KEY_BYTES} bytes).`
  }

  const decoded = Buffer.from(value, 'hex')
  if (decoded.length !== REQUIRED_KEY_BYTES) {
    return `ENCRYPTION_KEY is ${value.length} characters but decodes to only ${decoded.length} bytes; AES-256 needs ${REQUIRED_KEY_BYTES}.`
  }

  return null
}

export function encrypt(text: string): string {
  // Validate the exact value this function is about to use (the
  // module-level capture), so the diagnosis can never describe a
  // different value than the one that fails. Fails with the precise
  // reason rather than crypto's opaque "Invalid key length".
  const problem = describeEncryptionKeyProblem(ENCRYPTION_KEY)
  if (problem) throw new Error(problem)

  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv,
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')

  if (parts.length === 3) {
    // GCM — current format.
    const [ivHex, ctHex, tagHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM IV length ${iv.length}`,
      )
    }
    const authTag = Buffer.from(tagHex, 'hex')
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM auth-tag length ${authTag.length}`,
      )
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv,
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  if (parts.length === 2) {
    // CBC — legacy. Read-only; `encrypt()` never produces this shape.
    const [ivHex, ctHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== CBC_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected CBC IV length ${iv.length}`,
      )
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv,
    )
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  throw new Error(
    `Encrypted token has unrecognised format (expected 1 or 2 colons, got ${
      parts.length - 1
    })`,
  )
}

/**
 * Cheap format detector — call sites use this to decide whether to
 * write a refreshed GCM ciphertext back to the database after a
 * successful legacy decrypt. Does not attempt decryption; purely a
 * structural check.
 */
export function isLegacyFormat(encryptedText: string): boolean {
  return encryptedText.split(':').length === 2
}
