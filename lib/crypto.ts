/**
 * AES-256-GCM helper for at-rest encryption of OAuth tokens (Google
 * Calendar refresh/access tokens, future Meta tokens, etc).
 *
 * Format of stored ciphertext (base64):
 *   [12 bytes IV][16 bytes auth tag][ciphertext]
 *
 * Key source: ENCRYPTION_KEY env var (32 bytes hex). Generate with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Versioning: prefix every output with "v1:" so we can rotate algorithms
 * later without losing access to old ciphertexts. encrypt/decrypt round-
 * trip is the contract; callers shouldn't peek at the format.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // recommended for GCM
const TAG_BYTES = 16;
const VERSION_PREFIX = "v1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY env var missing. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (hex.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${hex.length}`);
  }
  cachedKey = Buffer.from(hex, "hex");
  return cachedKey;
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded blob with version
 * prefix. Safe to store in a Postgres String column.
 */
export function encrypt(plaintext: string): string {
  if (plaintext == null) throw new Error("encrypt: plaintext is null/undefined");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return VERSION_PREFIX + combined.toString("base64");
}

/**
 * Decrypt a string produced by `encrypt`. Throws on tampered ciphertext
 * (GCM auth tag mismatch). Returns the original plaintext.
 *
 * For backwards compat during rollout: if the input doesn't start with the
 * version prefix, treat it as plaintext (legacy unencrypted token). Once
 * the migration script has run on all rows, callers can stop relying on
 * this fallback.
 */
export function decrypt(stored: string): string {
  if (stored == null) throw new Error("decrypt: stored is null/undefined");
  if (!stored.startsWith(VERSION_PREFIX)) {
    // Legacy plaintext token — return as-is. Migration script should
    // re-encrypt all rows so this branch becomes dead code.
    return stored;
  }
  const combined = Buffer.from(stored.slice(VERSION_PREFIX.length), "base64");
  const iv = combined.subarray(0, IV_BYTES);
  const tag = combined.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = combined.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Convenience: returns true if `stored` is in encrypted v1 format. Useful
 * for migration scripts that need to skip already-encrypted rows.
 */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(VERSION_PREFIX);
}
